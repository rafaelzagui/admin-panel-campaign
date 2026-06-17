<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Copy,
  KeyRound,
  MessageSquare,
  QrCode,
  RadioTower,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
} from '@lucide/vue'
import {
  dispatchApiBaseUrl,
  dispatchRequest,
  getDispatchApiErrorMessage,
  type CreateDispatchInstancePayload,
  type CreateGovernanceRulePayload,
  type DispatchCadenceConfig,
  type DispatchCategory,
  type DispatchConfigSummary,
  type DispatchDebugEntry,
  type DispatchGroup,
  type DispatchInstance,
  type DispatchTarget,
  type GovernanceRule,
  type UpdateDispatchCadenceConfigPayload,
  type UpsertDispatchCategoryPayload,
  type UpsertDispatchTargetPayload,
} from '@/services/dispatch.service'

const DEFAULT_EVENTS = 'MESSAGES_UPSERT, CONNECTION_UPDATE'
const DISPATCH_CADENCE_DEFAULTS: UpdateDispatchCadenceConfigPayload = {
  spacingMinMs: 3000,
  spacingMaxMs: 8000,
  limiterMax: 1,
  limiterDurationMs: 10000,
  rankEnabled: false,
}

const config = ref<DispatchConfigSummary | null>(null)
const instances = ref<DispatchInstance[]>([])
const groups = ref<DispatchGroup[]>([])
const rules = ref<GovernanceRule[]>([])
const dispatchTargets = ref<DispatchTarget[]>([])
const targetGroups = ref<DispatchGroup[]>([])
const categories = ref<DispatchCategory[]>([])
const dispatchCadenceConfig = ref<DispatchCadenceConfig | null>(null)
const selectedId = ref('')
const activePanel = ref<'overview' | 'instances' | 'connection' | 'webhook' | 'groups' | 'governance' | 'cadence' | 'targets' | 'categories' | 'debug'>('overview')
const loading = ref(false)
const busyAction = ref('')
const alert = ref<{ type: 'success' | 'warning' | 'error' | 'info'; message: string } | null>(null)
const debugEntry = ref<DispatchDebugEntry | null>(null)
const qrImage = ref('')
const search = ref('')
const groupsSearch = ref('')
const targetGroupSearch = ref('')
const cadenceSaved = ref(false)

const credentials = ref({
  username: '',
  password: '',
})

const createForm = ref({
  instanceName: '',
  id: '',
  webhookUrl: '',
  webhookEvents: DEFAULT_EVENTS,
  readMessages: false,
  readStatus: false,
  alwaysOnline: false,
  syncRecentHistory: true,
  webhookEnabled: true,
  webhookByEvents: true,
  webhookBase64: false,
})

const webhookForm = ref({
  webhookUrl: '',
  webhookEvents: DEFAULT_EVENTS,
  webhookEnabled: true,
  webhookByEvents: true,
  webhookBase64: false,
})

const governanceForm = ref({
  value: '',
  scopeType: 'group' as 'group' | 'contact',
  mode: 'allow' as 'allow' | 'block',
  direction: 'outbound' as 'inbound' | 'outbound',
  description: '',
})

const cadenceForm = ref<UpdateDispatchCadenceConfigPayload>({ ...DISPATCH_CADENCE_DEFAULTS })
const targetForm = ref({
  id: '',
  campaignId: '',
  niche: '',
  instanceId: '',
  groupJid: '',
  priority: 0,
  active: true,
  exclusive: false,
  titleAny: '',
  titleRegex: '',
  priceMin: '',
  priceMax: '',
})
const categoryForm = ref({
  id: '',
  name: '',
  aliases: '',
  maxPerWindow: 1,
  windowMinutes: 60,
  active: true,
})

const selectedInstance = computed(() => instances.value.find((instance) => instance.id === selectedId.value) ?? null)
const filteredInstances = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return instances.value

  return instances.value.filter((instance) =>
    [
      instance.id,
      instance.instanceName,
      instance.ownerJid,
      instance.lastState,
      instance.webhook?.url,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(term),
  )
})

const selectedStatusClass = computed(() => statusClass(selectedInstance.value?.lastState))
const canCallAdmin = computed(() => credentials.value.username.trim() && credentials.value.password)
const cadenceWindowSummary = computed(() => {
  const minSeconds = cadenceForm.value.spacingMinMs / 1000
  const maxSeconds = cadenceForm.value.spacingMaxMs / 1000
  return `${minSeconds.toLocaleString('pt-BR')}s - ${maxSeconds.toLocaleString('pt-BR')}s`
})
const targetFormTitle = computed(() => targetForm.value.id ? 'Editar target' : 'Criar target')
const categoryFormTitle = computed(() => categoryForm.value.id ? 'Editar categoria' : 'Criar categoria')

function showAlert(type: typeof alert.value extends infer T ? T extends { type: infer U } ? U : never : never, message: string) {
  alert.value = { type, message }
}

function clearAlert() {
  alert.value = null
}

function splitCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseTags(value: string) {
  return splitCsv(value.replace(/\n/g, ','))
}

function withSearchParam(path: string, searchValue: string) {
  const query = searchValue.trim()
  return query ? `${path}?search=${encodeURIComponent(query)}` : path
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === undefined || entry === null || entry === '') return false
      if (Array.isArray(entry)) return entry.length > 0
      if (typeof entry === 'object') return Object.keys(entry).length > 0
      return true
    }),
  ) as Partial<T>
}

