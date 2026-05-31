<script setup lang="ts">
import { ref } from 'vue'
import type { CampaignDto } from '@/dtos/campaign.dto'
import StatusIndicator from '@/components/ui/StatusIndicator.vue'

defineProps<{
  campaign: CampaignDto
  readinessIssues: string[]
  isReady: boolean
}>()

const advancedOpen = ref(false)
</script>

<template>
  <article class="workspace-panel detail-panel">
    <div class="workspace-panel-heading">
      <div>
        <h2>Configuracao</h2>
        <p>Edite apenas os campos necessarios para preparar esta campanha.</p>
      </div>
      <StatusIndicator :status="campaign.status" />
    </div>

    <div v-if="campaign.status === 'FAILED'" class="alert bad-alert">
      {{ campaign.error }}
    </div>

    <div :class="['alert', isReady ? 'ready-alert' : 'warn-alert']">
      {{ isReady ? 'Campanha pronta para ativacao.' : readinessIssues[0] }}
    </div>

    <div class="form-grid">
      <label>
        Nome
        <input v-model="campaign.name" />
      </label>
      <label>
        Slug
        <input v-model="campaign.slug" />
      </label>
      <label>
        Descricao
        <input v-model="campaign.description" />
      </label>
      <label>
        Agendamento
        <select v-model="campaign.scheduleType">
          <option>MANUAL</option>
          <option>ONE_TIME</option>
          <option>CRON</option>
          <option>EVENT_DRIVEN</option>
        </select>
      </label>
      <label>
        Timezone
        <input v-model="campaign.timezone" placeholder="America/Sao_Paulo" />
      </label>
      <label>
        Starts at
        <input v-model="campaign.startsAt" type="datetime-local" />
      </label>
      <label>
        Ends at
        <input v-model="campaign.endsAt" type="datetime-local" />
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
          <textarea v-model="campaign.triggerConfig"></textarea>
        </label>
        <label class="wide-field">
          normalizationConfig
          <textarea v-model="campaign.normalizationConfig"></textarea>
        </label>
        <label class="wide-field">
          metadata
          <textarea v-model="campaign.metadata"></textarea>
        </label>
      </div>
    </section>
  </article>
</template>
