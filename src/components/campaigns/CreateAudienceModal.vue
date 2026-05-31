<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { CreateCampaignAudiencePayload } from '@/dtos/campaign-api.dto'
import type { CampaignDto } from '@/dtos/campaign.dto'

defineProps<{
  campaigns: CampaignDto[]
}>()

const emit = defineEmits<{
  close: []
  create: [campaignId: string, payload: CreateCampaignAudiencePayload]
}>()

const selectedCampaignId = ref('')
const form = reactive({
  type: 'PHONE_NUMBER',
  identifier: '5511999999999',
  displayName: 'Cliente teste',
  status: 'ACTIVE',
  payload: '{}',
})

function submit() {
  if (!selectedCampaignId.value || !form.identifier) return

  emit('create', selectedCampaignId.value, {
    type: form.type as never,
    identifier: form.identifier,
    displayName: form.displayName || null,
    status: form.status as never,
    payload: Object.keys(JSON.parse(form.payload || '{}')).length ? JSON.parse(form.payload || '{}') : undefined,
  })
}
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <section class="modal create-campaign-modal">
      <div class="workspace-panel-heading">
        <div>
          <h2>Criar audiencia</h2>
          <p>Selecione a campanha e informe a origem da audiencia.</p>
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
          Tipo
          <select v-model="form.type">
            <option>PHONE_NUMBER</option>
            <option>SEGMENT</option>
            <option>WEBHOOK</option>
          </select>
        </label>
        <label>
          Identifier
          <input v-model="form.identifier" placeholder="vip-users" />
        </label>
        <label>
          Display name
          <input v-model="form.displayName" />
        </label>
        <label>
          Status
          <select v-model="form.status">
            <option>ACTIVE</option>
            <option>INACTIVE</option>
            <option>FAILED</option>
          </select>
        </label>
      </div>

      <label class="wide-field">
        payload
        <textarea v-model="form.payload"></textarea>
      </label>

      <div class="action-row">
        <button class="secondary-button" @click="$emit('close')">Cancelar</button>
        <button class="primary-button" :disabled="!selectedCampaignId || !form.identifier" @click="submit">
          Criar audiencia
        </button>
      </div>
    </section>
  </div>
</template>
