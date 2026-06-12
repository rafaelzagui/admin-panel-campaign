type DispatchApiErrorBody = {
  statusCode?: number
  message?: string | string[]
  error?: string
  errorMessage?: string
}

export type DispatchConfigSummary = {
  whatsMiauBaseUrl: string | null
  defaultInstanceId: string | null
  isConfigured: boolean
}

export type DispatchWebhookConfig = {
  url?: string | null
  events?: string[]
  enabled?: boolean | null
  byEvents?: boolean | null
  base64?: boolean | null
}

export type DispatchInstance = {
  id: string
  instanceName: string
  ownerJid: string | null
  lastState: string | null
  webhook: DispatchWebhookConfig | null
  raw?: unknown
}

export type DispatchGroup = {
  id: string
  subject: string
  jid: string
  participantCount: number | null
}

export type GovernanceRule = {
  id: string
  instanceId: string | null
  scopeType: 'group' | 'contact'
  mode: 'allow' | 'block'
  direction: 'inbound' | 'outbound' | null
  value: string
  normalizedValue: string
  description: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type DispatchCadenceConfig = {
  id: string
  spacingMinMs: number
  spacingMaxMs: number
  limiterMax: number
  limiterDurationMs: number
  dedupWindowHours?: number | null
  priceDropOverride?: boolean | null
  minDropPercent?: number | null
  createdAt?: string
  updatedAt?: string
}

export type UpdateDispatchCadenceConfigPayload = Pick<
  DispatchCadenceConfig,
  'spacingMinMs' | 'spacingMaxMs' | 'limiterMax' | 'limiterDurationMs'
>

export type CreateDispatchInstancePayload = {
  instanceName: string
  id?: string
  readMessages?: boolean
  readStatus?: boolean
  alwaysOnline?: boolean
  syncRecentHistory?: boolean
  webhook?: {
    url?: string
    events?: string[]
    base64?: boolean
    enabled?: boolean
    byEvents?: boolean
  }
}

export type CreateGovernanceRulePayload = {
  instanceId?: string | null
  scopeType: 'group' | 'contact'
  mode: 'allow' | 'block'
  direction?: 'inbound' | 'outbound'
  value: string
  description?: string
  active?: boolean
}

export type DispatchTargetMatchRules = {
  titleAny?: string[]
  titleRegex?: string | null
  priceRange?: {
    min?: number | null
    max?: number | null
  } | null
}

export type DispatchTarget = {
  id: string
  niche: string
  campaignId: string | null
  instanceId: string
  groupJid: string
  priority: number
  active: boolean
  exclusive: boolean
  matchRules?: DispatchTargetMatchRules | null
  createdAt?: string
  updatedAt?: string
}

export type UpsertDispatchTargetPayload = {
  niche: string
  campaignId: string | null
  instanceId: string
  groupJid: string
  priority: number
  active: boolean
  exclusive: boolean
  matchRules?: DispatchTargetMatchRules
}

export type DispatchCategory = {
  id: string
  name: string
  aliases: string[]
  maxPerWindow: number
  windowMinutes: number
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export type UpsertDispatchCategoryPayload = {
  name: string
  aliases: string[]
  maxPerWindow: number
  windowMinutes: number
  active: boolean
}

export type DispatchDebugEntry = {
  method: string
  url: string
  status: string | number
  durationMs: number
  requestBody?: unknown
  responseBody?: unknown
}

export class DispatchApiClientError extends Error {
  statusCode: number
  details?: DispatchApiErrorBody

  constructor(statusCode: number, details?: DispatchApiErrorBody | string | null) {
    const body = typeof details === 'string' ? { message: details } : details
    const message = Array.isArray(body?.message)
      ? body.message.join('\n')
      : body?.message || body?.errorMessage || body?.error || `HTTP ${statusCode}`

    super(message)
    this.name = 'DispatchApiClientError'
    this.statusCode = statusCode
    this.details = body ?? undefined
  }
}

const fallbackDispatchBaseUrl = '/dispatch-api'

export function dispatchApiBaseUrl() {
  return (
    import.meta.env.VITE_DISPATCH_API_URL ||
    import.meta.env.DISPATCH_API_URL ||
    fallbackDispatchBaseUrl
  ).replace(/\/$/, '')
}

function encodeBasicAuth(username: string, password: string) {
  return window.btoa(`${username}:${password}`)
}

async function parseBody(response: Response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function normalizeHeaders(options: {
  basicAuth?: { username: string; password: string }
  body?: unknown
}) {
  return {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.basicAuth?.username && options.basicAuth.password
      ? { Authorization: `Basic ${encodeBasicAuth(options.basicAuth.username, options.basicAuth.password)}` }
      : {}),
  }
}

function dispatchUrl(path: string) {
  if (path.startsWith('/api/admin/')) return path
  return `${dispatchApiBaseUrl()}${path}`
}

export async function dispatchRequest<T>(
  path: string,
  options: {
    method?: string
    body?: unknown
    basicAuth?: { username: string; password: string }
    onDebug?: (entry: DispatchDebugEntry) => void
  } = {},
) {
  const method = options.method ?? 'GET'
  const startedAt = performance.now()
  const url = dispatchUrl(path)
  let status: string | number = 'network'
  let responseBody: unknown = null

  try {
    const response = await fetch(url, {
      method,
      headers: normalizeHeaders(options),
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'include',
    })

    status = response.status
    responseBody = await parseBody(response)

    options.onDebug?.({
      method,
      url,
      status,
      durationMs: Math.round(performance.now() - startedAt),
      requestBody: options.body,
      responseBody,
    })

    if (!response.ok) {
      throw new DispatchApiClientError(
        response.status,
        responseBody as DispatchApiErrorBody | string | null,
      )
    }

    return responseBody as T
  } catch (error) {
    options.onDebug?.({
      method,
      url,
      status,
      durationMs: Math.round(performance.now() - startedAt),
      requestBody: options.body,
      responseBody: error instanceof Error ? error.message : String(error),
    })

    throw error
  }
}

export function getDispatchApiErrorMessage(error: unknown) {
  if (error instanceof DispatchApiClientError) {
    const friendly: Record<number, string> = {
      400: `Validacao recusada: ${error.message}`,
      401: 'Configuracao do governance secret invalida no proxy do frontend.',
      404: 'Item nao encontrado no dispatch-service.',
      409: `Conflito ou registro duplicado: ${error.message}`,
      500: 'Erro interno do dispatch-service.',
    }

    return friendly[error.statusCode] ?? error.message
  }
  if (error instanceof Error) return error.message
  return 'Erro inesperado ao comunicar com o dispatch-service.'
}