function cadencePayload(): UpdateDispatchCadenceConfigPayload {
  return {
    spacingMinMs: Number(cadenceForm.value.spacingMinMs),
    spacingMaxMs: Number(cadenceForm.value.spacingMaxMs),
    limiterMax: Number(cadenceForm.value.limiterMax),
    limiterDurationMs: Number(cadenceForm.value.limiterDurationMs),
    rankEnabled: Boolean(cadenceForm.value.rankEnabled),
  }
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function targetPayload(): UpsertDispatchTargetPayload {
  const priceMin = parseOptionalNumber(targetForm.value.priceMin)
  const priceMax = parseOptionalNumber(targetForm.value.priceMax)
  const priceRange = priceMin !== null || priceMax !== null
    ? compact({
      min: priceMin,
      max: priceMax,
    })
    : undefined

  return {
    campaignId: targetForm.value.campaignId.trim() || null,
    niche: targetForm.value.niche.trim(),
    instanceId: targetForm.value.instanceId,
    groupJid: targetForm.value.groupJid,
    priority: Number(targetForm.value.priority),
    active: targetForm.value.active,
    exclusive: targetForm.value.exclusive,
    matchRules: compact({
      titleAny: parseTags(targetForm.value.titleAny),
      titleRegex: targetForm.value.titleRegex.trim(),
      priceRange,
    }),
  }
}

function validateTargetForm() {
  const payload = targetPayload()
  const errors: string[] = []
  const min = parseOptionalNumber(targetForm.value.priceMin)
  const max = parseOptionalNumber(targetForm.value.priceMax)

  if (!payload.instanceId) errors.push('instanceId e obrigatorio.')
  if (!payload.groupJid) errors.push('groupJid e obrigatorio.')
  if (!Number.isFinite(payload.priority) || payload.priority < 0) errors.push('priority deve ser maior ou igual a 0.')
  if (Number.isNaN(min) || Number.isNaN(max)) errors.push('priceRange min/max precisam ser numericos quando preenchidos.')

  return errors
}

function categoryPayload(): UpsertDispatchCategoryPayload {
  return {
    name: categoryForm.value.name.trim(),
    aliases: parseTags(categoryForm.value.aliases),
    maxPerWindow: Number(categoryForm.value.maxPerWindow),
    windowMinutes: Number(categoryForm.value.windowMinutes),
    active: categoryForm.value.active,
  }
}

function validateCategoryForm() {
  const payload = categoryPayload()
  const errors: string[] = []

  if (!payload.name) errors.push('name e obrigatorio.')
  if (!Number.isFinite(payload.maxPerWindow) || payload.maxPerWindow < 1) errors.push('maxPerWindow deve ser maior ou igual a 1.')
  if (!Number.isFinite(payload.windowMinutes) || payload.windowMinutes < 1) errors.push('windowMinutes deve ser maior ou igual a 1.')
  if (!payload.aliases.length) errors.push('Cadastre pelo menos 1 alias para a categoria classificar produtos.')

  return errors
}

function validateCadenceForm() {
  const payload = cadencePayload()
  const errors: string[] = []

  if (!Number.isFinite(payload.spacingMinMs) || payload.spacingMinMs < 0) {
    errors.push('spacingMinMs deve ser maior ou igual a 0.')
  }

  if (!Number.isFinite(payload.spacingMaxMs) || payload.spacingMaxMs < 0) {
    errors.push('spacingMaxMs deve ser maior ou igual a 0.')
  }

  if (Number.isFinite(payload.spacingMinMs) && Number.isFinite(payload.spacingMaxMs) && payload.spacingMaxMs < payload.spacingMinMs) {
    errors.push('spacingMaxMs deve ser maior ou igual a spacingMinMs.')
  }

  if (!Number.isFinite(payload.limiterMax) || payload.limiterMax < 1) {
    errors.push('limiterMax deve ser maior ou igual a 1.')
  }

  if (!Number.isFinite(payload.limiterDurationMs) || payload.limiterDurationMs < 1000) {
    errors.push('limiterDurationMs deve ser maior ou igual a 1000.')
  }

  return errors
}

function fillCadenceForm(nextConfig: DispatchCadenceConfig) {
  cadenceForm.value = {
    spacingMinMs: nextConfig.spacingMinMs,
    spacingMaxMs: nextConfig.spacingMaxMs,
    limiterMax: nextConfig.limiterMax,
    limiterDurationMs: nextConfig.limiterDurationMs,
    rankEnabled: Boolean(nextConfig.rankEnabled),
  }
}

function basicAuth() {
  return {
    username: credentials.value.username.trim(),
    password: credentials.value.password,
  }
}

function debug(entry: DispatchDebugEntry) {
  debugEntry.value = entry
}

function statusClass(status?: string | null) {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('open') || normalized.includes('connect')) return 'good'
  if (normalized.includes('close') || normalized.includes('disconnect') || normalized.includes('error')) return 'bad'
  if (normalized) return 'warn'
  return ''
}

function requireAdminCredentials() {
  if (canCallAdmin.value) return true
  showAlert('warning', 'Informe usuario e senha Basic Auth do dispatch-service antes de chamar as rotas admin.')
  activePanel.value = 'overview'
  return false
}

async function withBusy(action: string, task: () => Promise<void>) {
  busyAction.value = action
  loading.value = true
  clearAlert()

  try {
    await task()
  } catch (error) {
    showAlert('error', getDispatchApiErrorMessage(error))
  } finally {
    busyAction.value = ''
    loading.value = false
  }
}

async function loadConfig() {
  if (!requireAdminCredentials()) return

  await withBusy('config', async () => {
    config.value = await dispatchRequest<DispatchConfigSummary>('/admin/whatsmiau/config', {
      basicAuth: basicAuth(),
      onDebug: debug,
    })
    showAlert('success', 'Configuracao do dispatch-service carregada.')
  })
}

async function loadInstances() {
  if (!requireAdminCredentials()) return

  await withBusy('instances', async () => {
    instances.value = await dispatchRequest<DispatchInstance[]>('/admin/whatsmiau/instances', {
      basicAuth: basicAuth(),
      onDebug: debug,
    })
    if (selectedId.value && !selectedInstance.value) selectedId.value = ''
    showAlert('success', 'Instancias atualizadas.')
  })
}

async function refreshAll() {
  if (!requireAdminCredentials()) return

  await withBusy('all', async () => {
    const [nextConfig, nextInstances] = await Promise.all([
      dispatchRequest<DispatchConfigSummary>('/admin/whatsmiau/config', {
        basicAuth: basicAuth(),
        onDebug: debug,
      }),
      dispatchRequest<DispatchInstance[]>('/admin/whatsmiau/instances', {
        basicAuth: basicAuth(),
        onDebug: debug,
      }),
    ])
    config.value = nextConfig
    instances.value = nextInstances
    showAlert('success', 'Dispatch-service sincronizado.')
  })
}

async function healthCheck() {
  if (!requireAdminCredentials()) return

  await withBusy('health', async () => {
    await dispatchRequest<unknown>('/admin/whatsmiau/health', {
      basicAuth: basicAuth(),
      onDebug: debug,
    })
    showAlert('success', 'WhatsMiau respondeu via dispatch-service.')
  })
}

function selectInstance(instance: DispatchInstance) {
  selectedId.value = instance.id
  qrImage.value = ''
  fillWebhookForm(instance)
  showAlert('success', `Instancia selecionada: ${instance.instanceName || instance.id}`)
}

function fillWebhookForm(instance: DispatchInstance | null) {
  webhookForm.value = {
    webhookUrl: instance?.webhook?.url ?? '',
    webhookEvents: instance?.webhook?.events?.join(', ') || DEFAULT_EVENTS,
    webhookEnabled: instance?.webhook?.enabled ?? true,
    webhookByEvents: instance?.webhook?.byEvents ?? true,
    webhookBase64: Boolean(instance?.webhook?.base64),
  }
}

function readQr(payload: unknown) {
  const value = payload as Record<string, unknown>
  const data = value?.data as Record<string, unknown> | undefined
  return value?.base64 || value?.qrcode || value?.qrCode || data?.base64 || data?.qrcode || data?.qrCode || ''
}

function readState(payload: unknown) {
  const value = payload as Record<string, unknown>
  const data = value?.data as Record<string, unknown> | undefined
  const instance = value?.instance as Record<string, unknown> | undefined
  return String(value?.state || value?.status || value?.connectionStatus || data?.state || instance?.state || 'desconhecido')
}

