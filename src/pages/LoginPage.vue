<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from '@lucide/vue'
import { getApiErrorMessage } from '@/services/apiClient'
import { login } from '@/services/auth.service'

const emit = defineEmits<{
  authenticated: []
}>()

const username = ref('')
const password = ref('')
const rememberSession = ref(true)
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const canSubmit = computed(() => username.value.trim().length > 0 && password.value.length > 0 && !loading.value)

async function submitLogin() {
  if (!canSubmit.value) return

  loading.value = true
  errorMessage.value = ''

  try {
    await login(username.value.trim(), password.value, rememberSession.value)
    emit('authenticated')
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-shell">
    <section class="login-branding" aria-label="Campaign Ops">
      <div class="login-terminal-bar">
        <code>&gt; campaign-ops v2.4.1</code>
        <span>secure login</span>
      </div>

      <div class="login-branding-content">
        <p class="login-kicker">Operations Console</p>
        <h1>Campaign Ops</h1>
        <h2>Operations Platform</h2>
        <p>
          Gerencie campanhas, execucoes, automacao e monitoramento em uma unica plataforma.
        </p>

        <div class="login-metrics" aria-label="Operational status">
          <div>
            <span>Environment</span>
            <strong>Production</strong>
          </div>
          <div>
            <span>Services</span>
            <strong>24 Services</strong>
          </div>
          <div>
            <span>Availability</span>
            <strong>99.98% Uptime</strong>
          </div>
        </div>
      </div>

      <div class="login-protected-status">
        <ShieldCheck :size="22" />
        <div>
          <strong>Acesso protegido</strong>
          <span>Todos os acessos sao monitorados e registrados.</span>
        </div>
        <div class="login-signal" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </section>

    <aside class="login-auth-panel">
      <form class="login-form" aria-labelledby="login-title" @submit.prevent="submitLogin">
        <div class="login-heading">
          <p>Campaign Ops</p>
          <h2 id="login-title">Sign in</h2>
        </div>

        <label>
          <span>Usuario</span>
          <span class="login-input">
            <UserRound :size="16" />
            <input
              v-model="username"
              autocomplete="username"
              name="username"
              placeholder="Username"
              type="text"
            />
          </span>
        </label>

        <label>
          <span>Senha</span>
          <span class="login-input">
            <LockKeyhole :size="16" />
            <input
              v-model="password"
              autocomplete="current-password"
              name="password"
              placeholder="Password"
              :type="showPassword ? 'text' : 'password'"
            />
            <button
              class="login-password-toggle"
              type="button"
              :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" :size="16" />
              <Eye v-else :size="16" />
            </button>
          </span>
        </label>

        <label class="login-checkbox">
          <input v-model="rememberSession" type="checkbox" />
          <span>Remember me</span>
        </label>

        <div v-if="errorMessage" class="alert bad-alert">{{ errorMessage }}</div>

        <button class="primary-button login-button" :disabled="!canSubmit" type="submit">
          <ArrowRight :size="16" />
          <span>{{ loading ? 'Signing in...' : 'Entrar' }}</span>
        </button>
      </form>
    </aside>
  </main>
</template>
