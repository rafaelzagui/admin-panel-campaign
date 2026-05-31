import { apiRequest, setAuthToken } from '@/services/apiClient'

const authUsernameKey = 'campaign_ops_username'

type LoginResponse = {
  access_token?: string
  accessToken?: string
  token?: string
  jwt?: string
}

function extractToken(response: LoginResponse) {
  return response.access_token ?? response.accessToken ?? response.token ?? response.jwt
}

export async function login(username: string, password: string, rememberSession = true) {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  const token = extractToken(response)

  if (!token) {
    throw new Error('O backend nao retornou um token JWT no login.')
  }

  setAuthToken(token, rememberSession)
  const storage = rememberSession ? window.localStorage : window.sessionStorage
  storage.setItem(authUsernameKey, username)
  return token
}

export function getAuthenticatedUsername() {
  return window.localStorage.getItem(authUsernameKey) ?? window.sessionStorage.getItem(authUsernameKey)
}

export function clearAuthenticatedUsername() {
  window.localStorage.removeItem(authUsernameKey)
  window.sessionStorage.removeItem(authUsernameKey)
}
