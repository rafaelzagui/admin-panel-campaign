<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import CampaignAuditPanel from '@/components/campaigns/CampaignAuditPanel.vue'
import CampaignContextPanel from '@/components/campaigns/CampaignContextPanel.vue'
import CampaignDetailsForm from '@/components/campaigns/CampaignDetailsForm.vue'
import CampaignDispatchTargetsPanel from '@/components/campaigns/CampaignDispatchTargetsPanel.vue'
import CampaignOperationalPanel from '@/components/campaigns/CampaignOperationalPanel.vue'
import CampaignRulesPanel from '@/components/campaigns/CampaignRulesPanel.vue'
import CampaignWorkspaceTabs from '@/components/campaigns/CampaignWorkspaceTabs.vue'
import CreateCampaignModal from '@/components/campaigns/CreateCampaignModal.vue'
import LinkedEntityPanel from '@/components/campaigns/LinkedEntityPanel.vue'
import StatusIndicator from '@/components/ui/StatusIndicator.vue'
import ToastContainer, { type ToastItem } from '@/components/ui/ToastContainer.vue'
import { validateCampaignReadiness } from '@/domain/campaignReadiness'
import type { CreateCampaignPayload } from '@/dtos/campaign-api.dto'
import type { CampaignDto } from '@/dtos/campaign.dto'
import type { CampaignWorkspaceTab } from '@/dtos/campaignTabs.dto'
import type { AdminView } from '@/dtos/navigation.dto'
import AudiencesPage from '@/pages/AudiencesPage.vue'
import DispatchServicePage from '@/pages/DispatchServicePage.vue'
import ExecutionsPage from '@/pages/ExecutionsPage.vue'
import RulesPage from '@/pages/RulesPage.vue'
import TemplatesPage from '@/pages/TemplatesPage.vue'
import { getApiErrorMessage } from '@/services/apiClient'
import { useCampaignService } from '@/services/campaign.service'

defineEmits<{
  logout: []
}>()

const route = useRoute()
const router = useRouter()
const {
  state,
  loadCampaigns,
  loadCampaignDetail,
  createCampaign: requestCreateCampaign,
  updateCampaign,
  activateCampaign: requestActivateCampaign,
  pauseCampaign: requestPauseCampaign,
  createExecution: requestExecution,
} = useCampaignService()

const routeCampaignId = computed(() => {
  return typeof route.params.campaignId === 'string' ? route.params.campaignId : ''
})
const selectedId = ref(routeCampaignId.value || state.campaigns[0]?.id || '')
const sidebarCollapsed = ref(false)
const showCreateCampaign = ref(false)
const toasts = ref<ToastItem[]>([])
let toastId = 0

const campaignTabs: CampaignWorkspaceTab[] = ['configuration', 'rules', 'audiences', 'templates', 'dispatch-targets', 'executions']
const resourceViews: AdminView[] = ['rules', 'audiences', 'templates', 'executions', 'dispatch']
const activeView = computed<AdminView>(() => {
  return resourceViews.includes(route.name as AdminView) ? (route.name as AdminView) : 'campaigns'
})
const campaignMode = computed<'list' | 'detail'>(() => (route.name === 'campaign-detail' ? 'detail' : 'list'))
const activeCampaignTab = computed<CampaignWorkspaceTab>(() => {
  const tab = typeof route.params.tab === 'string' ? route.params.tab : 'configuration'
  return campaignTabs.includes(tab as CampaignWorkspaceTab) ? (tab as CampaignWorkspaceTab) : 'configuration'
})

const selectedCampaign = computed<CampaignDto>(() => {
  return state.campaigns.find((campaign) => campaign.id === selectedId.value) ?? state.campaigns[0]!
})

