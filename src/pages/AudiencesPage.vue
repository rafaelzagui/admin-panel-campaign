<script setup lang="ts">
import { computed, ref } from 'vue'
import CreateAudienceModal from '@/components/campaigns/CreateAudienceModal.vue'
import StatusIndicator from '@/components/ui/StatusIndicator.vue'
import type { CreateCampaignAudiencePayload } from '@/dtos/campaign-api.dto'
import { getApiErrorMessage } from '@/services/apiClient'
import { useCampaignService } from '@/services/campaign.service'

const emit = defineEmits<{
  notify: [type: 'success' | 'error' | 'warning' | 'info', title: string, message: string]
}>()

const { state, createAudience } = useCampaignService()
const showCreateModal = ref(false)

const activeAudiences = computed(() =>
  state.audiences.filter((audience) => audience.status === 'ACTIVE').length,
)

function campaignName(campaignId: string) {
  return state.campaigns.find((campaign) => campaign.id === campaignId)?.name ?? 'Campanha removida'
}

async function submitAudience(campaignId: string, payload: CreateCampaignAudiencePayload) {
  try {
    await createAudience(campaignId, payload)
    showCreateModal.value = false
    emit('notify', 'success', 'Audiencia criada', 'A audiencia foi vinculada a campanha selecionada.')
  } catch (error) {
    emit('notify', 'error', 'Erro ao criar audiencia', getApiErrorMessage(error))
  }
}
</script>

<template>
  <section class="resource-page">
    <article class="panel resource-hero">
      <div>
        <span class="eyebrow">Audiencias</span>
        <h2>Segmentos vinculados a campanhas</h2>
      </div>
      <div class="resource-actions">
        <span class="badge good">{{ activeAudiences }} ativas</span>
        <button class="primary-button" @click="showCreateModal = true">Nova audiencia</button>
      </div>
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

    <CreateAudienceModal
      v-if="showCreateModal"
      :campaigns="state.campaigns"
      @close="showCreateModal = false"
      @create="submitAudience"
    />
  </section>
</template>
