<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Clock3, Database } from '@lucide/vue'
import type { CampaignDto } from '@/dtos/campaign.dto'

defineProps<{
  campaign: CampaignDto
  readinessIssues: string[]
  isReady: boolean
  activeRuleCount: number
  activeAudienceCount: number
  activeTemplateCount: number
}>()
</script>

<template>
  <article class="panel readiness-panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Prontidao</span>
        <h2>Checklist operacional</h2>
      </div>
      <CheckCircle2 v-if="isReady" class="status-icon good-icon" :size="19" />
      <AlertTriangle v-else class="status-icon warn-icon" :size="19" />
    </div>

    <div class="readiness-score">
      <strong>{{ isReady ? 'OK' : readinessIssues.length }}</strong>
      <span>{{ isReady ? 'pronta para ativacao' : 'pendencias bloqueantes' }}</span>
    </div>

    <div class="checklist">
      <div :class="['check-item', activeRuleCount > 0 ? 'done' : 'blocked']">
        <CheckCircle2 :size="16" />
        <span>{{ activeRuleCount }} regra ativa</span>
      </div>
      <div :class="['check-item', activeAudienceCount > 0 ? 'done' : 'blocked']">
        <CheckCircle2 :size="16" />
        <span>{{ activeAudienceCount }} audiencia ativa</span>
      </div>
      <div :class="['check-item', activeTemplateCount > 0 ? 'done' : 'blocked']">
        <CheckCircle2 :size="16" />
        <span>{{ activeTemplateCount }} template ativo</span>
      </div>
      <div :class="['check-item', campaign.startsAt || campaign.scheduleType === 'MANUAL' ? 'done' : 'blocked']">
        <Clock3 :size="16" />
        <span>{{ campaign.scheduleType }}</span>
      </div>
      <div :class="['check-item', campaign.triggerConfig ? 'done' : 'blocked']">
        <Database :size="16" />
        <span>JSON preservado</span>
      </div>
    </div>

    <div v-if="readinessIssues.length" class="issue-list">
      <small v-for="issue in readinessIssues" :key="issue">{{ issue }}</small>
    </div>
  </article>
</template>