const selectedRules = computed(() =>
  state.rules
    .filter((rule) => rule.campaignId === selectedCampaign.value.id)
    .sort((a, b) => a.priority - b.priority),
)
const selectedAudiences = computed(() =>
  state.audiences.filter((audience) => audience.campaignId === selectedCampaign.value.id),
)
const selectedTemplates = computed(() =>
  state.templates.filter((template) => template.campaignId === selectedCampaign.value.id),
)
const selectedAuditEvents = computed(() =>
  state.auditEvents.filter((event) => event.campaignId === selectedCampaign.value.id),
)
const activeRuleCount = computed(() => selectedRules.value.filter((rule) => rule.status === 'ACTIVE').length)
const activeAudienceCount = computed(
  () => selectedAudiences.value.filter((audience) => audience.status === 'ACTIVE').length,
)
const activeTemplateCount = computed(
  () => selectedTemplates.value.filter((template) => template.status === 'ACTIVE').length,
)

const readinessIssues = computed(() => validateCampaignReadiness(selectedCampaign.value, state))
const isReady = computed(() => readinessIssues.value.length === 0)
const pageTitle = computed(() => {
  if (activeView.value === 'campaigns') {
    return campaignMode.value === 'detail' ? selectedCampaign.value.name : 'Campanhas'
  }

  return {
    campaigns: 'Campanhas',
    rules: 'Regras de campanha',
    audiences: 'Audiencias',
    templates: 'Templates',
    executions: 'Execucoes',
    dispatch: 'Dispatch Service',
  }[activeView.value]
})

function showToast(type: ToastItem['type'], title: string, message: string) {
  const id = ++toastId
  toasts.value.push({ id, type, title, message })
  window.setTimeout(() => dismissToast(id), type === 'error' ? 7000 : 4200)
}

