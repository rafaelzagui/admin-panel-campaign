<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RefreshCw, Save, Trash2 } from '@lucide/vue'
import type { CampaignDto } from '@/dtos/campaign.dto'
import {
  dispatchRequest,
  getDispatchApiErrorMessage,
  type DispatchGroup,
  type DispatchInstance,
  type DispatchTarget,
  type UpsertDispatchTargetPayload,
} from '@/services/dispatch.service'

const props = defineProps<{
  campaign: CampaignDto
}>()

const emit = defineEmits<{
  notify: [type: 'success' | 'warning' | 'error' | 'info', title: string, message: string]
}>()

const instances = ref<DispatchInstance[]>([])
const groups = ref<DispatchGroup[]>([])
const targets = ref<DispatchTarget[]>([])
const selectedInstanceId = ref('')
const selectedGroupJid = ref('')
const priority = ref(100)
const active = ref(true)
const loading = ref(false)
const busyAction = ref('')

const campaignTargets = computed(() =>
  targets.value
    .filter((target) => target.campaignId === props.campaign.id)
    .sort((a, b) => a.priority - b.priority),
)

const activeTarget = computed(() => campaignTargets.value.find((target) => target.active) ?? campaignTargets.value[0] ?? null)

const selectedGroup = computed(() => groups.value.find((group) => group.jid === selectedGroupJid.value) ?? null)

const selectedTarget = computed(() =>
  campaignTargets.value.find(
    (target) => target.instanceId === selectedInstanceId.value && target.groupJid === selectedGroupJid.value,
  ) ?? null,
)

const canSave = computed(() => selectedInstanceId.value && selectedGroupJid.value && Number.isFinite(priority.value))

function targetPayload(overrides: Partial<DispatchTarget> = {}): UpsertDispatchTargetPayload {
  return {
    niche: overrides.niche ?? props.campaign.slug ?? props.campaign.name,
    campaignId: props.campaign.id,
    instanceId: overrides.instanceId ?? selectedInstanceId.value,
    groupJid: overrides.groupJid ?? selectedGroupJid.value,
    priority: Number(overrides.priority ?? priority.value),
    active: overrides.active ?? active.value,
    exclusive: overrides.exclusive ?? false,
    matchRules: overrides.matchRules ?? {},
  }
}

async function withBusy(action: string, task: () => Promise<void>) {
  loading.value = true
  busyAction.value = action

  try {
    await task()
  } catch (error) {
    emit('notify', 'error', 'Erro no dispatch-service', getDispatchApiErrorMessage(error))
  } finally {
    loading.value = false
    busyAction.value = ''
  }
}

function applyTarget(target: DispatchTarget | null) {
  selectedInstanceId.value = target?.instanceId ?? ''
  selectedGroupJid.value = target?.groupJid ?? ''
  priority.value = target?.priority ?? 100
  active.value = target?.active ?? true
}

async function loadInstances() {
  instances.value = await dispatchRequest<DispatchInstance[]>('/api/admin/dispatch-targets/instances')
}

async function loadTargets() {
  targets.value = await dispatchRequest<DispatchTarget[]>('/api/admin/dispatch-targets')
  applyTarget(activeTarget.value)
}

async function loadGroups() {
  if (!selectedInstanceId.value) {
    groups.value = []
    selectedGroupJid.value = ''
    return
  }

  groups.value = await dispatchRequest<DispatchGroup[]>(
    `/api/admin/dispatch-targets/instances/${encodeURIComponent(selectedInstanceId.value)}/groups`,
  )

  if (selectedGroupJid.value && !groups.value.some((group) => group.jid === selectedGroupJid.value)) {
    selectedGroupJid.value = ''
  }
}

async function refreshPanel() {
  await withBusy('refresh', async () => {
    await Promise.all([loadInstances(), loadTargets()])
    if (selectedInstanceId.value) await loadGroups()
  })
}

async function changeInstance() {
  selectedGroupJid.value = ''
  groups.value = []
  await withBusy('groups', loadGroups)
}

async function editTarget(target: DispatchTarget) {
  applyTarget(target)
  await withBusy(`groups:${target.id}`, loadGroups)
}

async function deactivateTarget(target: DispatchTarget) {
  await dispatchRequest<DispatchTarget>(`/api/admin/dispatch-targets/${encodeURIComponent(target.id)}`, {
    method: 'PATCH',
    body: targetPayload({ ...target, active: false }),
  })
}

