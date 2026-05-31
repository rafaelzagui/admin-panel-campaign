<script setup lang="ts">
import type { CampaignDto } from '@/dtos/campaign.dto'

defineProps<{
  campaign: CampaignDto
}>()
</script>

<template>
  <aside class="context-panel">
    <div class="context-heading">
      <span class="eyebrow">Contexto</span>
      <h2>Resumo da campanha</h2>
    </div>

    <dl class="context-list">
      <div>
        <dt>Nome</dt>
        <dd>{{ campaign.name }}</dd>
      </div>
      <div>
        <dt>Slug</dt>
        <dd>{{ campaign.slug }}</dd>
      </div>
      <div>
        <dt>Tipo</dt>
        <dd>{{ campaign.scheduleType }}</dd>
      </div>
      <div>
        <dt>Agendamento</dt>
        <dd>{{ campaign.startsAt || 'Manual / imediato' }}</dd>
      </div>
      <div>
        <dt>Timezone</dt>
        <dd>{{ campaign.timezone || 'Nao definido' }}</dd>
      </div>
      <div>
        <dt>Fonte</dt>
        <dd>campaign-service</dd>
      </div>
    </dl>
  </aside>
</template>