function dismissToast(id: number) {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

function showApiError(title: string, error: unknown) {
  showToast('error', title, getApiErrorMessage(error))
}

async function saveCampaign() {
  try {
    const updated = await updateCampaign(selectedCampaign.value)
    selectedId.value = updated.id
    showToast('success', 'Campanha salva', 'Alteracoes persistidas no campaign-service.')
  } catch (error) {
    showApiError('Erro ao salvar', error)
  }
}

async function openCampaign(campaignId: string) {
  selectedId.value = campaignId
  await router.push({
    name: 'campaign-detail',
    params: { campaignId, tab: 'configuration' },
  })

  if (!state.usingMock) {
    await loadCampaignDetail(campaignId).catch((error) => {
      showApiError('Erro ao carregar campanha', error)
    })
  }
}

async function createCampaign(payload: CreateCampaignPayload) {
  try {
    const created = await requestCreateCampaign(payload)
    showCreateCampaign.value = false
    showToast('success', 'Campanha criada', 'A campanha nasceu como DRAFT no campaign-service.')
    await openCampaign(created.id)
  } catch (error) {
    showApiError('Erro ao criar campanha', error)
  }
}

function backToCampaigns() {
  router.push({ name: 'campaigns' })
}

function navigateTo(view: AdminView) {
  router.push({ name: view })
}

function changeCampaignTab(tab: CampaignWorkspaceTab) {
  router.push({
    name: 'campaign-detail',
    params: { campaignId: selectedCampaign.value.id, tab },
  })
}

async function activateCampaign() {
  if (!isReady.value) {
    showToast('warning', 'Campanha incompleta', readinessIssues.value.join('\n'))
    return
  }

  const campaign = selectedCampaign.value

  if (campaign.endsAt && new Date(campaign.endsAt) < new Date()) {
    showToast('warning', 'Janela expirada', 'A campanha esta fora da janela de execucao configurada.')
    return
  }

  try {
    const updated = await requestActivateCampaign(campaign.id)
    selectedId.value = updated.id
    showToast('success', 'Campanha ativada', 'O campaign-service marcou a campanha como apta.')
  } catch (error) {
    showApiError('Erro ao ativar', error)
  }
}

async function pauseCampaign() {
  if (selectedCampaign.value.status !== 'ACTIVE') return

  try {
    const updated = await requestPauseCampaign(selectedCampaign.value.id)
    selectedId.value = updated.id
    showToast('success', 'Campanha pausada', 'A campanha foi pausada no campaign-service.')
  } catch (error) {
    showApiError('Erro ao pausar', error)
  }
}

async function createExecution() {
  const campaign = selectedCampaign.value

  if (!['ACTIVE', 'SCHEDULED'].includes(campaign.status)) {
    showToast('warning', 'Execucao bloqueada', 'Somente campanhas ativas ou agendadas podem criar execucao.')
    return
  }

  if (campaign.startsAt && new Date(campaign.startsAt) > new Date()) {
    showToast(
      'warning',
      'Fora da janela',
      'A execucao foi planejada para uma data futura. Confirme o agendamento antes de seguir.',
    )
    return
  }

  try {
    await requestExecution(campaign)
    showToast(
      'success',
      'Execucao criada',
      'O campaign-service aceitou a execucao manual. O envio final continua no dispatch-service.',
    )
  } catch (error) {
    showApiError('Erro ao criar execucao', error)
  }
}

onMounted(async () => {
  await loadCampaigns()
  selectedId.value = routeCampaignId.value || state.campaigns[0]?.id || selectedId.value
})

watch(
  routeCampaignId,
  async (campaignId) => {
    if (!campaignId) return
    selectedId.value = campaignId

    if (!state.usingMock) {
      await loadCampaignDetail(campaignId).catch((error) => {
        showApiError('Erro ao carregar campanha', error)
      })
    }
  },
  { immediate: true },
)

watch(activeCampaignTab, (tab) => {
  if (route.name === 'campaign-detail' && route.params.tab !== tab) {
    router.replace({
      name: 'campaign-detail',
      params: { campaignId: selectedCampaign.value.id, tab },
    })
  }
})
</script>

<template>
  <div class="shell">
    <AppSidebar
      :active-view="activeView"
      :collapsed="sidebarCollapsed"
      @navigate="navigateTo"
      @toggle="sidebarCollapsed = !sidebarCollapsed"
    />

    <main class="workspace">
      <header class="topbar">
        <div class="topbar-title-group">
          <button
            v-if="activeView === 'campaigns' && campaignMode === 'detail'"
            class="back-button"
            @click="backToCampaigns"
          >
            Voltar
          </button>
          <div>
            <span class="breadcrumb">
              {{ activeView === 'dispatch' ? 'Dispatch Service' : campaignMode === 'detail' ? `Campaigns / ${selectedCampaign.slug}` : 'Campaigns' }}
            </span>
            <h1>{{ pageTitle }}</h1>
            <StatusIndicator
              v-if="activeView === 'campaigns' && campaignMode === 'detail'"
              :status="selectedCampaign.status"
            />
          </div>
        </div>
        <div v-if="activeView === 'campaigns' && campaignMode === 'detail'" class="topbar-actions">
          <label class="campaign-switcher">
            Campanha
            <select v-model="selectedId">
              <option v-for="campaign in state.campaigns" :key="campaign.id" :value="campaign.id">
                {{ campaign.name }} · {{ campaign.status }}
              </option>
            </select>
          </label>
          <button class="secondary-button" @click="saveCampaign">Salvar</button>
          <button class="secondary-button" @click="pauseCampaign">Pausar</button>
          <button class="secondary-button" @click="createExecution">Executar</button>
          <button class="primary-button" @click="activateCampaign">Ativar</button>
          <button class="secondary-button" @click="$emit('logout')">Sair</button>
        </div>
        <div v-else-if="activeView === 'campaigns'" class="topbar-actions">
          <button class="primary-button" @click="showCreateCampaign = true">Nova campanha</button>
          <button class="secondary-button" @click="$emit('logout')">Sair</button>
        </div>
        <div v-else class="topbar-actions">
          <button class="secondary-button" @click="$emit('logout')">Sair</button>
        </div>
      </header>

      <div v-if="state.loading" class="service-banner">Sincronizando com campaign-service...</div>
      <div v-else-if="state.usingMock" class="service-banner warn">
        API indisponivel. Exibindo dados locais de desenvolvimento.
      </div>

      <template v-if="activeView === 'campaigns'">
        <section v-if="campaignMode === 'list'" class="campaign-list-view">
          <div class="workspace-panel-heading">
            <div>
              <h2>Campanhas cadastradas</h2>
              <p>Selecione uma campanha para abrir a tela operacional de detalhe.</p>
            </div>
            <span class="badge info">{{ state.campaigns.length }} registros</span>
          </div>

          <div class="campaign-table">
            <div class="campaign-table-head">
              <span>Campanha</span>
              <span>Status</span>
              <span>Tipo</span>
              <span>Timezone</span>
              <span>Regras</span>
              <span>Audiencias</span>
              <span>Templates</span>
              <span>Execucao</span>
            </div>
            <button
              v-for="campaign in state.campaigns"
              :key="campaign.id"
              class="campaign-table-row"
              @click="openCampaign(campaign.id)"
            >
              <span>
                <strong>{{ campaign.name }}</strong>
                <small>{{ campaign.slug }}</small>
              </span>
              <StatusIndicator :status="campaign.status" />
              <span>{{ campaign.scheduleType }}</span>
              <span>{{ campaign.timezone || 'Nao definido' }}</span>
              <span>{{ campaign.rulesCount ?? 0 }}</span>
              <span>{{ campaign.audiencesCount ?? 0 }}</span>
              <span>{{ campaign.templatesCount ?? 0 }}</span>
              <span>{{ campaign.latestExecutionStatus || '-' }}</span>
            </button>
          </div>
        </section>

        <section v-else class="campaign-workspace">
          <CampaignContextPanel :campaign="selectedCampaign" />

          <section class="workspace-center">
            <CampaignWorkspaceTabs
              :active-tab="activeCampaignTab"
              @change="changeCampaignTab"
            />

            <CampaignDetailsForm
              v-if="activeCampaignTab === 'configuration'"
              :campaign="selectedCampaign"
              :is-ready="isReady"
              :readiness-issues="readinessIssues"
            />
            <CampaignRulesPanel v-else-if="activeCampaignTab === 'rules'" :rules="selectedRules" />
            <LinkedEntityPanel
              v-else-if="activeCampaignTab === 'audiences'"
              title="Audiencias"
              description="Segmentos associados a esta campanha."
              :items="selectedAudiences"
            />
            <LinkedEntityPanel
              v-else-if="activeCampaignTab === 'templates'"
              title="Templates"
              description="Templates ativos contam para prontidao operacional."
              :items="selectedTemplates"
            />
            <CampaignDispatchTargetsPanel
              v-else-if="activeCampaignTab === 'dispatch-targets'"
              :campaign="selectedCampaign"
              @notify="showToast"
            />
            <CampaignAuditPanel v-else :events="selectedAuditEvents" />
          </section>

          <CampaignOperationalPanel
            :active-audience-count="activeAudienceCount"
            :active-rule-count="activeRuleCount"
            :active-template-count="activeTemplateCount"
            :campaign="selectedCampaign"
            :events="selectedAuditEvents"
            :is-ready="isReady"
            :readiness-issues="readinessIssues"
          />
        </section>
      </template>

      <RulesPage v-else-if="activeView === 'rules'" @notify="showToast" />
      <AudiencesPage v-else-if="activeView === 'audiences'" @notify="showToast" />
      <TemplatesPage v-else-if="activeView === 'templates'" @notify="showToast" />
      <DispatchServicePage v-else-if="activeView === 'dispatch'" />
      <ExecutionsPage v-else />
    </main>

    <CreateCampaignModal
      v-if="showCreateCampaign"
      @close="showCreateCampaign = false"
      @create="createCampaign"
    />
    <ToastContainer :toasts="toasts" @dismiss="dismissToast" />
  </div>
</template>
