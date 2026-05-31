<script setup lang="ts">
import type { Component } from 'vue'
import { reactive } from 'vue'
import {
  Activity,
  Boxes,
  ChevronDown,
  FileText,
  GitBranch,
  LayoutDashboard,
  RadioTower,
  Send,
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

const serviceGroups: Array<{
  id: string
  label: string
  icon: Component
  items: Array<{ label: string; view: AdminView; icon: Component }>
}> = [
  {
    id: 'campaign-service',
    label: 'Campaign Service',
    icon: Boxes,
    items: [
      { label: 'Campanhas', view: 'campaigns', icon: LayoutDashboard },
      { label: 'Rules', view: 'rules', icon: GitBranch },
      { label: 'Audiences', view: 'audiences', icon: Users },
      { label: 'Templates', view: 'templates', icon: FileText },
      { label: 'Executions', view: 'executions', icon: Activity },
    ],
  },
  {
    id: 'dispatch-service',
    label: 'Dispatch Service',
    icon: Send,
    items: [
      { label: 'WhatsMiau Admin', view: 'dispatch', icon: RadioTower },
    ],
  },
]

const openGroups = reactive<Record<string, boolean>>({
  'campaign-service': true,
  'dispatch-service': true,
})

function toggleGroup(groupId: string) {
  openGroups[groupId] = !openGroups[groupId]
}
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
    <nav class="service-nav">
      <section v-for="group in serviceGroups" :key="group.id" class="service-nav-group">
        <button
          :class="['service-nav-heading', { open: openGroups[group.id] }]"
          :aria-expanded="openGroups[group.id]"
          @click="toggleGroup(group.id)"
        >
          <component :is="group.icon" :size="15" />
          <span>{{ group.label }}</span>
          <ChevronDown class="service-nav-chevron" :size="14" />
        </button>
        <div v-show="openGroups[group.id]" class="service-nav-items">
          <button
            v-for="item in group.items"
            :key="item.view"
            :class="['nav-item', { active: item.view === activeView }]"
            @click="$emit('navigate', item.view)"
          >
            <component :is="item.icon" :size="17" />
            <span>{{ item.label }}</span>
          </button>
        </div>
      </section>
    </nav>
    <div v-if="!collapsed" class="sidebar-footer">
      <span>Truth source</span>
      <strong>campaign-service</strong>
      <small>dispatch-service executa o envio final</small>
    </div>
  </aside>
</template>
