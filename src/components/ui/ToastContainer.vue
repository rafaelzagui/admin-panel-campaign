<script setup lang="ts">
export type ToastItem = {
  id: number
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
}

defineProps<{
  toasts: ToastItem[]
}>()

defineEmits<{
  dismiss: [toastId: number]
}>()

function messageItems(message: string) {
  return message.split('\n').filter(Boolean)
}
</script>

<template>
  <div class="toast-region" aria-live="polite" aria-label="Notificacoes">
    <article v-for="toast in toasts" :key="toast.id" :class="['toast', toast.type]">
      <div>
        <strong>{{ toast.title }}</strong>
        <ul v-if="messageItems(toast.message).length > 1">
          <li v-for="item in messageItems(toast.message)" :key="item">{{ item }}</li>
        </ul>
        <p v-else>{{ toast.message }}</p>
      </div>
      <button aria-label="Fechar notificacao" @click="$emit('dismiss', toast.id)">x</button>
    </article>
  </div>
</template>