async function requestStatus(instanceId = selectedId.value) {
  if (!requireAdminCredentials()) return
  if (!instanceId) return showAlert('warning', 'Selecione uma instancia primeiro.')

  await withBusy(`status:${instanceId}`, async () => {
    const payload = await dispatchRequest<unknown>(`/admin/whatsmiau/instances/${encodeURIComponent(instanceId)}/status`, {
      basicAuth: basicAuth(),
      onDebug: debug,
    })
    const nextState = readState(payload)
    instances.value = instances.value.map((instance) =>
      instance.id === instanceId ? { ...instance, lastState: nextState } : instance,
    )
    showAlert('success', `Status consultado: ${nextState}`)
  })
}

async function requestQr(instanceId = selectedId.value) {
  if (!requireAdminCredentials()) return
  if (!instanceId) return showAlert('warning', 'Selecione uma instancia primeiro.')

  await withBusy(`qr:${instanceId}`, async () => {
    const payload = await dispatchRequest<unknown>(`/admin/whatsmiau/instances/${encodeURIComponent(instanceId)}/qr`, {
      basicAuth: basicAuth(),
      onDebug: debug,
    })
    const qr = readQr(payload)
    qrImage.value = qr ? (String(qr).startsWith('data:image') ? String(qr) : `data:image/png;base64,${qr}`) : ''
    showAlert(qrImage.value ? 'success' : 'info', qrImage.value ? 'QR gerado.' : 'A resposta nao trouxe QR Code.')
  })
}

async function deleteInstance(instanceId = selectedId.value) {
  if (!requireAdminCredentials()) return
  if (!instanceId) return showAlert('warning', 'Selecione uma instancia primeiro.')
  if (!window.confirm(`Excluir a instancia ${instanceId}?`)) return

  await withBusy(`delete:${instanceId}`, async () => {
    await dispatchRequest<unknown>(`/admin/whatsmiau/instances/${encodeURIComponent(instanceId)}`, {
      method: 'DELETE',
      basicAuth: basicAuth(),
      onDebug: debug,
    })
    if (selectedId.value === instanceId) selectedId.value = ''
    await loadInstances()
    showAlert('success', 'Instancia removida.')
  })
}

async function createInstance() {
  if (!requireAdminCredentials()) return
  if (!createForm.value.instanceName.trim()) return showAlert('warning', 'Informe o nome da instancia.')

  await withBusy('create-instance', async () => {
    const webhook = compact({
      url: createForm.value.webhookUrl.trim(),
      events: splitCsv(createForm.value.webhookEvents),
      enabled: createForm.value.webhookEnabled,
      byEvents: createForm.value.webhookByEvents,
      base64: createForm.value.webhookBase64,
    })
    const payload: CreateDispatchInstancePayload = compact({
      instanceName: createForm.value.instanceName.trim(),
      id: createForm.value.id.trim(),
      readMessages: createForm.value.readMessages,
      readStatus: createForm.value.readStatus,
      alwaysOnline: createForm.value.alwaysOnline,
      syncRecentHistory: createForm.value.syncRecentHistory,
      webhook,
    }) as CreateDispatchInstancePayload

    await dispatchRequest<unknown>('/admin/whatsmiau/instances', {
      method: 'POST',
      body: payload,
      basicAuth: basicAuth(),
      onDebug: debug,
    })
    createForm.value.instanceName = ''
    createForm.value.id = ''
    await loadInstances()
    showAlert('success', 'Instancia criada.')
  })
}

async function saveWebhook() {
  if (!requireAdminCredentials()) return
  if (!selectedId.value) return showAlert('warning', 'Selecione uma instancia primeiro.')

  await withBusy('webhook', async () => {
    await dispatchRequest<unknown>(`/admin/whatsmiau/instances/${encodeURIComponent(selectedId.value)}/webhook`, {
      method: 'PUT',
      body: {
        webhook: compact({
          url: webhookForm.value.webhookUrl.trim(),
          events: splitCsv(webhookForm.value.webhookEvents),
          enabled: webhookForm.value.webhookEnabled,
          byEvents: webhookForm.value.webhookByEvents,
          base64: webhookForm.value.webhookBase64,
        }),
      },
      basicAuth: basicAuth(),
      onDebug: debug,
    })
    await loadInstances()
    showAlert('success', 'Webhook atualizado.')
  })
}

async function listGroups() {
  if (!requireAdminCredentials()) return
  if (!selectedId.value) return showAlert('warning', 'Selecione uma instancia primeiro.')

  await withBusy('groups', async () => {
    groups.value = await dispatchRequest<DispatchGroup[]>(
      withSearchParam(
        `/admin/whatsmiau/instances/${encodeURIComponent(selectedId.value)}/groups`,
        groupsSearch.value,
      ),
      {
        basicAuth: basicAuth(),
        onDebug: debug,
      },
    )
    showAlert('success', 'Grupos carregados.')
  })
}

async function listRules() {
  await withBusy('rules', async () => {
    rules.value = await dispatchRequest<GovernanceRule[]>('/api/admin/governance-rules', {
      onDebug: debug,
    })
    showAlert('success', 'Regras carregadas.')
  })
}

async function createRule() {
  if (!governanceForm.value.value.trim()) return showAlert('warning', 'Informe o destino da regra.')

  await withBusy('create-rule', async () => {
    const payload: CreateGovernanceRulePayload = compact({
      scopeType: governanceForm.value.scopeType,
      mode: governanceForm.value.mode,
      direction: governanceForm.value.direction,
      value: governanceForm.value.value.trim(),
      description: governanceForm.value.description.trim(),
      active: true,
    }) as CreateGovernanceRulePayload

    await dispatchRequest<GovernanceRule>('/api/admin/governance-rules', {
      method: 'POST',
      body: payload,
      onDebug: debug,
    })
    governanceForm.value.value = ''
    governanceForm.value.description = ''
    await listRules()
  })
}

async function loadDispatchCadenceConfig() {
  await withBusy('cadence-load', async () => {
    const nextConfig = await dispatchRequest<DispatchCadenceConfig>('/api/admin/dispatch-config/global', {
      onDebug: debug,
    })
    dispatchCadenceConfig.value = nextConfig
    fillCadenceForm(nextConfig)
    cadenceSaved.value = false
    showAlert('success', 'Configuracao de cadencia carregada.')
  })
}

async function saveDispatchCadenceConfig() {
  if (!dispatchCadenceConfig.value?.id) {
    return showAlert('warning', 'Carregue a configuracao antes de salvar.')
  }

  const errors = validateCadenceForm()
  if (errors.length) return showAlert('warning', errors.join('\n'))

  await withBusy('cadence-save', async () => {
    const nextConfig = await dispatchRequest<DispatchCadenceConfig>(
      `/api/admin/dispatch-config/${encodeURIComponent(dispatchCadenceConfig.value!.id)}`,
      {
        method: 'PATCH',
        body: cadencePayload(),
        onDebug: debug,
      },
    )
    dispatchCadenceConfig.value = nextConfig
    fillCadenceForm(nextConfig)
    cadenceSaved.value = true
    showAlert('success', 'Configuracao salva. Reinicie o dispatch-service para o consumer carregar os novos valores.')
  })
}

