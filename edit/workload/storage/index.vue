<script>
import { PVC } from '@/config/types';
import { removeObject, removeObjects, addObjects } from '@/utils/array.js';
import ButtonDropdown from '@/components/ButtonDropdown';
import Mount from '@/edit/workload/storage/Mount';
import { _VIEW } from '@/config/query-params';
import CodeMirror from '@/components/CodeMirror';
import jsyaml from 'js-yaml';
import ArrayListGrouped from '@/components/form/ArrayListGrouped';

export default {
  components: {
    ArrayListGrouped, ButtonDropdown, Mount, CodeMirror
  },

  props: {
    mode: {
      type:    String,
      default: 'create',
    },

    // pod spec
    value: {
      type:    Object,
      default: () => {
        return {};
      },
    },

    namespace: {
      type:    String,
      default: null,
    },

    container: {
      type:     Object,
      default: () => {
        return {};
      },
    },

    // namespaced configmaps and secrets
    configMaps: {
      type:    Array,
      default: () => [],
    },

    secrets: {
      type:    Array,
      default: () => [],
    },

    registerBeforeHook: {
      type:    Function,
      default: null,
    },
  },

  async fetch() {
    this.pvcs = await this.$store.dispatch('cluster/findAll', { type: PVC });
  },

  data() {
    return { pvcs: [] };
  },

  computed: {
    isView() {
      return this.mode === _VIEW;
    },

    namespacedPVCs() {
      const namespace = this.namespace || this.$store.getters['defaultNamespace'];

      return this.pvcs.filter(pvc => pvc.metadata.namespace === namespace);
    },

    volumeTypeOpts() {
      const hasComponent = require
        .context('@/edit/workload/storage', false, /^.*\.vue$/)
        .keys()
        .map(path => path.replace(/(\.\/)|(.vue)/g, ''))
        .filter(
          file => file !== 'index' && file !== 'Mount' && file !== 'PVC'
        );

      const out = [
        ...hasComponent,
        'csi',
        'configMap',
        'createPVC',
        'persistentVolumeClaim',
      ];

      out.sort();

      return out.map(opt => ({
        label:  this.t(`workload.storage.subtypes.${ opt }`),
        action: this.addVolume,
        value:  opt,
      }));
    },

    pvcNames() {
      return this.namespacedPVCs.map(pvc => pvc.metadata.name);
    },
    // only show volumes mounted in current container
    containerVolumes: {
      get() {
        const { volumeMounts = [] } = this.container;
        const names = volumeMounts.reduce((total, each) => {
          total.push(each.name);

          return total;
        }, []);

        return this.value.volumes.filter((volume) => {
          return names.includes(volume.name);
        });
      },
      set(neu, old = []) {
        removeObjects(this.value.volumes, old);
        addObjects(this.value.volumes, neu);
      }
    }
  },

  created() {
    if (!this.container.volumeMounts) {
      this.$set(this.container, 'volumeMounts', []);
    }
    if (!this.value.volumes) {
      this.$set(this.value, 'volumes', []);
    }
  },

  methods: {
    addVolume(type) {
      const name = `vol${ this.value.volumes.length }`;

      if (type === 'createPVC') {
        this.value.volumes.push({
          _type:                 'createPVC',
          persistentVolumeClaim: {},
          name,
        });
      } else if (type === 'csi') {
        this.value.volumes.push({
          _type: type,
          csi:   { volumeAttributes: {} },
          name,
        });
      } else {
        this.value.volumes.push({
          _type:  type,
          [type]: {},
          name,
        });
      }
      if (!this.container.volumeMounts) {
        this.$set(this.container, 'volumeMounts', []);
      }
      this.container.volumeMounts.push({ name });
    },

    removeVolume(vol) {
      removeObject(this.value.volumes, vol);
    },

    volumeType(vol) {
      const type = Object.keys(vol).filter(
        key => typeof vol[key] === 'object'
      )[0];

      return type;
    },

    // import component for volume type
    componentFor(type) {
      switch (type) {
      case 'configMap':
        return require(`@/edit/workload/storage/secret.vue`).default;
      case 'createPVC':
      case 'persistentVolumeClaim':
        return require(`@/edit/workload/storage/persistentVolumeClaim/index.vue`)
          .default;
      case 'csi':
        return require(`@/edit/workload/storage/csi/index.vue`).default;
      default: {
        let component;

        try {
          component = require(`@/edit/workload/storage/${ type }.vue`).default;
        } catch {}

        return component;
      }
      }
    },

    headerFor(type) {
      if (
        this.$store.getters['i18n/exists'](`workload.storage.subtypes.${ type }`)
      ) {
        return this.t(`workload.storage.subtypes.${ type }`);
      } else {
        return type;
      }
    },

    yamlDisplay(volume) {
      try {
        return jsyaml.safeDump(volume);
      } catch {
        return volume;
      }
    },

    openPopover() {
      const button = this.$refs.buttonDropdown;

      try {
        button.togglePopover();
      } catch (e) {}
    },

    // codemirror needs to refresh if it is in a tab that wasn't visible on page load
    refresh() {
      if (this.$refs.cm) {
        this.$refs.cm.forEach(component => component.refresh());
      }
    },
  },
};
</script>

<template>
  <div>
    <ArrayListGrouped v-model="containerVolumes">
      <template #default="props">
        <h3>{{ headerFor(volumeType(props.row.value)) }}</h3>
        <div class="bordered-section">
          <component
            :is="componentFor(volumeType(props.row.value))"
            v-if="componentFor(volumeType(props.row.value))"
            :value="props.row.value"
            :pod-spec="value"
            :mode="mode"
            :namespace="namespace"
            :secrets="secrets"
            :config-maps="configMaps"
            :pvcs="pvcNames"
            :register-before-hook="registerBeforeHook"
          />
          <div v-else-if="isView">
            <CodeMirror
              ref="cm"
              :value="yamlDisplay(props.row.value)"
              :options="{ readOnly: true, cursorBlinkRate: -1 }"
            />
          </div>
        </div>
        <Mount :container="container" :pod-spec="value" :name="props.row.value.name" :mode="mode" />
      </template>
      <template #add>
        <ButtonDropdown
          v-if="!isView"
          :button-label="t('workload.storage.addVolume')"
          :dropdown-options="volumeTypeOpts"
          size="sm"
          @click-action="e=>addVolume(e.value)"
        />
      </template>
    </ArrayListGrouped>
  </div>
</template>

<style lang='scss' scoped>
.volume-source {
  padding: 20px;
  margin: 20px 0px 20px 0px;
  position: relative;

  ::v-deep .code-mirror {
    .CodeMirror {
      background-color: var(--yaml-editor-bg);
      & .CodeMirror-gutters {
        background-color: var(--yaml-editor-bg);
      }
    }
  }
}

.remove-vol {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 0px;
}

.add-vol:focus {
  outline: none;
  box-shadow: none;
}
</style>
