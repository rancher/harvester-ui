<script>
import cloneDeep from 'lodash/cloneDeep';
import ProgressBarMulti from '@/components/ProgressBarMulti';

export default {
  components: { ProgressBarMulti },
  props:      {
    value: {
      type:     [String, Number],
      default: 0
    },
    row: {
      type:     Object,
      default: () => {}
    },
    col: {
      type:     Object,
      default: () => {}
    },
  },
  computed: {
    percentage() {
      const value = Number.parseFloat(this.value);
      let color = 'bg-success';

      if (value < 30) {
        color = 'bg-secondary';
      } else if (value < 70) {
        color = 'bg-warning';
      }

      return [{
        value,
        color
      }];
    },
    state() {
      cloneDeep(this.row);

      return this.row.stateDisplay;
    },
    completed() {
      return Number.parseFloat(this.value) === 100 && !this.failed;
    },
    failed() {
      return this.state === 'Failed';
    },
    errorMessage() {
      return this.row.getStatusConditionOfType('imported')?.message;
    }
  },
};
</script>

<template>
  <div v-if="!completed" class="parent">
    <div v-if="!failed" class="progress-box">
      <ProgressBarMulti :values="percentage" :min="0" :max="100" />
    </div>
    <div v-if="!failed" class="text">
      {{ value || 0 }}%
    </div>
    <span v-if="failed" class="error">{{ errorMessage }}</span>
  </div>
  <div v-else>
    Completed
  </div>
</template>

<style lang="scss">
.parent {
  display: grid;
  grid-template-areas: "progress text";
  grid-template-columns: auto 80px;
  align-items: center;

  .progress {
    background-color: darken(#EBEEF5, 15%);
    width: 100%;
  }

  .progress-box {
    grid-area: progress;
  }

  .text {
    grid-area: text;
    text-align: center;
  }

}

.error {
  color: var(--error);
}
</style>