function resetCadenceDefaults() {
  cadenceForm.value = { ...DISPATCH_CADENCE_DEFAULTS }
  cadenceSaved.value = false
  showAlert('info', 'Defaults aplicados ao formulario. Clique em salvar para persistir.')
}

function useGroupInGovernance(group: DispatchGroup) {
  governanceForm.value.value = group.jid
  governanceForm.value.scopeType = 'group'
  governanceForm.value.mode = 'allow'
  governanceForm.value.direction = 'outbound'
  activePanel.value = 'governance'
  showAlert('success', 'JID aplicado ao formulario de governance.')
}

async function loadDispatchTargets() {
  await withBusy('targets-load', async () => {
    dispatchTargets.value = await dispatchRequest<DispatchTarget[]>('/api/admin/dispatch-targets', {
      onDebug: debug,
    })
    showAlert('success', 'Targets carregados.')
  })
}

async function loadTargetInstances() {
  await withBusy('target-instances', async () => {
    instances.value = await dispatchRequest<DispatchInstance[]>('/api/admin/dispatch-targets/instances', {
      onDebug: debug,
    })
    showAlert('success', 'Instancias para targets carregadas.')
  })
}

async function loadTargetGroups() {
  if (!targetForm.value.instanceId) {
    targetGroups.value = []
    targetForm.value.groupJid = ''
    return
  }

  await withBusy('target-groups', async () => {
    targetGroups.value = await dispatchRequest<DispatchGroup[]>(
      withSearchParam(
        `/api/admin/dispatch-targets/instances/${encodeURIComponent(targetForm.value.instanceId)}/groups`,
        targetGroupSearch.value,
      ),
      { onDebug: debug },
    )
    if (targetForm.value.groupJid && !targetGroups.value.some((group) => group.jid === targetForm.value.groupJid)) {
      targetForm.value.groupJid = ''
    }
    showAlert('success', 'Grupos da instancia carregados.')
  })
}

async function changeTargetInstance() {
  targetForm.value.groupJid = ''
  targetGroupSearch.value = ''
  targetGroups.value = []
  await loadTargetGroups()
}

function editDispatchTarget(target: DispatchTarget) {
  targetForm.value = {
    id: target.id,
    campaignId: target.campaignId ?? '',
    niche: target.niche ?? '',
    instanceId: target.instanceId,
    groupJid: target.groupJid,
    priority: target.priority ?? 0,
    active: target.active,
    exclusive: target.exclusive,
    titleAny: target.matchRules?.titleAny?.join(', ') ?? '',
    titleRegex: target.matchRules?.titleRegex ?? '',
    priceMin: target.matchRules?.priceRange?.min?.toString() ?? '',
    priceMax: target.matchRules?.priceRange?.max?.toString() ?? '',
  }
  targetGroupSearch.value = ''
  targetGroups.value = []
  void loadTargetGroups()
}

function resetTargetForm() {
  targetForm.value = {
    id: '',
    campaignId: '',
    niche: '',
    instanceId: '',
    groupJid: '',
    priority: 0,
    active: true,
    exclusive: false,
    titleAny: '',
    titleRegex: '',
    priceMin: '',
    priceMax: '',
  }
  targetGroupSearch.value = ''
  targetGroups.value = []
}

async function saveDispatchTarget() {
  const errors = validateTargetForm()
  if (errors.length) return showAlert('warning', errors.join('\n'))

  await withBusy('target-save', async () => {
    const path = targetForm.value.id
      ? `/api/admin/dispatch-targets/${encodeURIComponent(targetForm.value.id)}`
      : '/api/admin/dispatch-targets'
    const method = targetForm.value.id ? 'PATCH' : 'POST'

    await dispatchRequest<DispatchTarget>(path, {
      method,
      body: targetPayload(),
      onDebug: debug,
    })
    resetTargetForm()
    await loadDispatchTargets()
    showAlert('success', 'Target salvo.')
  })
}

async function deleteDispatchTarget(targetId: string) {
  if (!window.confirm(`Excluir o target ${targetId}?`)) return

  await withBusy(`target-delete:${targetId}`, async () => {
    await dispatchRequest<unknown>(`/api/admin/dispatch-targets/${encodeURIComponent(targetId)}`, {
      method: 'DELETE',
      onDebug: debug,
    })
    if (targetForm.value.id === targetId) resetTargetForm()
    await loadDispatchTargets()
    showAlert('success', 'Target excluido.')
  })
}

async function loadCategories() {
  await withBusy('categories-load', async () => {
    categories.value = await dispatchRequest<DispatchCategory[]>('/api/admin/categories', {
      onDebug: debug,
    })
    showAlert('success', 'Categorias carregadas.')
  })
}

function editCategory(category: DispatchCategory) {
  categoryForm.value = {
    id: category.id,
    name: category.name,
    aliases: category.aliases.join(', '),
    maxPerWindow: category.maxPerWindow,
    windowMinutes: category.windowMinutes,
    active: category.active,
  }
}

function resetCategoryForm() {
  categoryForm.value = {
    id: '',
    name: '',
    aliases: '',
    maxPerWindow: 1,
    windowMinutes: 60,
    active: true,
  }
}

async function saveCategory() {
  const errors = validateCategoryForm()
  if (errors.length) return showAlert('warning', errors.join('\n'))

  await withBusy('category-save', async () => {
    const path = categoryForm.value.id
      ? `/api/admin/categories/${encodeURIComponent(categoryForm.value.id)}`
      : '/api/admin/categories'
    const method = categoryForm.value.id ? 'PATCH' : 'POST'

    await dispatchRequest<DispatchCategory>(path, {
      method,
      body: categoryPayload(),
      onDebug: debug,
    })
    resetCategoryForm()
    await loadCategories()
    showAlert('success', 'Categoria salva.')
  })
}

async function deleteCategory(categoryId: string) {
  if (!window.confirm(`Excluir a categoria ${categoryId}?`)) return

  await withBusy(`category-delete:${categoryId}`, async () => {
    await dispatchRequest<unknown>(`/api/admin/categories/${encodeURIComponent(categoryId)}`, {
      method: 'DELETE',
      onDebug: debug,
    })
    if (categoryForm.value.id === categoryId) resetCategoryForm()
    await loadCategories()
    showAlert('success', 'Categoria excluida.')
  })
}

async function copy(value: string, message: string) {
  await navigator.clipboard.writeText(value)
  showAlert('success', message)
}
</script>

