import type { ApiError } from '@/dtos/campaign-api.dto'

const fallbackBaseUrl = 'http://localhost:3000'
const authTokenKey = 'campaign_ops_jwt'

export class ApiClientError extends Error {
  statusCode: number
  details?: ApiError

  constructor(details: ApiError) {
    const message = Array.isArray(details.message) ? details.message.join('\n') : details.message
    super(message)
    this.name = 'ApiClientError'
    this.statusCode = details.statusCode
    this.details = details
  }
}

function apiBaseUrl() {
  return (
    import.meta.env.VITE_CAMPAIGN_API_URL ||
    import.meta.env.CAMPAIGN_API_URL ||
    fallbackBaseUrl
  ).replace(/\/$/, '')
}

function decodeJwtPayload(token: string) {
  const payload = token.split('.')[1]
  if (!payload) return null

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    return JSON.parse(window.atob(padded)) as { exp?: number }
  } catch {
    return null
  }
}

export function getAuthToken() {
  return window.localStorage.getItem(authTokenKey) ?? window.sessionStorage.getItem(authTokenKey)
}

export function setAuthToken(token: string, rememberSession = true) {
  clearAuthToken()

  if (rememberSession) {
    window.localStorage.setItem(authTokenKey, token)
    return
  }

  window.sessionStorage.setItem(authTokenKey, token)
}

export function clearAuthToken() {
  window.localStorage.removeItem(authTokenKey)
  window.sessionStorage.removeItem(authTokenKey)
}

export function hasValidAuthToken() {
  const token = getAuthToken()
  if (!token) return false

  const payload = decodeJwtPayload(token)
  if (!payload) return false

  return !payload.exp || payload.exp * 1000 > Date.now()
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  const body = text ? JSON.parse(text) : null

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken()
      window.dispatchEvent(new Event('auth:unauthorized'))
    }

    throw new ApiClientError({
      statusCode: response.status,
      message: body?.message ?? response.statusText,
      error: body?.error,
    })
  }

  return body as T
}

export async function apiRequest<T>(path: string, init?: RequestInit) {
  const token = getAuthToken()

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  return parseResponse<T>(response)
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) return error.message
  if (error instanceof Error) return error.message
  return 'Erro inesperado ao comunicar com o campaign-service.'
}
