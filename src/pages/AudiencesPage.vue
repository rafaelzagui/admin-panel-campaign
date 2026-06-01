<script setup lang="ts">
import { computed, ref } from 'vue'
import CreateAudienceModal from '@/components/campaigns/CreateAudienceModal.vue'
import EditAudienceModal from '@/components/campaigns/EditAudienceModal.vue'
import StatusIndicator from '@/components/ui/StatusIndicator.vue'
import type { CreateCampaignAudiencePayload, UpdateCampaignAudiencePayload } from '@/dtos/campaign-api.dto'
import type { CampaignLinkedEntityDto } from '@/dtos/campaign.dto'
import { getApiErrorMessage } from '@/services/apiClient'
import { useCampaignService } from '@/services/campaign.service'

const emit = defineEmits<{
  notify: [type: 'success' | 'error' | 'warning' | 'info', title: string, message: string]
}>()

const { state, createAudience, updateAudience } = useCampaignService()
const showCreateModal = ref(false)
const editingAudience = ref<CampaignLinkedEntityDto | null>(null)

const activeAudiences = computed(() =>
  state.audiences.filter((audience) => audience.status === 'ACTIVE').length,
)

function campaignName(campaignId: string) {
  return state.campaigns.find((campaign) => campaign.id === campaignId)?.name ?? 'Campanha removida'
}

async function submitAudienceUpdate(campaignId: string, audienceId: string, payload: UpdateCampaignAudiencePayload) {
  try {
    await updateAudience(campaignId, audienceId, payload)
    editingAudience.value = null
    emit('notify', 'success', 'Audiencia salva', 'A audiencia foi atualizada no campaign-service.')
  } catch (error) {
    emit('notify', 'error', 'Erro ao salvar audiencia', getApiErrorMessage(error))
  }
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
        <button v-for="audience in state.audiences" :key="audience.id" class="management-row three-col clickable-row" @click="editingAudience = audience">
          <strong>{{ audience.name }}</strong>
          <span>{{ campaignName(audience.campaignId) }}</span>
          <StatusIndicator :status="audience.status" />
        </button>
      </div>
    </article>

    <CreateAudienceModal
      v-if="showCreateModal"
      :campaigns="state.campaigns"
      @close="showCreateModal = false"
      @create="submitAudience"
    />
    <EditAudienceModal
      v-if="editingAudience"
      :audience="editingAudience"
      @close="editingAudience = null"
      @save="submitAudienceUpdate"
    />
  </section>
</template>