async function saveTarget() {
  if (!canSave.value) {
    emit('notify', 'warning', 'Grupo incompleto', 'Selecione uma instancia e um grupo de envio.')
    return
  }

  await withBusy('save', async () => {
    const currentTarget = selectedTarget.value
    const previousTargets = campaignTargets.value.filter((target) => target.id !== currentTarget?.id && target.active)

    await Promise.all(previousTargets.map(deactivateTarget))

    const path = currentTarget
      ? `/api/admin/dispatch-targets/${encodeURIComponent(currentTarget.id)}`
      : '/api/admin/dispatch-targets'

    await dispatchRequest<DispatchTarget>(path, {
      method: currentTarget ? 'PATCH' : 'POST',
      body: targetPayload(currentTarget ?? {}),
    })

    await loadTargets()
    emit('notify', 'success', 'Grupo de envio salvo', 'O dispatch-service recebeu o target desta campanha.')
  })
}

async function removeTarget(target: DispatchTarget) {
  if (!window.confirm(`Remover o grupo ${target.groupJid} desta campanha?`)) return

  await withBusy(`delete:${target.id}`, async () => {
    await dispatchRequest<unknown>(`/api/admin/dispatch-targets/${encodeURIComponent(target.id)}`, {
      method: 'DELETE',
    })
    await loadTargets()
    if (selectedInstanceId.value) await loadGroups()
    emit('notify', 'success', 'Grupo removido', 'O target foi removido do dispatch-service.')
  })
}

watch(
  () => props.campaign.id,
  () => {
    groups.value = []
    void refreshPanel()
  },
)

onMounted(refreshPanel)
</script>

<template>
  <section class="panel-stack">
    <section class="panel">
      <div class="workspace-panel-heading">
        <div>
          <h2>Grupos de envio</h2>
          <p>Escolha o grupo WhatsApp que recebera os disparos desta campanha.</p>
        </div>
        <button class="secondary-button" :disabled="loading" @click="refreshPanel">
          <RefreshCw :size="14" /> Atualizar
        </button>
      </div>

      <div class="dispatch-form">
        <div class="form-grid">
          <label>
            Instancia
            <select v-model="selectedInstanceId" :disabled="loading" @change="changeInstance">
              <option value="">Selecione</option>
              <option v-for="instance in instances" :key="instance.id" :value="instance.id">
                {{ instance.instanceName || instance.id }}
              </option>
            </select>
          </label>
          <label>
            Grupo
            <select v-model="selectedGroupJid" :disabled="loading || !selectedInstanceId">
              <option value="">Selecione</option>
              <option v-for="group in groups" :key="group.jid" :value="group.jid">
                {{ group.subject || group.jid }}
              </option>
            </select>
          </label>
          <label>
            Prioridade
            <input v-model.number="priority" :disabled="loading" min="0" step="1" type="number" />
          </label>
        </div>

        <div class="dispatch-checks">
          <label><input v-model="active" :disabled="loading" type="checkbox" /> Ativo</label>
        </div>

        <div class="action-row">
          <span class="badge info">{{ campaignTargets.length }} target(s)</span>
          <span v-if="selectedGroup" class="badge good">{{ selectedGroup.participantCount ?? '-' }} participantes</span>
          <button class="primary-button" :disabled="loading || !canSave" @click="saveTarget">
            <Save :size="14" /> Salvar grupo
          </button>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="workspace-panel-heading">
        <div>
          <h2>Targets da campanha</h2>
          <p>Ao salvar um novo grupo, os outros targets ativos desta campanha sao desativados.</p>
        </div>
        <span v-if="busyAction" class="badge muted">{{ busyAction }}</span>
      </div>

      <div class="management-table">
        <div class="management-row campaign-target-row table-head">
          <span>Grupo</span>
          <span>Instancia</span>
          <span>Status</span>
          <span>Acoes</span>
        </div>
        <div v-if="!campaignTargets.length" class="empty-state dispatch-empty">
          Nenhum grupo de envio vinculado a esta campanha.
        </div>
        <div v-for="target in campaignTargets" :key="target.id" class="management-row campaign-target-row">
          <code>{{ target.groupJid }}</code>
          <code>{{ target.instanceId }}</code>
          <span class="dispatch-badges">
            <span class="badge info">p{{ target.priority }}</span>
            <span :class="['badge', target.active ? 'good' : 'bad']">{{ target.active ? 'ativo' : 'inativo' }}</span>
          </span>
          <span class="dispatch-actions">
            <button class="secondary-button" :disabled="loading" @click="editTarget(target)">
              Editar
            </button>
            <button class="secondary-button danger-action" :disabled="loading" @click="removeTarget(target)">
              <Trash2 :size="13" /> Remover
            </button>
          </span>
        </div>
      </div>
    </section>
  </section>
</template>
