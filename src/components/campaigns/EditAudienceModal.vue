<script setup lang="ts">
import { reactive } from 'vue'
import type { UpdateCampaignAudiencePayload } from '@/dtos/campaign-api.dto'
import type { CampaignLinkedEntityDto } from '@/dtos/campaign.dto'

const props = defineProps<{ audience: CampaignLinkedEntityDto }>()
const emit = defineEmits<{
  close: []
  save: [campaignId: string, audienceId: string, payload: UpdateCampaignAudiencePayload]
}>()

const form = reactive({
  type: props.audience.type ?? 'SEGMENT',
  identifier: props.audience.identifier ?? props.audience.name,
  displayName: props.audience.displayName ?? props.audience.name,
  status: props.audience.status,
  payload: props.audience.payload ?? '{}',
})

function submit() {
  emit('save', props.audience.campaignId, props.audience.id, {
    type: form.type as never,
    identifier: form.identifier,
    displayName: form.displayName || null,
    status: form.status as never,
    payload: JSON.parse(form.payload || '{}'),
  })
}
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <section class="modal create-campaign-modal">
      <div class="workspace-panel-heading">
        <div>
          <h2>Editar audiencia</h2>
          <p>Atualize o identificador, status ou payload.</p>
        </div>
        <button class="icon-button" aria-label="Fechar modal" @click="$emit('close')">x</button>
      </div>
      <div class="form-grid">
        <label>
          Tipo
          <select v-model="form.type">
            <option>PHONE_NUMBER</option>
            <option>SEGMENT</option>
            <option>WEBHOOK</option>
          </select>
        </label>
        <label>Identifier<input v-model="form.identifier" /></label>
        <label>Display name<input v-model="form.displayName" /></label>
        <label>
          Status
          <select v-model="form.status">
            <option>ACTIVE</option>
            <option>INACTIVE</option>
            <option>FAILED</option>
          </select>
        </label>
      </div>
      <label class="wide-field">payload<textarea v-model="form.payload"></textarea></label>
      <div class="action-row">
        <button class="secondary-button" @click="$emit('close')">Cancelar</button>
        <button class="primary-button" @click="submit">Salvar audiencia</button>
      </div>
    </section>
  </div>
</template>
