<script setup lang="ts">
import { computed } from 'vue'
import StatusIndicator from '@/components/ui/StatusIndicator.vue'
import { useCampaignService } from '@/services/campaign.service'

const { state } = useCampaignService()

const activeTemplates = computed(() =>
  state.templates.filter((template) => template.status === 'ACTIVE').length,
)

function campaignName(campaignId: string) {
  return state.campaigns.find((campaign) => campaign.id === campaignId)?.name ?? 'Campanha removida'
}
</script>

<template>
  <section class="resource-page">
    <article class="panel resource-hero">
      <div>
        <span class="eyebrow">Templates</span>
        <h2>Conteudo aprovado por campanha</h2>
      </div>
      <span class="badge good">{{ activeTemplates }} ativos</span>
    </article>

    <article class="panel">
      <div class="panel-heading">
        <h2>Templates cadastrados</h2>
        <span class="badge muted">arquivados nao contam para ativacao</span>
      </div>
      <div class="management-table">
        <div class="management-row table-head three-col">
          <span>Nome</span>
          <span>Campanha</span>
          <span>Status</span>
        </div>
        <div v-for="template in state.templates" :key="template.id" class="management-row three-col">
          <strong>{{ template.name }}</strong>
          <span>{{ campaignName(template.campaignId) }}</span>
          <StatusIndicator :status="template.status" />
        </div>
      </div>
    </article>
  </section>
</template>