<template>
  <section class="dispatch-page">
    <div class="operation-strip dispatch-strip">
      <div>
        <span>Dispatch API</span>
        <strong>{{ dispatchApiBaseUrl() }}</strong>
      </div>
      <div>
        <span>Backend</span>
        <strong>{{ config?.isConfigured ? 'Configurado' : 'Pendente' }}</strong>
      </div>
      <div>
        <span>Instancias</span>
        <strong>{{ instances.length }}</strong>
      </div>
      <div>
        <span>Selecionada</span>
        <strong>{{ selectedInstance?.instanceName || selectedInstance?.id || '-' }}</strong>
      </div>
    </div>

    <div v-if="alert" :class="['alert', `${alert.type === 'error' ? 'bad' : alert.type === 'warning' ? 'warn' : 'ready'}-alert`]">
      {{ alert.message }}
    </div>

    <section class="dispatch-layout">
      <aside class="panel-stack">
        <section class="panel dispatch-auth-panel">
          <div class="panel-heading">
            <h2>Credenciais admin</h2>
            <KeyRound :size="15" />
          </div>
          <label>
            Usuario Basic Auth
            <input v-model="credentials.username" autocomplete="username" placeholder="ADMIN_UI_USERNAME" />
          </label>
          <label class="wide-field">
            Senha Basic Auth
            <input v-model="credentials.password" type="password" autocomplete="current-password" placeholder="ADMIN_UI_PASSWORD" />
          </label>
          <div class="action-row">
            <button class="secondary-button" :disabled="loading" @click="loadConfig">Config</button>
            <button class="primary-button" :disabled="loading" @click="refreshAll">Sincronizar</button>
          </div>
        </section>

        <section class="panel dispatch-menu-panel">
          <div class="panel-heading">
            <h2>Dispatch Service</h2>
            <RadioTower :size="15" />
          </div>
          <button
            v-for="panel in [
              ['overview', 'Visao geral'],
              ['instances', 'Instancias'],
              ['connection', 'Conexao / QR'],
              ['webhook', 'Webhook'],
              ['groups', 'Grupos'],
              ['governance', 'Governance'],
              ['cadence', 'Cadencia de mensagens'],
              ['targets', 'Dispatch targets'],
              ['categories', 'Categorias'],
              ['debug', 'Debug'],
            ]"
            :key="panel[0]"
            :class="['table-row', { selected: activePanel === panel[0] }]"
            @click="activePanel = panel[0] as typeof activePanel"
          >
            <span><strong>{{ panel[1] }}</strong><small>dispatch-service</small></span>
          </button>
        </section>
      </aside>

      <main class="workspace-center">
        <section v-if="activePanel === 'overview'" class="panel-stack">
          <div class="metrics">
            <div class="metric">
              <span>Config</span>
              <strong>{{ config?.isConfigured ? 'OK' : '-' }}</strong>
            </div>
            <div class="metric">
              <span>Base URL</span>
              <strong class="dispatch-metric-text">{{ config?.whatsMiauBaseUrl || '-' }}</strong>
            </div>
            <div class="metric">
              <span>Default instance</span>
              <strong class="dispatch-metric-text">{{ config?.defaultInstanceId || '-' }}</strong>
            </div>
            <div class="metric">
              <span>Provider</span>
              <strong>{{ busyAction === 'health' ? '...' : 'Teste' }}</strong>
            </div>
          </div>

          <section class="panel">
            <div class="workspace-panel-heading">
              <div>
                <h2>Resumo operacional</h2>
                <p>O front consome o dispatch-service sem expor a API key do WhatsMiau.</p>
              </div>
              <button class="primary-button" :disabled="loading" @click="healthCheck">
                Testar conexao
              </button>
            </div>
            <div class="context-list">
              <div>
                <dt>Rota config</dt>
                <dd>/api/admin/whatsmiau/config</dd>
              </div>
              <div>
                <dt>Rota instancias</dt>
                <dd>/api/admin/whatsmiau/instances</dd>
              </div>
              <div>
                <dt>Rota governance</dt>
                <dd>/api/governance/rules</dd>
              </div>
            </div>
          </section>
        </section>

        <section v-else-if="activePanel === 'instances'" class="panel-stack">
          <section class="panel">
            <div class="workspace-panel-heading">
              <div>
                <h2>Instancias WhatsMiau</h2>
                <p>Selecione uma instancia para status, QR, webhook e grupos.</p>
              </div>
              <button class="primary-button" :disabled="loading" @click="loadInstances">
                <RefreshCw :size="14" /> Atualizar
              </button>
            </div>
            <input v-model="search" placeholder="Buscar por nome, ID, owner ou status" />
            <div class="management-table wide-field">
              <div class="management-row dispatch-instance-row table-head">
                <span>Instancia</span>
                <span>Status</span>
                <span>Owner</span>
                <span>Webhook</span>
                <span>Acoes</span>
              </div>
              <div v-if="!filteredInstances.length" class="empty-state dispatch-empty">
                Nenhuma instancia carregada.
              </div>
              <div
                v-for="instance in filteredInstances"
                :key="instance.id"
                class="management-row dispatch-instance-row"
              >
                <span>
                  <strong>{{ instance.instanceName || instance.id }}</strong>
                  <code>{{ instance.id }}</code>
                </span>
                <StatusPill :status="instance.lastState || ''" />
                <code>{{ instance.ownerJid || '-' }}</code>
                <code>{{ instance.webhook?.url || '-' }}</code>
                <span class="dispatch-actions">
                  <button class="secondary-button" @click="selectInstance(instance)">Selecionar</button>
                  <button class="secondary-button" @click="requestStatus(instance.id)">Status</button>
                  <button class="secondary-button" @click="requestQr(instance.id)">QR</button>
                  <button class="secondary-button danger-action" @click="deleteInstance(instance.id)">Excluir</button>
                </span>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="workspace-panel-heading">
              <div>
                <h2>Criar instancia</h2>
                <p>Payload enviado para o proxy admin do dispatch-service.</p>
              </div>
            </div>
            <form class="dispatch-form" @submit.prevent="createInstance">
              <div class="form-grid">
                <label>
                  Nome da instancia
                  <input v-model="createForm.instanceName" required placeholder="numero-suporte" />
                </label>
                <label>
                  ID opcional
                  <input v-model="createForm.id" placeholder="uuid-ou-slug" />
                </label>
                <label>
                  Webhook URL
                  <input v-model="createForm.webhookUrl" placeholder="https://seu-backend/webhook" />
                </label>
                <label>
                  Eventos
                  <input v-model="createForm.webhookEvents" />
                </label>
              </div>
              <div class="dispatch-checks">
                <label><input v-model="createForm.readMessages" type="checkbox" /> Ler mensagens</label>
                <label><input v-model="createForm.readStatus" type="checkbox" /> Ler status</label>
                <label><input v-model="createForm.alwaysOnline" type="checkbox" /> Sempre online</label>
                <label><input v-model="createForm.syncRecentHistory" type="checkbox" /> Historico recente</label>
                <label><input v-model="createForm.webhookEnabled" type="checkbox" /> Webhook ativo</label>
                <label><input v-model="createForm.webhookByEvents" type="checkbox" /> Filtrar eventos</label>
                <label><input v-model="createForm.webhookBase64" type="checkbox" /> Base64</label>
              </div>
              <div class="action-row">
                <button class="primary-button" :disabled="loading">
                  Criar instancia
                </button>
              </div>
            </form>
          </section>
        </section>

        <section v-else-if="activePanel === 'connection'" class="panel-stack">
          <section class="panel">
            <div class="workspace-panel-heading">
              <div>
                <h2>Conexao / QR</h2>
                <p>{{ selectedInstance ? selectedInstance.id : 'Selecione uma instancia.' }}</p>
              </div>
              <StatusPill :status="selectedInstance?.lastState || ''" />
            </div>
            <div class="dispatch-action-bar">
              <button class="primary-button" :disabled="loading" @click="requestQr()"><QrCode :size="14" /> Gerar QR</button>
              <button class="secondary-button" :disabled="loading" @click="requestStatus()">Status</button>
              <button class="secondary-button" :disabled="!selectedInstance" @click="copy(selectedInstance?.id || '', 'ID copiado.')"><Copy :size="14" /> Copiar ID</button>
              <button class="secondary-button danger-action" :disabled="!selectedInstance || loading" @click="deleteInstance()">Excluir</button>
            </div>
            <div class="dispatch-qr">
              <img v-if="qrImage" :src="qrImage" alt="QR Code da instancia" />
              <span v-else>O QR Code aparece aqui depois da chamada.</span>
            </div>
          </section>
        </section>

        <section v-else-if="activePanel === 'webhook'" class="panel">
          <div class="workspace-panel-heading">
            <div>
              <h2>Webhook</h2>
              <p>{{ selectedInstance ? `Editando ${selectedInstance.id}` : 'Selecione uma instancia.' }}</p>
            </div>
            <Save :size="16" />
          </div>
          <form class="dispatch-form" @submit.prevent="saveWebhook">
            <div class="form-grid">
              <label>
                Webhook URL
                <input v-model="webhookForm.webhookUrl" placeholder="https://seu-backend/webhook" />
              </label>
              <label>
                Eventos
                <input v-model="webhookForm.webhookEvents" />
              </label>
            </div>
            <div class="dispatch-checks">
              <label><input v-model="webhookForm.webhookEnabled" type="checkbox" /> Habilitado</label>
              <label><input v-model="webhookForm.webhookByEvents" type="checkbox" /> Por eventos</label>
              <label><input v-model="webhookForm.webhookBase64" type="checkbox" /> Base64</label>
            </div>
            <div class="action-row">
              <button class="primary-button" :disabled="!selectedInstance || loading">Salvar webhook</button>
            </div>
          </form>
        </section>

        <section v-else-if="activePanel === 'groups'" class="panel">
          <div class="workspace-panel-heading">
            <div>
              <h2>Grupos</h2>
              <p>Liste grupos da instancia selecionada e envie JID para governance.</p>
            </div>
            <button class="primary-button" :disabled="!selectedInstance || loading" @click="listGroups">
              <MessageSquare :size="14" /> Listar grupos
            </button>
          </div>
          <div class="dispatch-form">
            <div class="form-grid">
              <label>
                Buscar grupo
                <input
                  v-model="groupsSearch"
                  :disabled="loading || !selectedId"
                  placeholder="Pesquisar grupo por nome ou JID"
                  @keydown.enter.prevent="listGroups"
                />
              </label>
            </div>
          </div>
          <div class="management-table">
            <div class="management-row dispatch-groups-row table-head">
              <span>Grupo</span>
              <span>JID</span>
              <span>Participantes</span>
              <span>Acoes</span>
            </div>
            <div v-if="!groups.length" class="empty-state dispatch-empty">
              {{ selectedId ? 'Nenhum grupo encontrado.' : 'Selecione uma instancia para buscar grupos.' }}
            </div>
            <div v-for="group in groups" :key="group.jid" class="management-row dispatch-groups-row">
              <strong>{{ group.subject || group.id }}</strong>
              <code>{{ group.jid }}</code>
              <span>{{ group.participantCount ?? '-' }}</span>
              <span class="dispatch-actions">
                <button class="secondary-button" @click="copy(group.jid, 'JID copiado.')">Copiar</button>
                <button class="primary-button" @click="useGroupInGovernance(group)">Usar em governance</button>
              </span>
            </div>
          </div>
        </section>

        <section v-else-if="activePanel === 'governance'" class="panel-stack">
          <section class="panel">
            <div class="workspace-panel-heading">
              <div>
                <h2>Governance</h2>
                <p>Regras allow/block para destinos outbound.</p>
              </div>
              <ShieldCheck :size="16" />
            </div>
            <form class="dispatch-form" @submit.prevent="createRule">
              <div class="form-grid">
                <label>
                  Destino
                  <input v-model="governanceForm.value" placeholder="grupo@g.us ou telefone" />
                </label>
                <label>
                  Tipo
                  <select v-model="governanceForm.scopeType">
                    <option value="group">Grupo</option>
                    <option value="contact">Contato</option>
                  </select>
                </label>
                <label>
                  Modo
                  <select v-model="governanceForm.mode">
                    <option value="allow">Allow</option>
                    <option value="block">Block</option>
                  </select>
                </label>
                <label>
                  Direcao
                  <select v-model="governanceForm.direction">
                    <option value="outbound">Outbound</option>
                    <option value="inbound">Inbound</option>
                  </select>
                </label>
                <label>
                  Descricao
                  <input v-model="governanceForm.description" placeholder="grupo oficial de ofertas" />
                </label>
              </div>
              <div class="action-row">
                <button class="secondary-button" type="button" :disabled="loading" @click="listRules">Listar regras</button>
                <button class="primary-button" :disabled="loading">Criar regra</button>
              </div>
            </form>
          </section>

          <section class="panel">
            <div class="management-table">
              <div class="management-row dispatch-rules-row table-head">
                <span>Modo</span>
                <span>Tipo</span>
                <span>Direcao</span>
                <span>Valor</span>
                <span>Instancia</span>
              </div>
              <div v-if="!rules.length" class="empty-state dispatch-empty">Nenhuma regra carregada.</div>
              <div v-for="rule in rules" :key="rule.id" class="management-row dispatch-rules-row">
                <span :class="['badge', rule.mode === 'allow' ? 'good' : 'bad']">{{ rule.mode }}</span>
                <span>{{ rule.scopeType }}</span>
                <span>{{ rule.direction || 'neutra' }}</span>
                <code>{{ rule.value }}</code>
                <code>{{ rule.instanceId || 'global' }}</code>
              </div>
            </div>
          </section>
        </section>

        <section v-else-if="activePanel === 'cadence'" class="panel-stack">
          <section class="panel">
            <div class="workspace-panel-heading">
              <div>
                <h2>Cadencia de mensagens</h2>
                <p>Delay e limiter usados pelo consumer do dispatch-service.</p>
              </div>
              <ShieldCheck :size="16" />
            </div>
            <form class="dispatch-form" @submit.prevent="saveDispatchCadenceConfig">
              <div class="action-row cadence-load-row">
                <button class="secondary-button" type="button" :disabled="loading" @click="loadDispatchCadenceConfig">
                  <RefreshCw :size="14" /> Carregar configuracao
                </button>
              </div>

              <div class="metrics cadence-metrics">
                <div class="metric">
                  <span>Config ID</span>
                  <strong class="dispatch-metric-text">{{ dispatchCadenceConfig?.id || '-' }}</strong>
                </div>
                <div class="metric">
                  <span>Delay</span>
                  <strong class="dispatch-metric-text">{{ cadenceWindowSummary }}</strong>
                </div>
                <div class="metric">
                  <span>Limiter</span>
                  <strong>{{ cadenceForm.limiterMax }}</strong>
                </div>
                <div class="metric">
                  <span>Janela</span>
                  <strong class="dispatch-metric-text">{{ cadenceForm.limiterDurationMs }}ms</strong>
                </div>
              </div>
              <div class="metrics cadence-metrics">
                <div class="metric">
                  <span>Dedup</span>
                  <strong class="dispatch-metric-text">{{ dispatchCadenceConfig?.dedupWindowHours ?? '-' }}h</strong>
                </div>
                <div class="metric">
                  <span>Price override</span>
                  <strong>{{ dispatchCadenceConfig?.priceDropOverride ? 'Sim' : '-' }}</strong>
                </div>
                <div class="metric">
                  <span>Min drop</span>
                  <strong class="dispatch-metric-text">{{ dispatchCadenceConfig?.minDropPercent ?? '-' }}%</strong>
                </div>
                <div class="metric">
                  <span>Atualizado</span>
                  <strong class="dispatch-metric-text">{{ dispatchCadenceConfig?.updatedAt || '-' }}</strong>
                </div>
                <div class="metric">
                  <span>Rank</span>
                  <strong>{{ cadenceForm.rankEnabled ? 'Ativo' : 'Inativo' }}</strong>
                </div>
              </div>

              <div class="form-grid">
                <label>
                  spacingMinMs
                  <input v-model.number="cadenceForm.spacingMinMs" type="number" min="0" step="1" />
                </label>
                <label>
                  spacingMaxMs
                  <input v-model.number="cadenceForm.spacingMaxMs" type="number" min="0" step="1" />
                </label>
                <label>
                  limiterMax
                  <input v-model.number="cadenceForm.limiterMax" type="number" min="1" step="1" />
                </label>
                <label>
                  limiterDurationMs
                  <input v-model.number="cadenceForm.limiterDurationMs" type="number" min="1000" step="1" />
                </label>
              </div>

              <div class="dispatch-checks">
                <label><input v-model="cadenceForm.rankEnabled" type="checkbox" /> Rank/categorias ativo</label>
              </div>

              <div v-if="cadenceSaved" class="alert warn-alert cadence-restart-alert">
                Configuracao salva. Reinicie o dispatch-service para o consumer carregar os novos valores.
              </div>

              <div class="action-row">
                <button class="secondary-button" type="button" :disabled="loading" @click="resetCadenceDefaults">
                  <RefreshCw :size="14" /> Resetar defaults
                </button>
                <button class="primary-button" :disabled="loading">
                  <Save :size="14" /> Salvar configuracao
                </button>
              </div>
            </form>
          </section>
        </section>

        <section v-else-if="activePanel === 'targets'" class="panel-stack">
          <section class="panel">
            <div class="workspace-panel-heading">
              <div>
                <h2>Dispatch targets</h2>
                <p>Mapeie campanhas ou catch-all para grupos WhatsApp.</p>
              </div>
              <button class="primary-button" :disabled="loading" @click="loadDispatchTargets">
                <RefreshCw :size="14" /> Atualizar
              </button>
            </div>
            <div class="management-table wide-field">
              <div class="management-row dispatch-targets-row table-head">
                <span>Nicho</span>
                <span>Campanha</span>
                <span>Instancia</span>
                <span>Grupo</span>
                <span>Flags</span>
                <span>Acoes</span>
              </div>
              <div v-if="!dispatchTargets.length" class="empty-state dispatch-empty">Nenhum target carregado.</div>
              <div v-for="target in dispatchTargets" :key="target.id" class="management-row dispatch-targets-row">
                <strong>{{ target.niche || '-' }}</strong>
                <span>
                  <code>{{ target.campaignId || 'catch-all' }}</code>
                  <small v-if="!target.campaignId" class="fallback-note">fallback</small>
                </span>
                <code>{{ target.instanceId }}</code>
                <code>{{ target.groupJid }}</code>
                <span class="dispatch-badges">
                  <span class="badge info">p{{ target.priority }}</span>
                  <span :class="['badge', target.active ? 'good' : 'bad']">{{ target.active ? 'ativo' : 'inativo' }}</span>
                  <span v-if="target.exclusive" class="badge warn">exclusive</span>
                </span>
                <span class="dispatch-actions">
                  <button class="secondary-button" @click="editDispatchTarget(target)">Editar</button>
                  <button class="secondary-button danger-action" @click="deleteDispatchTarget(target.id)">Excluir</button>
                </span>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="workspace-panel-heading">
              <div>
                <h2>{{ targetFormTitle }}</h2>
                <p>Menor numero em priority ganha precedencia; campaignId vazio vira catch-all.</p>
              </div>
              <button class="secondary-button" type="button" :disabled="loading" @click="loadTargetInstances">
                Instancias
              </button>
            </div>
            <form class="dispatch-form" @submit.prevent="saveDispatchTarget">
              <div class="form-grid">
                <label>
                  Campaign ID
                  <input v-model="targetForm.campaignId" placeholder="vazio = catch-all" />
                </label>
                <label>
                  Nicho
                  <input v-model="targetForm.niche" placeholder="ofertas, tech, casa" />
                </label>
                <label>
                  Instance
                  <select v-model="targetForm.instanceId" @change="changeTargetInstance">
                    <option value="">Selecione</option>
                    <option v-for="instance in instances" :key="instance.id" :value="instance.id">
                      {{ instance.instanceName || instance.id }}
                    </option>
                  </select>
                </label>
                <label>
                  Buscar grupo
                  <input
                    v-model="targetGroupSearch"
                    :disabled="!targetForm.instanceId || loading"
                    placeholder="Nome do grupo ou JID"
                    @keydown.enter.prevent="loadTargetGroups"
                  />
                </label>
                <label>
                  Grupo
                  <select v-model="targetForm.groupJid" :disabled="!targetForm.instanceId">
                    <option value="">Selecione</option>
                    <option v-for="group in targetGroups" :key="group.jid" :value="group.jid">
                      {{ group.subject || group.jid }} - {{ group.participantCount ?? '-' }} participantes
                    </option>
                  </select>
                </label>
                <label>
                  Priority
                  <input v-model.number="targetForm.priority" title="Menor numero = mais prioridade." type="number" min="0" step="1" />
                </label>
                <label>
                  titleRegex
                  <input v-model="targetForm.titleRegex" placeholder="opcional" />
                </label>
                <label>
                  titleAny
                  <input v-model="targetForm.titleAny" placeholder="fone, notebook, monitor" />
                </label>
                <label>
                  priceRange min
                  <input v-model="targetForm.priceMin" inputmode="decimal" placeholder="opcional" />
                </label>
                <label>
                  priceRange max
                  <input v-model="targetForm.priceMax" inputmode="decimal" placeholder="opcional" />
                </label>
              </div>
              <div class="dispatch-checks">
                <label><input v-model="targetForm.active" type="checkbox" /> Ativo</label>
                <label><input v-model="targetForm.exclusive" type="checkbox" /> Exclusive</label>
              </div>
              <div class="action-row">
                <button class="secondary-button" type="button" :disabled="loading" @click="resetTargetForm">Limpar</button>
                <button class="secondary-button" type="button" :disabled="loading || !targetForm.instanceId" @click="loadTargetGroups">
                  Buscar grupos
                </button>
                <button class="primary-button" :disabled="loading">
                  <Save :size="14" /> Salvar target
                </button>
              </div>
              <div v-if="targetForm.instanceId && !targetGroups.length && !loading" class="empty-state dispatch-empty">
                Nenhum grupo encontrado.
              </div>
            </form>
          </section>
        </section>

        <section v-else-if="activePanel === 'categories'" class="panel-stack">
          <section class="panel">
            <div class="workspace-panel-heading">
              <div>
                <h2>Categorias</h2>
                <p>Limite enxurrada de produtos por alias e janela.</p>
              </div>
              <button class="primary-button" :disabled="loading" @click="loadCategories">
                <RefreshCw :size="14" /> Atualizar
              </button>
            </div>
            <div class="management-table wide-field">
              <div class="management-row dispatch-categories-row table-head">
                <span>Nome</span>
                <span>Aliases</span>
                <span>Cadencia</span>
                <span>Status</span>
                <span>Acoes</span>
              </div>
              <div v-if="!categories.length" class="empty-state dispatch-empty">Nenhuma categoria carregada.</div>
              <div v-for="category in categories" :key="category.id" class="management-row dispatch-categories-row">
                <strong>{{ category.name }}</strong>
                <span class="chip-list">
                  <small v-for="alias in category.aliases" :key="alias">{{ alias }}</small>
                  <small v-if="!category.aliases.length" class="fallback-note">sem alias</small>
                </span>
                <span>{{ category.maxPerWindow }} a cada {{ category.windowMinutes }}min</span>
                <span :class="['badge', category.active ? 'good' : 'bad']">{{ category.active ? 'ativo' : 'inativo' }}</span>
                <span class="dispatch-actions">
                  <button class="secondary-button" @click="editCategory(category)">Editar</button>
                  <button class="secondary-button danger-action" @click="deleteCategory(category.id)">Excluir</button>
                </span>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="workspace-panel-heading">
              <div>
                <h2>{{ categoryFormTitle }}</h2>
                <p>Aliases sao case/acento-insensitive; cadastre variantes como wi-fi e wifi separadamente.</p>
              </div>
              <ShieldCheck :size="16" />
            </div>
            <form class="dispatch-form" @submit.prevent="saveCategory">
              <div class="form-grid">
                <label>
                  Nome
                  <input v-model="categoryForm.name" required placeholder="Eletronicos" />
                </label>
                <label>
                  Aliases
                  <input v-model="categoryForm.aliases" placeholder="fone, headset, celular" />
                </label>
                <label>
                  maxPerWindow
                  <input v-model.number="categoryForm.maxPerWindow" type="number" min="1" step="1" />
                </label>
                <label>
                  windowMinutes
                  <input v-model.number="categoryForm.windowMinutes" type="number" min="1" step="1" />
                </label>
              </div>
              <div class="dispatch-checks">
                <label><input v-model="categoryForm.active" type="checkbox" /> Ativa</label>
              </div>
              <div class="alert warn-alert category-warning">
                Categoria sem alias nao classifica nada. Fallback recebe categorias desconhecidas, mas nao limita de forma confiavel; "fone" nao casa "microfone".
              </div>
              <div class="action-row">
                <button class="secondary-button" type="button" :disabled="loading" @click="resetCategoryForm">Limpar</button>
                <button class="primary-button" :disabled="loading">
                  <Save :size="14" /> Salvar categoria
                </button>
              </div>
            </form>
          </section>
        </section>

        <section v-else class="panel">
          <div class="workspace-panel-heading">
            <div>
              <h2>Debug</h2>
              <p>Ultima chamada realizada ao dispatch-service.</p>
            </div>
            <button class="secondary-button" :disabled="!debugEntry" @click="copy(JSON.stringify(debugEntry, null, 2), 'Debug copiado.')">
              Copiar
            </button>
          </div>
          <textarea readonly :value="debugEntry ? JSON.stringify(debugEntry, null, 2) : 'Aguardando chamada...'" />
        </section>
      </main>

      <aside class="operational-panel dispatch-selected-panel">
        <div class="panel-heading">
          <h2>Selecionada</h2>
          <Trash2 :size="15" />
        </div>
        <div class="ops-grid">
          <div>
            <span>ID</span>
            <strong>{{ selectedInstance?.id || '-' }}</strong>
          </div>
          <div>
            <span>Nome</span>
            <strong>{{ selectedInstance?.instanceName || '-' }}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong :class="`status-text-${selectedStatusClass || 'neutral'}`">{{ selectedInstance?.lastState || '-' }}</strong>
          </div>
          <div>
            <span>Webhook</span>
            <strong>{{ selectedInstance?.webhook?.url || '-' }}</strong>
          </div>
        </div>
      </aside>
    </section>
  </section>
</template>

<script lang="ts">
import { defineComponent, h } from 'vue'

export default {
  components: {
    StatusPill: defineComponent({
      props: {
        status: {
          type: String,
          default: '',
        },
      },
      setup(props) {
        return () => {
          const normalized = String(props.status || '').toLowerCase()
          const type = normalized.includes('open') || normalized.includes('connect')
            ? 'good'
            : normalized.includes('close') || normalized.includes('disconnect') || normalized.includes('error')
              ? 'bad'
              : normalized
                ? 'warn'
                : ''

          return h('span', { class: ['status-indicator', type] }, [
            h('span', { class: 'status-dot' }),
            props.status || 'Sem status',
          ])
        }
      },
    }),
  },
}
</script>
