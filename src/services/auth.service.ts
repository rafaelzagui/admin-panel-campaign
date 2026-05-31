import { apiRequest, setAuthToken } from '@/services/apiClient'

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
  return token
}
