<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { CampaignDto } from '@/dtos/campaign.dto'
import type { CreateCampaignRulePayload } from '@/dtos/campaign-api.dto'

defineProps<{
  campaigns: CampaignDto[]
}>()

const emit = defineEmits<{
  close: []
  create: [campaignId: string, payload: CreateCampaignRulePayload]
}>()

const selectedCampaignId = ref('')
const form = reactive({
  name: 'Minimum discount 10%',
  description: 'Aceita somente ofertas com desconto minimo de 10%.',
  type: 'DISCOUNT_THRESHOLD',
  status: 'ACTIVE',
  priority: 10,
  condition: '{\n  "minDiscountPercent": 10\n}',
})

function submit() {
  if (!selectedCampaignId.value || !form.name) return

  emit('create', selectedCampaignId.value, {
    name: form.name,
    description: form.description || null,
    type: form.type as never,
    status: form.status as never,
    priority: Number(form.priority),
    condition: JSON.parse(form.condition),
  })
}
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <section class="modal create-campaign-modal">
      <div class="workspace-panel-heading">
        <div>
          <h2>Criar regra</h2>
          <p>Selecione a campanha e configure a condicao da regra.</p>
        </div>
        <button class="icon-button" aria-label="Fechar modal" @click="$emit('close')">x</button>
      </div>

      <div class="form-grid">
        <label>
          Campanha
          <select v-model="selectedCampaignId">
            <option value="">Selecione</option>
            <option v-for="campaign in campaigns" :key="campaign.id" :value="campaign.id">
              {{ campaign.name }}
            </option>
          </select>
        </label>
        <label>
          Nome
          <input v-model="form.name" />
        </label>
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
        <label>
          Prioridade
          <input v-model.number="form.priority" type="number" />
        </label>
        <label>
          Descricao
          <input v-model="form.description" />
        </label>
      </div>

      <label class="wide-field">
        condition
        <textarea v-model="form.condition"></textarea>
      </label>

      <div class="action-row">
        <button class="secondary-button" @click="$emit('close')">Cancelar</button>
        <button class="primary-button" :disabled="!selectedCampaignId || !form.name" @click="submit">
          Criar regra
        </button>
      </div>
    </section>
  </div>
</template>
