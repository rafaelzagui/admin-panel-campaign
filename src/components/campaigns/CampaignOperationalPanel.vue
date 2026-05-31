<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Clock3, Database, RadioTower } from '@lucide/vue'
import type { AuditEventDto, CampaignDto } from '@/dtos/campaign.dto'
import StatusIndicator from '@/components/ui/StatusIndicator.vue'

const props = defineProps<{
  campaign: CampaignDto
  readinessIssues: string[]
  isReady: boolean
  activeRuleCount: number
  activeAudienceCount: number
  activeTemplateCount: number
  events: AuditEventDto[]
}>()

function nextExecutionLabel() {
  if (props.campaign.scheduleType === 'MANUAL') return 'Manual'
  return props.campaign.startsAt || 'Nao planejada'
}
</script>

<template>
  <aside class="operational-panel">
    <div class="context-heading">
      <span class="eyebrow">Operacao</span>
      <h2>Painel operacional</h2>
    </div>

    <section class="ops-block">
      <span>Status atual</span>
      <StatusIndicator :status="campaign.status" />
    </section>

    <section class="ops-block">
      <span>Checklist</span>
      <div class="checklist">
        <div :class="['check-item', activeRuleCount > 0 ? 'done' : 'blocked']">
          <CheckCircle2 :size="15" />
          <span>{{ activeRuleCount }} regra ativa</span>
        </div>
        <div :class="['check-item', activeAudienceCount > 0 ? 'done' : 'blocked']">
          <CheckCircle2 :size="15" />
          <span>{{ activeAudienceCount }} audiencia ativa</span>
        </div>
        <div :class="['check-item', activeTemplateCount > 0 ? 'done' : 'blocked']">
          <CheckCircle2 :size="15" />
          <span>{{ activeTemplateCount }} template ativo</span>
        </div>
        <div :class="['check-item', isReady ? 'done' : 'blocked']">
          <Database :size="15" />
          <span>{{ isReady ? 'Pronta para ativacao' : `${readinessIssues.length} pendencia(s)` }}</span>
        </div>
      </div>
    </section>

    <section class="ops-block ops-grid">
      <div>
        <Clock3 :size="14" />
        <span>Ultima execucao</span>
        <strong>{{ events[0]?.createdAt || 'Sem execucoes' }}</strong>
      </div>
      <div>
        <RadioTower :size="14" />
        <span>Proxima execucao</span>
        <strong>{{ nextExecutionLabel() }}</strong>
      </div>
    </section>

    <section class="ops-block">
      <span>Eventos recentes</span>
      <div v-if="events.length" class="ops-events">
        <div v-for="event in events.slice(0, 3)" :key="event.id">
          <strong>{{ event.action }}</strong>
          <small>{{ event.createdAt }}</small>
        </div>
      </div>
      <div v-else class="empty-state">
        <AlertTriangle :size="15" />
        <span>Nenhum evento registrado</span>
      </div>
    </section>
  </aside>
</template>
