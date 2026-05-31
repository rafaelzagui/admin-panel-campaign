<script setup lang="ts">
import type { AuditEventDto } from '@/dtos/campaign.dto'

defineProps<{
  events: AuditEventDto[]
}>()
</script>

<template>
  <article class="panel audit-panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Auditavel</span>
        <h2>Execucoes e eventos</h2>
      </div>
    </div>
    <div v-if="events.length === 0" class="stack skeleton-area">
      <div class="skeleton"></div>
      <div class="skeleton short"></div>
    </div>
    <div v-else class="stack">
      <div v-for="event in events" :key="event.id" class="audit-event">
        <strong>{{ event.action }}</strong>
        <small>{{ event.createdAt }}</small>
        <p>{{ event.detail }}</p>
      </div>
    </div>
  </article>
</template>
