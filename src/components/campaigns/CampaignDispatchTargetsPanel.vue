<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RefreshCw, Save, Trash2 } from '@lucide/vue'
import type { CampaignDto } from '@/dtos/campaign.dto'
import {
  dispatchRequest,
  getDispatchApiErrorMessage,
  type DispatchCadenceConfig,
  type DispatchCategory,
  type DispatchGroup,
  type DispatchInstance,
  type DispatchTarget,
  type UpsertDispatchCategoryPayload,
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
const categories = ref<DispatchCategory[]>([])
const cadenceConfig = ref<DispatchCadenceConfig | null>(null)
const selectedInstanceId = ref('')
const selectedGroupJid = ref('')
const groupSearch = ref('')
const priority = ref(100)
const active = ref(true)
const loading = ref(false)
const busyAction = ref('')
const showCategoryModal = ref(false)
const editingCategoryId = ref('')
const aliasInput = ref('')
const categoryForm = ref({
  name: '',
  aliases: [] as string[],
  maxPerWindow: 1,
  windowMinutes: 60,
  active: true,
})

const campaignTargets = computed(() =>
  targets.value
    .filter((target) => target.campaignId === props.campaign.id)
    .sort((a, b) => a.priority - b.priority),
)

const activeTarget = computed(() => campaignTargets.value.find((target) => target.active) ?? campaignTargets.value[0] ?? null)

const selectedGroup = computed(() => groups.value.find((group) => group.jid === selectedGroupJid.value) ?? null)

const activeCategories = computed(() =>
  categories.value
    .sort((a, b) => a.name.localeCompare(b.name)),
)

const categoryModalTitle = computed(() => (editingCategoryId.value ? 'Editar cluster' : 'Novo cluster'))

const targetGroupLabel = computed(() => {
  if (!activeTarget.value) return ''
  const group = groups.value.find((item) => item.jid === activeTarget.value?.groupJid)
  return group?.subject || activeTarget.value.groupJid
})

const selectedTarget = computed(() =>
  campaignTargets.value.find(
    (target) => target.instanceId === selectedInstanceId.value && target.groupJid === selectedGroupJid.value,
  ) ?? null,
)

const canSave = computed(() => selectedInstanceId.value && selectedGroupJid.value && Number.isFinite(priority.value))

function groupsPath(instanceId: string, search?: string) {
  const query = search?.trim()
  const suffix = query ? `?search=${encodeURIComponent(query)}` : ''
  return `/api/admin/dispatch-targets/instances/${encodeURIComponent(instanceId)}/groups${suffix}`
}

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

function categoryPayload(): UpsertDispatchCategoryPayload {
  return {
    name: categoryForm.value.name.trim(),
    aliases: categoryForm.value.aliases.map((alias) => alias.trim()).filter(Boolean),
    maxPerWindow: Number(categoryForm.value.maxPerWindow),
    windowMinutes: Number(categoryForm.value.windowMinutes),
    active: categoryForm.value.active,
  }
}

function validateCategoryForm() {
  const payload = categoryPayload()
  const errors: string[] = []

  if (!payload.name) errors.push('Nome obrigatorio.')
  if (!payload.aliases.length) errors.push('Adicione pelo menos 1 alias.')
  if (!Number.isFinite(payload.maxPerWindow) || payload.maxPerWindow < 1) {
    errors.push('maxPerWindow deve ser maior ou igual a 1.')
  }
  if (!Number.isFinite(payload.windowMinutes) || payload.windowMinutes < 1) {
    errors.push('windowMinutes deve ser maior ou igual a 1.')
  }

  return errors
}

function resetCategoryForm() {
  editingCategoryId.value = ''
  aliasInput.value = ''
  categoryForm.value = {
    name: '',
    aliases: [],
    maxPerWindow: 1,
    windowMinutes: 60,
    active: true,
  }
}

function openCreateCategory() {
  resetCategoryForm()
  showCategoryModal.value = true
}

function editCategory(category: DispatchCategory) {
  editingCategoryId.value = category.id
  aliasInput.value = ''
  categoryForm.value = {
    name: category.name,
    aliases: [...category.aliases],
    maxPerWindow: category.maxPerWindow,
    windowMinutes: category.windowMinutes,
    active: category.active,
  }
  showCategoryModal.value = true
}

function closeCategoryModal() {
  showCategoryModal.value = false
  resetCategoryForm()
}

function addAlias() {
  const aliases = aliasInput.value
    .split(',')
    .map((alias) => alias.trim())
    .filter(Boolean)
  const uniqueAliases = aliases.filter((alias) => !categoryForm.value.aliases.includes(alias))

  if (!uniqueAliases.length) {
    aliasInput.value = ''
    return
  }

  categoryForm.value.aliases.push(...uniqueAliases)
  aliasInput.value = ''
}

function removeAlias(alias: string) {
  categoryForm.value.aliases = categoryForm.value.aliases.filter((item) => item !== alias)
}

function formatDateTime(value?: string) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
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

async function loadCategories() {
  categories.value = await dispatchRequest<DispatchCategory[]>('/api/admin/categories')
}

async function loadCadenceConfig() {
  cadenceConfig.value = await dispatchRequest<DispatchCadenceConfig>('/api/admin/dispatch-config/global')
}

async function loadGroups() {
  if (!selectedInstanceId.value) {
    groups.value = []
    selectedGroupJid.value = ''
    return
  }

  groups.value = await dispatchRequest<DispatchGroup[]>(groupsPath(selectedInstanceId.value, groupSearch.value))

  if (selectedGroupJid.value && !groups.value.some((group) => group.jid === selectedGroupJid.value)) {
    selectedGroupJid.value = ''
  }
}

async function refreshPanel() {
  await withBusy('refresh', async () => {
    await Promise.all([loadInstances(), loadTargets(), loadCategories(), loadCadenceConfig()])
    if (selectedInstanceId.value) await loadGroups()
  })
}

async function changeInstance() {
  selectedGroupJid.value = ''
  groupSearch.value = ''
  groups.value = []
  await withBusy('groups', loadGroups)
}

async function searchGroups() {
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

async function saveCategory() {
  if (aliasInput.value.trim()) addAlias()

  const errors = validateCategoryForm()
  if (errors.length) {
    emit('notify', 'warning', 'Cluster incompleto', errors.join('\n'))
    return
  }

  await withBusy('category-save', async () => {
    const path = editingCategoryId.value
      ? `/api/admin/categories/${encodeURIComponent(editingCategoryId.value)}`
      : '/api/admin/categories'

    await dispatchRequest<DispatchCategory>(path, {
      method: editingCategoryId.value ? 'PATCH' : 'POST',
      body: categoryPayload(),
    })
    await loadCategories()
    closeCategoryModal()
    emit('notify', 'success', 'Cluster salvo', 'As regras globais de categoria foram atualizadas.')
  })
}

async function toggleCategory(category: DispatchCategory) {
  await withBusy(`category:${category.id}`, async () => {
    await dispatchRequest<DispatchCategory>(`/api/admin/categories/${encodeURIComponent(category.id)}`, {
      method: 'PATCH',
      body: {
        name: category.name,
        aliases: category.aliases,
        maxPerWindow: category.maxPerWindow,
        windowMinutes: category.windowMinutes,
        active: !category.active,
      },
    })
    await loadCategories()
    emit('notify', 'success', category.active ? 'Cluster desativado' : 'Cluster ativado', category.name)
  })
}

async function deleteCategory(category: DispatchCategory) {
  if (!window.confirm(`Excluir o cluster ${category.name}?`)) return

  await withBusy(`category-delete:${category.id}`, async () => {
    await dispatchRequest<unknown>(`/api/admin/categories/${encodeURIComponent(category.id)}`, {
      method: 'DELETE',
    })
    await loadCategories()
    emit('notify', 'success', 'Cluster excluido', category.name)
  })
}

async function toggleRankEnabled() {
  if (!cadenceConfig.value?.id) {
    emit('notify', 'warning', 'Configuracao ausente', 'Carregue a configuracao global do dispatch-service.')
    return
  }

  const nextRankEnabled = !cadenceConfig.value.rankEnabled

  await withBusy('rank-toggle', async () => {
    cadenceConfig.value = await dispatchRequest<DispatchCadenceConfig>(
      `/api/admin/dispatch-config/${encodeURIComponent(cadenceConfig.value!.id)}`,
      {
        method: 'PATCH',
        body: { rankEnabled: nextRankEnabled },
      },
    )
    emit(
      'notify',
      'success',
      nextRankEnabled ? 'Filtro de clusters ativado' : 'Filtro de clusters desativado',
      nextRankEnabled
        ? 'O dispatch-service passara a limitar envios por cluster.'
        : 'Os clusters continuam cadastrados, mas nao afetam os disparos.',
    )
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
            Buscar grupo
            <input
              v-model="groupSearch"
              :disabled="loading || !selectedInstanceId"
              placeholder="Nome do grupo ou JID"
              @keydown.enter.prevent="searchGroups"
            />
          </label>
          <label>
            Grupo
            <select v-model="selectedGroupJid" :disabled="loading || !selectedInstanceId">
              <option value="">Selecione</option>
              <option v-for="group in groups" :key="group.jid" :value="group.jid">
                {{ group.subject || group.jid }} - {{ group.participantCount ?? '-' }} participantes
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
          <button class="secondary-button" type="button" :disabled="loading || !selectedInstanceId" @click="searchGroups">
            Buscar grupos
          </button>
          <button class="primary-button" :disabled="loading || !canSave" @click="saveTarget">
            <Save :size="14" /> Salvar grupo
          </button>
        </div>
        <div v-if="selectedInstanceId && !groups.length && !loading" class="empty-state dispatch-empty">
          Nenhum grupo encontrado para esta busca.
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="workspace-panel-heading">
        <div>
          <h2>Clusters de produtos</h2>
          <p>
            Clusters sao regras globais de categoria. Esta campanha sera afetada por elas ao enviar para o grupo configurado em Grupos de envio.
          </p>
        </div>
        <div class="resource-actions">
          <span :class="['badge', cadenceConfig?.rankEnabled ? 'good' : 'warn']">
            filtro {{ cadenceConfig?.rankEnabled ? 'ativo' : 'inativo' }}
          </span>
          <button
            :class="['secondary-button', { 'danger-action': cadenceConfig?.rankEnabled }]"
            :disabled="loading || !cadenceConfig?.id"
            @click="toggleRankEnabled"
          >
            {{ cadenceConfig?.rankEnabled ? 'Desativar filtro' : 'Ativar filtro' }}
          </button>
          <button class="primary-button" :disabled="loading" @click="openCreateCategory">Novo cluster</button>
        </div>
      </div>

      <div v-if="!cadenceConfig?.rankEnabled" class="alert warn-alert">
        O filtro de clusters esta desativado. Os clusters podem ser cadastrados, mas nao afetam os disparos ate que o filtro seja ativado.
      </div>

      <div v-if="!activeTarget" class="alert warn-alert">
        Configure um grupo de envio para esta campanha antes de validar o efeito dos clusters.
      </div>
      <div v-else class="alert warn-alert">
        Esta campanha envia para o grupo {{ targetGroupLabel }}. Se outra campanha usa o mesmo grupo, ela compartilha os mesmos limites de cluster.
      </div>

      <div class="management-table">
        <div class="management-row campaign-clusters-row table-head">
          <span>Categoria</span>
          <span>Aliases</span>
          <span>Limite</span>
          <span>Status</span>
          <span>Atualizado</span>
          <span>Acoes</span>
        </div>
        <div v-if="!activeCategories.length" class="empty-state dispatch-empty">
          Nenhum cluster cadastrado.
        </div>
        <div v-for="category in activeCategories" :key="category.id" class="management-row campaign-clusters-row">
          <strong>{{ category.name }}</strong>
          <span class="chip-list">
            <small v-for="alias in category.aliases" :key="alias">{{ alias }}</small>
            <small v-if="!category.aliases.length" class="fallback-note">sem alias</small>
          </span>
          <span>{{ category.maxPerWindow }} a cada {{ category.windowMinutes }}min</span>
          <span :class="['badge', category.active ? 'good' : 'bad']">{{ category.active ? 'ativo' : 'inativo' }}</span>
          <span>{{ formatDateTime(category.updatedAt) }}</span>
          <span class="dispatch-actions">
            <button class="secondary-button" :disabled="loading" @click="editCategory(category)">Editar</button>
            <button class="secondary-button" :disabled="loading" @click="toggleCategory(category)">
              {{ category.active ? 'Desativar' : 'Ativar' }}
            </button>
            <button class="secondary-button danger-action" :disabled="loading" @click="deleteCategory(category)">
              <Trash2 :size="13" /> Excluir
            </button>
          </span>
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

    <div v-if="showCategoryModal" class="modal-backdrop" @click.self="closeCategoryModal">
      <section class="modal create-campaign-modal">
        <div class="workspace-panel-heading">
          <div>
            <h2>{{ categoryModalTitle }}</h2>
            <p>Clusters controlam quantos produtos semelhantes podem sair por grupo em uma janela.</p>
          </div>
          <button class="icon-button" aria-label="Fechar modal" @click="closeCategoryModal">x</button>
        </div>

        <div class="form-grid">
          <label>
            Nome
            <input v-model="categoryForm.name" placeholder="tenis" />
          </label>
          <label>
            maxPerWindow
            <input v-model.number="categoryForm.maxPerWindow" min="1" step="1" type="number" />
          </label>
          <label>
            windowMinutes
            <input v-model.number="categoryForm.windowMinutes" min="1" step="1" type="number" />
          </label>
        </div>

        <label class="wide-field">
          Aliases
          <div class="action-row">
            <input
              v-model="aliasInput"
              placeholder="tenis, tênis, sneaker, corrida"
              @keydown.enter.prevent="addAlias"
            />
            <button class="secondary-button" type="button" @click="addAlias">Adicionar</button>
          </div>
        </label>

        <div class="chip-list">
          <small v-for="alias in categoryForm.aliases" :key="alias">
            {{ alias }}
            <button type="button" @click="removeAlias(alias)">x</button>
          </small>
        </div>

        <div class="dispatch-checks">
          <label><input v-model="categoryForm.active" type="checkbox" /> Ativo</label>
        </div>

        <div class="action-row">
          <button class="secondary-button" type="button" @click="closeCategoryModal">Cancelar</button>
          <button class="primary-button" :disabled="loading" type="button" @click="saveCategory">
            <Save :size="14" /> Salvar cluster
          </button>
        </div>
      </section>
    </div>
  </section>
</template>
