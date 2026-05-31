<script setup lang="ts">
import { computed } from 'vue'
import { useCampaignService } from '@/services/campaign.service'

const { state } = useCampaignService()

const events = computed(() => [...state.auditEvents])

function campaignName(campaignId: string) {
  return state.campaigns.find((campaign) => campaign.id === campaignId)?.name ?? 'Campanha removida'
}
</script>

<template>
  <section class="resource-page">
    <article class="panel resource-hero">
      <div>
        <span class="eyebrow">Execucoes</span>
        <h2>Eventos auditaveis do campaign-service</h2>
      </div>
      <span class="badge info">{{ events.length }} eventos</span>
    </article>

    <article class="panel">
      <div class="panel-heading">
        <h2>Historico de execucoes</h2>
        <span class="badge muted">envio final pertence ao dispatch-service</span>
      </div>
      <div class="management-table">
        <div class="management-row table-head executions-col">
          <span>Evento</span>
          <span>Campanha</span>
          <span>Data</span>
          <span>Detalhe</span>
        </div>
        <div v-for="event in events" :key="event.id" class="management-row executions-col">
          <strong>{{ event.action }}</strong>
          <span>{{ campaignName(event.campaignId) }}</span>
          <span>{{ event.createdAt }}</span>
          <span>{{ event.detail }}</span>
        </div>
      </div>
    </article>
  </section>
</template>
