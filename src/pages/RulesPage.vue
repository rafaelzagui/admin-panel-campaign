<script setup lang="ts">
import { computed, ref } from 'vue'
import CreateRuleModal from '@/components/campaigns/CreateRuleModal.vue'
import EditRuleModal from '@/components/campaigns/EditRuleModal.vue'
import StatusIndicator from '@/components/ui/StatusIndicator.vue'
import type { CreateCampaignRulePayload, UpdateCampaignRulePayload } from '@/dtos/campaign-api.dto'
import type { CampaignRuleDto } from '@/dtos/campaign.dto'
import { getApiErrorMessage } from '@/services/apiClient'
import { useCampaignService } from '@/services/campaign.service'

const emit = defineEmits<{
  notify: [type: 'success' | 'error' | 'warning' | 'info', title: string, message: string]
}>()

const { state, createRule, updateRule } = useCampaignService()
const showCreateModal = ref(false)
const editingRule = ref<CampaignRuleDto | null>(null)

const rulesByPriority = computed(() =>
  [...state.rules].sort((a, b) => a.priority - b.priority),
)

function campaignName(campaignId: string) {
  return state.campaigns.find((campaign) => campaign.id === campaignId)?.name ?? 'Campanha removida'
}

async function submitRuleUpdate(campaignId: string, ruleId: string, payload: UpdateCampaignRulePayload) {
  try {
    await updateRule(campaignId, ruleId, payload)
    editingRule.value = null
    emit('notify', 'success', 'Regra salva', 'A regra foi atualizada no campaign-service.')
  } catch (error) {
    emit('notify', 'error', 'Erro ao salvar regra', getApiErrorMessage(error))
  }
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
        <button v-for="rule in rulesByPriority" :key="rule.id" class="management-row clickable-row" @click="editingRule = rule">
          <strong>{{ rule.type }}</strong>
          <span>{{ campaignName(rule.campaignId) }}</span>
          <span>{{ rule.priority }}</span>
          <StatusIndicator :status="rule.status" />
          <code>{{ rule.condition }}</code>
        </button>
      </div>
    </article>

    <CreateRuleModal
      v-if="showCreateModal"
      :campaigns="state.campaigns"
      @close="showCreateModal = false"
      @create="submitRule"
    />
    <EditRuleModal
      v-if="editingRule"
      :rule="editingRule"
      @close="editingRule = null"
      @save="submitRuleUpdate"
    />
  </section>
</template>
