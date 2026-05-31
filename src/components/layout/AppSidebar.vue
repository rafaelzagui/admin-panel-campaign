<script setup lang="ts">
import type { Component } from 'vue'
import {
  Activity,
  FileText,
  GitBranch,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
} from '@lucide/vue'
import type { AdminView } from '@/dtos/navigation.dto'

defineProps<{
  collapsed: boolean
  activeView: AdminView
}>()

defineEmits<{
  toggle: []
  navigate: [view: AdminView]
}>()

const navItems: Array<{ label: string; view: AdminView; icon: Component }> = [
  { label: 'Campanhas', view: 'campaigns', icon: LayoutDashboard },
  { label: 'Regras', view: 'rules', icon: GitBranch },
  { label: 'Audiencias', view: 'audiences', icon: Users },
  { label: 'Templates', view: 'templates', icon: FileText },
  { label: 'Execucoes', view: 'executions', icon: Activity },
]
</script>

<template>
  <aside :class="['sidebar', { collapsed }]">
    <div class="brand">
      <div class="brand-mark">C</div>
      <div v-if="!collapsed">
        <strong>Campaign Ops</strong>
        <small>campaign-service</small>
      </div>
      <button class="icon-button collapse-button" aria-label="Alternar sidebar" @click="$emit('toggle')">
        <PanelLeftOpen v-if="collapsed" :size="16" />
        <PanelLeftClose v-else :size="16" />
      </button>
    </div>
    <nav>
      <button
        v-for="item in navItems"
        :key="item.view"
        :class="['nav-item', { active: item.view === activeView }]"
        @click="$emit('navigate', item.view)"
      >
        <component :is="item.icon" :size="17" />
        <span>{{ item.label }}</span>
      </button>
    </nav>
    <div v-if="!collapsed" class="sidebar-footer">
      <span>Truth source</span>
      <strong>campaign-service</strong>
      <small>dispatch-service executa o envio final</small>
    </div>
  </aside>
</template>
