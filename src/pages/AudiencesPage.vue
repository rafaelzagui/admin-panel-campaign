<script setup lang="ts">
import { computed } from 'vue'
import StatusIndicator from '@/components/ui/StatusIndicator.vue'
import { useCampaignService } from '@/services/campaign.service'

const { state } = useCampaignService()

const activeAudiences = computed(() =>
  state.audiences.filter((audience) => audience.status === 'ACTIVE').length,
)

function campaignName(campaignId: string) {
  return state.campaigns.find((campaign) => campaign.id === campaignId)?.name ?? 'Campanha removida'
}
</script>

<template>
  <section class="resource-page">
    <article class="panel resource-hero">
      <div>
        <span class="eyebrow">Audiencias</span>
        <h2>Segmentos vinculados a campanhas</h2>
      </div>
      <span class="badge good">{{ activeAudiences }} ativas</span>
    </article>

    <article class="panel">
      <div class="panel-heading">
        <h2>Audiencias cadastradas</h2>
        <span class="badge muted">sempre associadas a uma campanha</span>
      </div>
      <div class="management-table">
        <div class="management-row table-head three-col">
          <span>Nome</span>
          <span>Campanha</span>
          <span>Status</span>
        </div>
        <div v-for="audience in state.audiences" :key="audience.id" class="management-row three-col">
          <strong>{{ audience.name }}</strong>
          <span>{{ campaignName(audience.campaignId) }}</span>
          <StatusIndicator :status="audience.status" />
        </div>
      </div>
    </article>
  </section>
</template>
