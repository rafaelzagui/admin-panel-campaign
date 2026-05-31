<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { CampaignScheduleType, CreateCampaignPayload, JsonRecord } from '@/dtos/campaign-api.dto'

const emit = defineEmits<{
  close: []
  create: [payload: CreateCampaignPayload]
}>()

const advancedOpen = ref(false)
const form = reactive({
  name: '',
  slug: '',
  description: '',
  scheduleType: 'MANUAL' as CampaignScheduleType,
  timezone: 'America/Sao_Paulo',
  startsAt: '',
  endsAt: '',
  triggerConfig: '{}',
  normalizationConfig: '{}',
  metadata: '{}',
})

const canSubmit = computed(() => form.name.trim().length > 0 && form.slug.trim().length > 0)

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function syncSlug() {
  if (!form.slug.trim()) form.slug = slugify(form.name)
}

function parseJson(value: string): JsonRecord | null {
  const parsed = JSON.parse(value || '{}')
  return Object.keys(parsed).length ? parsed : {}
}

function submit() {
  if (!canSubmit.value) return

  emit('create', {
    name: form.name.trim(),
    slug: form.slug.trim(),
    description: form.description.trim() || null,
    scheduleType: form.scheduleType,
    timezone: form.timezone.trim() || null,
    startsAt: form.startsAt || null,
    endsAt: form.endsAt || null,
    triggerConfig: parseJson(form.triggerConfig),
    normalizationConfig: parseJson(form.normalizationConfig),
    metadata: parseJson(form.metadata),
  })
}
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <section class="modal create-campaign-modal">
      <div class="workspace-panel-heading">
        <div>
          <h2>Nova campanha</h2>
          <p>A campanha sera criada como DRAFT no campaign-service.</p>
        </div>
        <button class="icon-button" aria-label="Fechar modal" @click="$emit('close')">x</button>
      </div>

      <div class="form-grid">
        <label>
          Nome
          <input v-model="form.name" @blur="syncSlug" />
        </label>
        <label>
          Slug
          <input v-model="form.slug" placeholder="ofertas-tenis-corrida" />
        </label>
        <label>
          Descricao
          <input v-model="form.description" />
        </label>
        <label>
          Agendamento
          <select v-model="form.scheduleType">
            <option>MANUAL</option>
            <option>ONE_TIME</option>
            <option>CRON</option>
            <option>EVENT_DRIVEN</option>
          </select>
        </label>
        <label>
          Timezone
          <input v-model="form.timezone" />
        </label>
        <label>
          Starts at
          <input v-model="form.startsAt" type="datetime-local" />
        </label>
        <label>
          Ends at
          <input v-model="form.endsAt" type="datetime-local" />
        </label>
      </div>

      <section class="advanced-section">
        <button class="advanced-toggle" @click="advancedOpen = !advancedOpen">
          <span>Configuracao Avancada</span>
          <strong>{{ advancedOpen ? 'Fechar' : 'Abrir' }}</strong>
        </button>

        <div v-if="advancedOpen" class="advanced-content">
          <label class="wide-field">
            triggerConfig
            <textarea v-model="form.triggerConfig"></textarea>
          </label>
          <label class="wide-field">
            normalizationConfig
            <textarea v-model="form.normalizationConfig"></textarea>
          </label>
          <label class="wide-field">
            metadata
            <textarea v-model="form.metadata"></textarea>
          </label>
        </div>
      </section>

      <div class="action-row">
        <button class="secondary-button" @click="$emit('close')">Cancelar</button>
        <button class="primary-button" :disabled="!canSubmit" @click="submit">Criar campanha</button>
      </div>
    </section>
  </div>
</template>
