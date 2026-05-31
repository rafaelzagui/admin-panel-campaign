<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  message: string
}>()

defineEmits<{
  close: []
}>()

const messageItems = computed(() => props.message.split('\n').filter(Boolean))
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <section class="modal">
      <div class="panel-heading">
        <h2>{{ title }}</h2>
        <button class="icon-button" aria-label="Fechar modal" @click="$emit('close')">x</button>
      </div>
      <ul v-if="messageItems.length > 1" class="notice-list">
        <li v-for="item in messageItems" :key="item">{{ item }}</li>
      </ul>
      <p v-else>{{ message }}</p>
      <button class="primary-button" @click="$emit('close')">Entendi</button>
    </section>
  </div>
</template>
