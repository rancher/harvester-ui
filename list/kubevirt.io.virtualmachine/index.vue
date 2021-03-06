<script>
import ResourceTable from '@/components/ResourceTable';
import VmState from '@/components/formatter/vmState';

import { STATE, AGE, NAME, NAMESPACE } from '@/config/table-headers';
import { HCI } from '@/config/types';

import { allSettled } from '@/utils/promise';
import Loading from '@/components/Loading';
import BackupModal from './backupModal';
import RestoreModal from './restoreModal';
import MigrationModal from './MigrationModal';
import CloneTemplate from './cloneTemplate';

export default {
  name:       'ListVM',
  components: {
    Loading,
    ResourceTable,
    VmState,
    BackupModal,
    RestoreModal,
    MigrationModal,
    CloneTemplate
  },

  props: {
    schema: {
      type:     Object,
      required: true,
    },
  },

  async fetch() {
    const hash = await allSettled({
      vm:                  this.$store.dispatch('cluster/findAll', { type: HCI.VM }),
      vmi:                  this.$store.dispatch('cluster/findAll', { type: HCI.VMI }),
      allNodeNetwork:      this.$store.dispatch('cluster/findAll', { type: HCI.NODE_NETWORK }),
      allClusterNetwork:   this.$store.dispatch('cluster/findAll', { type: HCI.CLUSTER_NETWORK }),
    });

    this.vmiList = hash.vmi;
    this.vmList = hash.vm;
    this.allNodeNetwork = hash.allNodeNetwork;
    this.allClusterNetwork = hash.allClusterNetwork;
  },

  data() {
    return {
      vmList:            [],
      vmiList:           [],
      allNodeNetwork:    [],
      allClusterNetwork: []
    };
  },

  computed: {
    headers() {
      return [
        STATE,
        {
          ...NAME,
          width:         300,
          formatter:     'vmName',
        },
        NAMESPACE,
        {
          name:      'CPU',
          label:     'CPU',
          sort:      ['spec.template.spec.domain.cpu.cores'],
          value:     'spec.template.spec.domain.cpu.cores',
          align:     'center'
        },
        {
          name:      'Memory',
          label:     'Memory',
          value:     'spec.template.spec.domain.resources.requests.memory',
          sort:      ['memorySort'],
          align:     'center',
          labelKey:  'harvester.fields.memory'
        },
        {
          name:      'ip',
          label:     'IP Address',
          formatter: 'ipAddress',
          labelKey:  'harvester.tableHeaders.vm.ipAddress'
        },
        {
          name:      'node',
          label:     'Node',
          sort:      ['nameSort'],
          formatter: 'nodeName',
          labelKey:  'harvester.tableHeaders.vm.node'
        },
        {
          ...AGE,
          sort: 'metadata.creationTimestamp:desc',
        }
      ];
    },

    rows() {
      const matchVMI = this.vmiList.filter((VMI) => {
        const matchVM = this.vmList.find(VM => VM.id === VMI.id);

        return !matchVM;
      });

      return [...this.vmList, ...matchVMI];
    }
  },
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else>
    <ResourceTable
      v-bind="$attrs"
      :headers="headers"
      default-sort-by="age"
      :rows="rows"
      :schema="schema"
      :groupable="true"
      key-field="_key"
      v-on="$listeners"
    >
      <template slot="cell:state" slot-scope="scope" class="state-col">
        <div class="state">
          <VmState class="vmstate" :row="scope.row" :all-node-network="allNodeNetwork" :all-cluster-network="allClusterNetwork" />
        </div>
      </template>
    </ResourceTable>

    <BackupModal />
    <RestoreModal />
    <MigrationModal />
    <CloneTemplate />
  </div>
</template>

<style lang="scss" scoped>
.state {
  display: flex;

  .vmstate {
    margin-right: 6px;
  }
}
</style>
