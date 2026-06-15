<script setup lang="ts">
import type { CampaignWorkspaceTab } from '@/dtos/campaignTabs.dto'

defineProps<{
  activeTab: CampaignWorkspaceTab
}>()

defineEmits<{
  change: [tab: CampaignWorkspaceTab]
}>()

const tabs: Array<{ label: string; value: CampaignWorkspaceTab }> = [
  { label: 'Configuracao', value: 'configuration' },
  { label: 'Regras', value: 'rules' },
  { label: 'Audiencias', value: 'audiences' },
  { label: 'Templates', value: 'templates' },
  { label: 'Grupos de envio', value: 'dispatch-targets' },
  { label: 'Execucoes', value: 'executions' },
]
</script>

<template>
  <nav class="workspace-tabs" aria-label="Secoes da campanha">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      :class="['workspace-tab', { active: tab.value === activeTab }]"
      @click="$emit('change', tab.value)"
    >
      {{ tab.label }}
    </button>
  </nav>
</template>
