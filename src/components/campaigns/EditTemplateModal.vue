<script setup lang="ts">
import { reactive } from 'vue'
import type { UpdateMessageTemplatePayload } from '@/dtos/campaign-api.dto'
import type { CampaignLinkedEntityDto } from '@/dtos/campaign.dto'

const props = defineProps<{ template: CampaignLinkedEntityDto }>()
const emit = defineEmits<{
  close: []
  save: [campaignId: string, templateId: string, payload: UpdateMessageTemplatePayload]
}>()

const form = reactive({
  name: props.template.name,
  channel: props.template.channel ?? 'WHATSAPP',
  content: props.template.content ?? '',
  fallbackContent: props.template.fallbackContent ?? '',
  variables: props.template.variables ?? '{}',
  status: props.template.status,
})

function submit() {
  emit('save', props.template.campaignId, props.template.id, {
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
          <h2>Editar template</h2>
          <p>Atualize conteudo, variaveis ou status.</p>
        </div>
        <button class="icon-button" aria-label="Fechar modal" @click="$emit('close')">x</button>
      </div>
      <div class="form-grid">
        <label>Nome<input v-model="form.name" /></label>
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
      <label class="wide-field">content<textarea v-model="form.content"></textarea></label>
      <label class="wide-field">fallbackContent<input v-model="form.fallbackContent" /></label>
      <label class="wide-field">variables<textarea v-model="form.variables"></textarea></label>
      <div class="action-row">
        <button class="secondary-button" @click="$emit('close')">Cancelar</button>
        <button class="primary-button" @click="submit">Salvar template</button>
      </div>
    </section>
  </div>
</template>
