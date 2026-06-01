<script setup lang="ts">
import { reactive } from 'vue'
import type { UpdateCampaignRulePayload } from '@/dtos/campaign-api.dto'
import type { CampaignRuleDto } from '@/dtos/campaign.dto'

const props = defineProps<{ rule: CampaignRuleDto }>()
const emit = defineEmits<{
  close: []
  save: [campaignId: string, ruleId: string, payload: UpdateCampaignRulePayload]
}>()

const form = reactive({
  name: props.rule.name ?? '',
  description: props.rule.description ?? '',
  type: props.rule.type,
  status: props.rule.status,
  priority: props.rule.priority,
  condition: props.rule.condition,
})

function submit() {
  emit('save', props.rule.campaignId, props.rule.id, {
    name: form.name,
    description: form.description || null,
    type: form.type,
    status: form.status as never,
    priority: Number(form.priority),
    condition: JSON.parse(form.condition || '{}'),
  })
}
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <section class="modal create-campaign-modal">
      <div class="workspace-panel-heading">
        <div>
          <h2>Editar regra</h2>
          <p>Altere os valores e salve no campaign-service.</p>
        </div>
        <button class="icon-button" aria-label="Fechar modal" @click="$emit('close')">x</button>
      </div>
      <div class="form-grid">
        <label>Nome<input v-model="form.name" /></label>
        <label>
          Tipo
          <select v-model="form.type">
            <option>PRICE_RANGE</option>
            <option>DISCOUNT_THRESHOLD</option>
            <option>KEYWORD_MATCH</option>
            <option>MARKETPLACE_ALLOWLIST</option>
            <option>MARKETPLACE_BLOCKLIST</option>
            <option>CATEGORY_ALLOWLIST</option>
            <option>CATEGORY_BLOCKLIST</option>
            <option>MIN_SELLER_RATING</option>
            <option>MIN_STOCK</option>
            <option>CUSTOM</option>
          </select>
        </label>
        <label>
          Status
          <select v-model="form.status">
            <option>ACTIVE</option>
            <option>INACTIVE</option>
            <option>ARCHIVED</option>
          </select>
        </label>
        <label>Prioridade<input v-model.number="form.priority" type="number" /></label>
        <label class="wide-field">Descricao<input v-model="form.description" /></label>
      </div>
      <label class="wide-field">condition<textarea v-model="form.condition"></textarea></label>
      <div class="action-row">
        <button class="secondary-button" @click="$emit('close')">Cancelar</button>
        <button class="primary-button" @click="submit">Salvar regra</button>
      </div>
    </section>
  </div>
</template>
