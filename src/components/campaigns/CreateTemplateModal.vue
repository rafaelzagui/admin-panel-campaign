<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { CreateMessageTemplatePayload } from '@/dtos/campaign-api.dto'
import type { CampaignDto } from '@/dtos/campaign.dto'

defineProps<{
  campaigns: CampaignDto[]
}>()

const emit = defineEmits<{
  close: []
  create: [campaignId: string, payload: CreateMessageTemplatePayload]
}>()

const selectedCampaignId = ref('')
const form = reactive({
  name: 'whatsapp-suplementos-oferta',
  channel: 'WHATSAPP',
  content: '{{productName}} com {{discountPercent}}% OFF por {{price}}. Comprar: {{affiliateLink}}',
  fallbackContent: 'Confira as ofertas de suplementos e fitness de hoje.',
  variables: '{\n  "required": [\n    "productName",\n    "discountPercent",\n    "price",\n    "affiliateLink"\n  ]\n}',
  status: 'ACTIVE',
})

function submit() {
  if (!selectedCampaignId.value || !form.name || !form.content) return

  emit('create', selectedCampaignId.value, {
    name: form.name,
    channel: form.channel as never,
    content: form.content,
    fallbackContent: form.fallbackContent || null,
    variables: JSON.parse(form.variables || '{}'),
    status: form.status as never,
  })
}
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <section class="modal create-campaign-modal">
      <div class="workspace-panel-heading">
        <div>
          <h2>Criar template</h2>
          <p>Selecione a campanha e defina o conteudo da mensagem.</p>
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
          <input v-model="form.name" placeholder="default-whatsapp" />
        </label>
        <label>
          Canal
          <select v-model="form.channel">
            <option>WHATSAPP</option>
          </select>
        </label>
        <label>
          Status
          <select v-model="form.status">
            <option>DRAFT</option>
            <option>ACTIVE</option>
            <option>INACTIVE</option>
            <option>ARCHIVED</option>
          </select>
        </label>
      </div>

      <label class="wide-field">
        content
        <textarea v-model="form.content"></textarea>
      </label>
      <label class="wide-field">
        fallbackContent
        <input v-model="form.fallbackContent" />
      </label>
      <label class="wide-field">
        variables
        <textarea v-model="form.variables"></textarea>
      </label>

      <div class="action-row">
        <button class="secondary-button" @click="$emit('close')">Cancelar</button>
        <button class="primary-button" :disabled="!selectedCampaignId || !form.name || !form.content" @click="submit">
          Criar template
        </button>
      </div>
    </section>
  </div>
</template>
