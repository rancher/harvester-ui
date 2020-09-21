<script>
import { IMAGE } from '@/config/types';
const TIP = 'An external URL to the .iso, .img, .qcow2 or .raw that the virtual machine should be created from.';

export default {
  props: {
    value: {
      type:    String,
      default: ''
    }
  },

  data() {
    const images = this.$store.getters['cluster/all'](IMAGE) || [];

    return {
      images,
      tip:        TIP,
      searchKey:  '',
      activeName: this.value,

      pageSize:      12,
      currentPage:   1,
    };
  },

  computed: {
    readiedImages() {
      return this.images.filter( (I) => {
        return (I.spec.displayName.toLowerCase()).includes(this.searchKey.toLowerCase()) && I.isReady;
      });
    },
    displayImages() {
      const start = (this.currentPage - 1) * this.pageSize;
      let end = this.currentPage * this.pageSize;

      if (end > this.readiedImages.length) {
        end = this.readiedImages.length;
      }

      return this.readiedImages.slice(start, end);
    }
  },

  watch: {
    activeName: {
      handler(neu) {
        this.$emit('input', neu);
      },
      immediate: true
    },
    value(neu) {
      this.activeName = neu;
    },
    readiedImages() {
      this.currentPage = 1;
    },
  },

  methods: {
    selected(neu) {
      this.activeName = neu;
    }
  }
};
</script>

<template>
  <div class="vm-choose-image">
    <h2>
      Choose an Image:
    </h2>

    <div class="box">
      <div class="row mb-20">
        <div class="col span-6">
          <input v-model="searchKey" placeholder="Search" />
        </div>
      </div>
      <div>
        <div class="list">
          <div
            v-for="item in displayImages"
            :key="item.id"
            class="image mb-10"
            :class="{active: activeName == item.spec.displayName}"
            @click="selected(item.spec.displayName)"
          >
            <div class="pic">
              <span>
                {{ item.spec.displayName.split('')[0] }}
              </span>
            </div>
            <div class="info">
              <span>{{ item.spec.displayName }}</span>
              <span>{{ item.spec.description }}</span>
            </div>

            <i v-if="activeName == item.spec.displayName" class="icon icon-checkmark checkmark" />
          </div>
        </div>

        <div class="mt-20">
          <el-pagination
            background
            layout="prev, pager, next"
            :page-size="pageSize"
            :current-page.sync="currentPage"
            :total="readiedImages.length"
            class="text-center"
          >
          </el-pagination>
        </div>

        <div class="mt-20">
          <nuxt-link to="/c/local/virtual/harvester.cattle.io.virtualmachineimage">
            <el-button>
              Add Image
            </el-button>
          </nuxt-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.vm-choose-image {
  .list {
    display: grid;
    grid-template-columns: 22% 22% 22% 22%;
    grid-column-gap: 3%;
    max-height: 300px;
    overflow-y: auto;

    .active {
      background-color: #fdf6ec;

      .info span {
        color: var(--input-text) !important;
      }
    }

    .checkmark {
      position: absolute;
      position: absolute;
      bottom: 0;
      right: 7px;
      font-size: 22px;
    }

    .image {
      position: relative;
      cursor: pointer;
      height: 90px;
      border: 1px solid var(--input-border);
      border-radius: calc(3 * var(--border-radius));
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: row;

      .pic {
        width: 50px;
        height: 50px;
        border-radius: 50px;
        background-color: var(--input-border);
        color: #fff;
        margin:0 15px;
        text-transform: uppercase;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      }

      .info {
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        flex: 1;
        padding-right: 15px;

        span:first-child {
          margin-bottom: 10px;
        }
        span {
          font-size: 12px;
          color: var(--help-text);
          word-break: break-all;
        }
      }
    }
  }

  .box {
    border-radius: calc(3 * var(--border-radius));
  }

  .sub-title {
    font-size: 14px;
    color: var(--help-text);
  }

  .el-pagination.is-background .el-pager li:not(.disabled).active {
    background: var(--primary);
  }
}
</style>