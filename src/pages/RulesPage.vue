<script setup lang="ts">
import { computed, ref } from 'vue'
import CreateRuleModal from '@/components/campaigns/CreateRuleModal.vue'
import StatusIndicator from '@/components/ui/StatusIndicator.vue'
import type { CreateCampaignRulePayload } from '@/dtos/campaign-api.dto'
import { getApiErrorMessage } from '@/services/apiClient'
import { useCampaignService } from '@/services/campaign.service'

const emit = defineEmits<{
  notify: [type: 'success' | 'error' | 'warning' | 'info', title: string, message: string]
}>()

const { state, createRule } = useCampaignService()
const showCreateModal = ref(false)

const rulesByPriority = computed(() =>
  [...state.rules].sort((a, b) => a.priority - b.priority),
)

function campaignName(campaignId: string) {
  return state.campaigns.find((campaign) => campaign.id === campaignId)?.name ?? 'Campanha removida'
}

async function submitRule(campaignId: string, payload: CreateCampaignRulePayload) {
  try {
    await createRule(campaignId, payload)
    showCreateModal.value = false
    emit('notify', 'success', 'Regra criada', 'A regra foi associada a campanha selecionada.')
  } catch (error) {
    emit('notify', 'error', 'Erro ao criar regra', getApiErrorMessage(error))
  }
}
</script>

<template>
  <section class="resource-page">
    <article class="panel resource-hero">
      <div>
        <span class="eyebrow">Regras da campanha</span>
        <h2>Ordem de avaliacao e condicoes</h2>
      </div>
      <div class="resource-actions">
        <span class="badge info">{{ state.rules.length }} regras</span>
        <button class="primary-button" @click="showCreateModal = true">Nova regra</button>
      </div>
    </article>

    <article class="panel">
      <div class="panel-heading">
        <h2>Regras cadastradas</h2>
        <span class="badge muted">somente ACTIVE conta para prontidao</span>
      </div>
      <div class="management-table">
        <div class="management-row table-head">
          <span>Tipo</span>
          <span>Campanha</span>
          <span>Prioridade</span>
          <span>Status</span>
          <span>Condicao</span>
        </div>
        <div v-for="rule in rulesByPriority" :key="rule.id" class="management-row">
          <strong>{{ rule.type }}</strong>
          <span>{{ campaignName(rule.campaignId) }}</span>
          <span>{{ rule.priority }}</span>
          <StatusIndicator :status="rule.status" />
          <code>{{ rule.condition }}</code>
        </div>
      </div>
    </article>

    <CreateRuleModal
      v-if="showCreateModal"
      :campaigns="state.campaigns"
      @close="showCreateModal = false"
      @create="submitRule"
    />
  </section>
</template>
