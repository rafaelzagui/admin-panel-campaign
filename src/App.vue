<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import LoginPage from '@/pages/LoginPage.vue'
import { clearAuthToken, hasValidAuthToken } from '@/services/apiClient'
import { clearAuthenticatedUsername } from '@/services/auth.service'

const route = useRoute()
const router = useRouter()
const isAuthenticated = ref(hasValidAuthToken())

function authenticate() {
  isAuthenticated.value = hasValidAuthToken()
  if (isAuthenticated.value && ['/', '/login'].includes(route.path)) {
    router.replace('/campaigns')
  }
}

function logout() {
  clearAuthToken()
  clearAuthenticatedUsername()
  isAuthenticated.value = false
  router.replace('/login')
}

function handleUnauthorized() {
  isAuthenticated.value = false
}

function redirectAuthenticatedLogin() {
  if (isAuthenticated.value && route.path === '/login') {
    router.replace('/campaigns')
  }
}

onMounted(() => {
  window.addEventListener('auth:unauthorized', handleUnauthorized)
  redirectAuthenticatedLogin()
})

onBeforeUnmount(() => {
  window.removeEventListener('auth:unauthorized', handleUnauthorized)
})

watch(() => route.path, redirectAuthenticatedLogin)
</script>

<template>
  <RouterView v-if="isAuthenticated" @logout="logout" />
  <LoginPage v-else @authenticated="authenticate" />
</template>
