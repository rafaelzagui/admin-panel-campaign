<script setup lang="ts">
import { computed, ref } from 'vue'
import CreateTemplateModal from '@/components/campaigns/CreateTemplateModal.vue'
import StatusIndicator from '@/components/ui/StatusIndicator.vue'
import type { CreateMessageTemplatePayload } from '@/dtos/campaign-api.dto'
import { getApiErrorMessage } from '@/services/apiClient'
import { useCampaignService } from '@/services/campaign.service'

const emit = defineEmits<{
  notify: [type: 'success' | 'error' | 'warning' | 'info', title: string, message: string]
}>()

const { state, createTemplate } = useCampaignService()
const showCreateModal = ref(false)

const activeTemplates = computed(() =>
  state.templates.filter((template) => template.status === 'ACTIVE').length,
)

function campaignName(campaignId: string) {
  return state.campaigns.find((campaign) => campaign.id === campaignId)?.name ?? 'Campanha removida'
}

async function submitTemplate(campaignId: string, payload: CreateMessageTemplatePayload) {
  try {
    await createTemplate(campaignId, payload)
    showCreateModal.value = false
    emit('notify', 'success', 'Template criado', 'O template foi vinculado a campanha selecionada.')
  } catch (error) {
    emit('notify', 'error', 'Erro ao criar template', getApiErrorMessage(error))
  }
}
</script>

<template>
  <section class="resource-page">
    <article class="panel resource-hero">
      <div>
        <span class="eyebrow">Templates</span>
        <h2>Conteudo aprovado por campanha</h2>
      </div>
      <div class="resource-actions">
        <span class="badge good">{{ activeTemplates }} ativos</span>
        <button class="primary-button" @click="showCreateModal = true">Novo template</button>
      </div>
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

    <CreateTemplateModal
      v-if="showCreateModal"
      :campaigns="state.campaigns"
      @close="showCreateModal = false"
      @create="submitTemplate"
    />
  </section>
</template>
