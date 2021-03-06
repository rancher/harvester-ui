<script>
import { randomStr } from '@/utils/string';
import LabeledInput from '@/components/form/LabeledInput';
import CopyToClipboard from '@/components/CopyToClipboard';
import AsyncButton from '@/components/AsyncButton';
import { SETUP } from '@/config/query-params';
import { NORMAN, MANAGEMENT } from '@/config/types';
import { findBy } from '@/utils/array';
import Checkbox from '@/components/form/Checkbox';
import { getVendor, getProduct } from '@/config/private-label';
import RadioGroup from '@/components/form/RadioGroup';
import { setSetting, SETTING } from '@/config/settings';
import { _ALL_IF_AUTHED } from '@/plugins/steve/actions';
import { isDevBuild } from '@/utils/version';

export default {
  layout: 'unauthenticated',

  async middleware({ store, redirect } ) {
    try {
      await store.dispatch('management/findAll', {
        type: MANAGEMENT.SETTING, load: _ALL_IF_AUTHED, opt: { url: `/v1/${ MANAGEMENT.SETTING }`, redirectUnauthorized: false }
      });
    } catch (e) {
    }

    const firstLoginSetting = store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.FIRST_LOGIN);

    if (firstLoginSetting?.value !== 'true') {
      return redirect('/');
    }
  },

  components: {
    AsyncButton, LabeledInput, CopyToClipboard, Checkbox, RadioGroup
  },

  async asyncData({ route, req, store }) {
    const telemetrySetting = store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.TELEMETRY);
    const serverUrlSetting = store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.SERVER_URL);
    const rancherVersionSetting = store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.VERSION_RANCHER);
    let telemetry = true;

    if (telemetrySetting?.value && telemetrySetting.value !== 'prompt') {
      telemetry = telemetrySetting.value !== 'out';
    } else if (!rancherVersionSetting?.value || isDevBuild(rancherVersionSetting?.value)) {
      telemetry = false;
    }

    const principals = await store.dispatch('rancher/findAll', { type: NORMAN.PRINCIPAL, opt: { url: '/v3/principals' } });

    const current = route.query[SETUP] || 'admin';

    let serverUrl;

    if (serverUrlSetting?.value) {
      serverUrl = serverUrlSetting.value;
    } else if ( process.server ) {
      serverUrl = req.headers.host;
    } else {
      serverUrl = window.location.origin;
    }

    return {
      vendor:            getVendor(),
      product:           getProduct(),
      step:              parseInt(route.query.step, 10) || 1,

      useRandom:   false,
      haveCurrent: !!current,
      username:    'admin',
      current,
      password:    '',
      confirm:     '',

      serverUrl,

      telemetry,

      eula: false,
      principals,

      errors: []
    };
  },

  computed: {
    passwordSubmitDisabled() {
      if (!this.eula) {
        return true;
      }

      if ( this.useRandom ) {
        return false;
      }

      if ( !this.password || this.password !== this.confirm ) {
        return true;
      }

      if ( !this.current ) {
        return true;
      }

      return false;
    },

    me() {
      const out = findBy(this.principals, 'me', true);

      return out;
    },

  },

  watch: {
    useRandom(neu) {
      if (neu) {
        this.password = randomStr();
      } else {
        this.password = '';
        this.$nextTick(() => {
          this.$refs.password.focus();
          this.$refs.password.select();
        });
      }
    }
  },

  mounted() {
    this.$refs.password.focus();
    this.$refs.password.select();
  },

  methods: {
    async finishPassword(buttonCb) {
      try {
        await this.$store.dispatch('loadManagement');

        await Promise.all([
          setSetting(this.$store, SETTING.EULA_AGREED, (new Date()).toISOString() ),
          setSetting(this.$store, SETTING.TELEMETRY, this.telemetry ? 'in' : 'out'),
          setSetting(this.$store, SETTING.FIRST_LOGIN, 'false'),
        ]);

        await this.$store.dispatch('rancher/request', {
          url:           '/v3/users?action=changepassword',
          method:        'post',
          data:          {
            currentPassword: this.current,
            newPassword:     this.password
          },
        });
        this.step = 2;
        buttonCb(true);
      } catch (err) {
        buttonCb(false);
      }
    },

    async setServerUrl(buttonCb) {
      try {
        await setSetting(this.$store, SETTING.SERVER_URL, this.serverUrl);
        buttonCb(true);
        this.done();
      } catch {
        buttonCb(false);
      }
    },

    done() {
      this.$router.replace('/');
    },
  },
};
</script>
<template>
  <div class="setup">
    <div class="row">
      <div class="col span-6">
        <h1 class="text-center">
          {{ t('setup.welcome', {product}) }}
        </h1>

        <template v-if="step===1">
          <p class="text-center mb-40 mt-20 setup-title">
            <t k="setup.setPassword" :raw="true" />
          </p>

          <!-- For password managers... -->
          <input type="hidden" name="username" autocomplete="username" :value="username" />
          <div class="mb-20">
            <RadioGroup v-model="useRandom" name="password-mode" :options="[{label: t('setup.useRandom'), value: true}, {label: t('setup.useManual'), value: false}]" />
          </div>
          <div class="mb-20">
            <LabeledInput
              ref="password"
              v-model.trim="password"
              :type="useRandom ? 'text' : 'password'"
              :disabled="useRandom"
              label-key="setup.newPassword"
            >
              <template v-if="useRandom" #suffix>
                <div class="addon" style="padding: 0 0 0 12px;">
                  <CopyToClipboard :text="password" class="btn-sm" />
                </div>
              </template>
            </LabeledInput>
          </div>
          <LabeledInput
            v-show="!useRandom"
            v-model.trim="confirm"
            autocomplete="new-password"
            type="password"
            label-key="setup.confirmPassword"
          />

          <hr class="mt-40 mb-40 " />

          <div class="checkbox">
            <Checkbox v-model="telemetry" :label="t('setup.telemetry.label')" type="checkbox" />
            <i v-tooltip="{content:t('setup.telemetry.tip', {}, true), delay: {hide:500}, autoHide: false}" class="icon icon-info" />
          </div>
          <div class="checkbox pt-10 eula">
            <Checkbox v-model="eula" type="checkbox" />
            <span v-html="t('setup.eula', {}, true)"></span>
          </div>

          <div class="text-center mt-20">
            <AsyncButton key="passwordSubmit" type="submit" mode="continue" :disabled="passwordSubmitDisabled" @click="finishPassword" />
          </div>
        </template>

        <template v-else>
          <p>
            <t k="setup.serverUrl.tip" :raw="true" />
          </p>
          <div class="mt-20">
            <LabeledInput v-model="serverUrl" :label="t('setup.serverUrl.label')" />
          </div>
          <div class="text-center mt-20">
            <button type="button" class="btn role-link" @click="done">
              {{ t('setup.serverUrl.skip') }}
            </button>
            <AsyncButton type="submit" mode="continue" @click="setServerUrl" />
          </div>
        </template>
      </div>

      <div class="col span-6 landscape" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
  .principal {
    display: block;
    background: var(--box-bg);
    border: 1px solid var(--border);
    border-radius: 3px;
    margin: 10px 0;
    padding: 10px;
    line-height: 40px;

    img {
      vertical-align: middle;
      margin: 0 10px;
    }
  }

  .setup {
    overflow: hidden;

    .row {
      align-items: center;
      & .checkbox {
        margin: auto
      }

      .span-6 {
        padding: 0 60px;
      }
    }

    .setup-title {
      ::v-deep code {
        font-size: 12px;
      }
    }

    p {
      line-height: 20px;
    }

    .eula {
      align-items: center;
      display: flex;

      span {
        margin-left: 5px;
      }
    }
  }

  .landscape {
    background-image: url('~assets/images/pl/login-landscape.svg');
    background-repeat: no-repeat;
    background-size: cover;
    background-position: center center;
    height: 100vh;
  }
</style>
