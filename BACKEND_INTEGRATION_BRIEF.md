# Briefing de integracao backend para o Admin Panel Campaign

Este documento descreve o fluxo atual do frontend e o contrato esperado dos backends para integrar o painel administrativo.

## Visao geral

O frontend e um Vue 3 + Vite que opera duas APIs:

- `campaign-service`: API principal de campanhas, autenticada com JWT Bearer.
- `dispatch-service`: API operacional de envio/WhatsApp, acessada por proxy Vite em dev e por rotas equivalentes em producao.

Variaveis esperadas:

```env
VITE_CAMPAIGN_API_URL=/api
CAMPAIGN_API_PROXY_TARGET=http://localhost:3000
VITE_DISPATCH_API_URL=/dispatch-api
DISPATCH_API_PROXY_TARGET=http://localhost:3002
GOVERNANCE_API_SECRET=
```

Fallbacks no codigo:

- `campaign-service`: `http://localhost:3000`
- `dispatch-service`: `/dispatch-api`

## Autenticacao do painel

Fluxo:

1. Usuario abre o painel.
2. Se nao houver JWT valido em `localStorage` ou `sessionStorage`, o app exibe a tela de login.
3. Login envia `POST /auth/login` para o `campaign-service`.
4. O backend pode retornar o token em qualquer uma destas chaves: `access_token`, `accessToken`, `token` ou `jwt`.
5. O token e salvo como `campaign_ops_jwt`.
6. Todas as chamadas ao `campaign-service` usam `Authorization: Bearer <jwt>`.
7. Em qualquer resposta `401`, o frontend limpa o token e volta para login.

Payload de login:

```json
{
  "username": "admin",
  "password": "senha"
}
```

Resposta esperada:

```json
{
  "access_token": "jwt"
}
```

Erros devem seguir preferencialmente:

```json
{
  "statusCode": 400,
  "message": "Mensagem ou lista de mensagens",
  "error": "Bad Request"
}
```

## Fluxo principal de campanhas

### 1. Listagem

Ao carregar `/campaigns`, o frontend chama:

- `GET /campaigns`

Depois, para cada campanha retornada, carrega dados vinculados:

- `GET /campaigns/:campaignId/rules`
- `GET /campaigns/:campaignId/audiences`
- `GET /campaigns/:campaignId/templates`
- `GET /campaigns/:campaignId/executions`

Se o `campaign-service` falhar na carga inicial, o frontend usa mock local apenas para desenvolvimento.

### 2. Detalhe da campanha

Rota do frontend:

- `/campaigns/:campaignId/:tab?`

Abas:

- `configuration`
- `rules`
- `audiences`
- `templates`
- `dispatch-targets`
- `executions`

Ao abrir detalhe, o frontend chama em paralelo:

- `GET /campaigns/:campaignId`
- `GET /campaigns/:campaignId/rules`
- `GET /campaigns/:campaignId/audiences`
- `GET /campaigns/:campaignId/templates`
- `GET /campaigns/:campaignId/executions`

### 3. Criar e editar campanha

Criar:

- `POST /campaigns`

Editar:

- `PATCH /campaigns/:campaignId`

Payload:

```json
{
  "name": "Ofertas de tecnologia",
  "slug": "ofertas-tecnologia",
  "description": "Campanha de ofertas",
  "scheduleType": "MANUAL",
  "timezone": "America/Sao_Paulo",
  "startsAt": null,
  "endsAt": null,
  "triggerConfig": {},
  "normalizationConfig": {},
  "metadata": {}
}
```

Resposta esperada: objeto `CampaignSummary`.

### 4. Prontidao para ativacao

O frontend bloqueia a ativacao quando:

- `name` vazio.
- `slug` vazio ou fora do padrao `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- `triggerConfig`, `normalizationConfig` ou `metadata` invalidos.
- Nao existe pelo menos uma regra `ACTIVE`.
- Nao existe pelo menos uma audiencia `ACTIVE`.
- Nao existe pelo menos um template `ACTIVE`.
- `ONE_TIME` sem `startsAt`.
- `CRON` sem chave/conteudo `cron` em `triggerConfig`.
- `EVENT_DRIVEN` sem chave/conteudo `event` em `triggerConfig`.
- `ONE_TIME` ou `CRON` sem `timezone`.
- `endsAt <= startsAt`.

O backend deve repetir essas validacoes em `POST /campaigns/:campaignId/activate`.

Ativar:

- `POST /campaigns/:campaignId/activate`
- Body enviado pelo front: `{}`
- Resposta esperada: `CampaignSummary`

Pausar:

- `POST /campaigns/:campaignId/pause`
- Body enviado pelo front: `{}`
- Resposta esperada: `CampaignSummary`

### 5. Execucao manual

O frontend permite executar apenas campanhas `ACTIVE` ou `SCHEDULED`.

Endpoint:

- `POST /campaigns/:campaignId/executions`

Payload:

```json
{
  "triggeredBy": "usuario-logado-ou-admin-ui",
  "requestPayload": {}
}
```

`requestPayload` vem de `triggerConfig` da campanha.

Resposta esperada: `CampaignExecution`.

## Contratos do campaign-service

### CampaignSummary

```ts
type CampaignStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

type CampaignScheduleType = 'MANUAL' | 'ONE_TIME' | 'CRON' | 'EVENT_DRIVEN'

type CampaignExecutionStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

type CampaignSummary = {
  id: string
  name: string
  slug: string
  description: string | null
  status: CampaignStatus
  scheduleType: CampaignScheduleType
  timezone: string | null
  startsAt: string | null
  endsAt: string | null
  triggerConfig: Record<string, unknown> | null
  normalizationConfig: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  rulesCount: number
  audiencesCount: number
  templatesCount: number
  latestExecutionStatus: CampaignExecutionStatus | null
}
```

Datas podem vir em ISO string. Campos `startsAt` e `endsAt` podem ser `null`.

### Regras

Endpoints:

- `GET /campaigns/:campaignId/rules`
- `POST /campaigns/:campaignId/rules`
- `PATCH /campaigns/:campaignId/rules/:ruleId`

Tipos aceitos:

```ts
type CampaignRuleType =
  | 'PRICE_RANGE'
  | 'DISCOUNT_THRESHOLD'
  | 'KEYWORD_MATCH'
  | 'MARKETPLACE_ALLOWLIST'
  | 'MARKETPLACE_BLOCKLIST'
  | 'CATEGORY_ALLOWLIST'
  | 'CATEGORY_BLOCKLIST'
  | 'MIN_SELLER_RATING'
  | 'MIN_STOCK'
  | 'CUSTOM'
```

Objeto:

```ts
type CampaignRule = {
  id: string
  campaignId: string
  name: string
  description: string | null
  type: CampaignRuleType
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
  priority: number
  condition: Record<string, unknown>
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}
```

Payload de criacao:

```json
{
  "name": "Preco minimo",
  "description": null,
  "type": "PRICE_RANGE",
  "status": "ACTIVE",
  "priority": 10,
  "condition": {}
}
```

### Audiencias

Endpoints:

- `GET /campaigns/:campaignId/audiences`
- `POST /campaigns/:campaignId/audiences`
- `PATCH /campaigns/:campaignId/audiences/:audienceId`

Objeto:

```ts
type CampaignAudience = {
  id: string
  campaignId: string
  type: 'PHONE_NUMBER' | 'SEGMENT' | 'WEBHOOK'
  identifier: string
  displayName: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'FAILED'
  payload: Record<string, unknown> | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}
```

Payload de criacao:

```json
{
  "type": "SEGMENT",
  "identifier": "clientes-vip",
  "displayName": "Clientes VIP",
  "status": "ACTIVE",
  "payload": {}
}
```

### Templates

Endpoints:

- `GET /campaigns/:campaignId/templates`
- `POST /campaigns/:campaignId/templates`
- `PATCH /campaigns/:campaignId/templates/:templateId`

Objeto:

```ts
type MessageTemplate = {
  id: string
  campaignId: string
  name: string
  channel: 'WHATSAPP'
  content: string
  fallbackContent: string | null
  variables: Record<string, unknown> | null
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}
```

Payload de criacao:

```json
{
  "name": "Oferta padrao",
  "channel": "WHATSAPP",
  "content": "Produto: {{title}} - {{price}}",
  "fallbackContent": null,
  "variables": {},
  "status": "ACTIVE"
}
```

### Execucoes

Endpoint:

- `GET /campaigns/:campaignId/executions`

Objeto:

```ts
type CampaignExecution = {
  id: string
  campaignId: string
  correlationId: string
  status: CampaignExecutionStatus
  triggerSource: 'MANUAL' | 'SCHEDULED' | 'EVENT' | 'RETRY'
  triggeredBy: string | null
  triggeredAt: string
  startedAt: string | null
  completedAt: string | null
  requestPayload: Record<string, unknown> | null
  resultPayload: Record<string, unknown> | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}
```

## Fluxo do dispatch-service

O frontend possui duas formas de uso do dispatch:

1. Tela completa `/dispatch`, para administracao operacional.
2. Aba `Grupos de envio` no detalhe da campanha, para vincular uma campanha a um grupo WhatsApp.

### Proxy em desenvolvimento

No Vite:

- `/dispatch-api/*` vira `/api/*` no `dispatch-service`.
- `/api/admin/dispatch-config/*` vira `/api/governance/dispatch-config/*`.
- `/api/admin/dispatch-targets/*` vira `/api/governance/dispatch-targets/*`.
- `/api/admin/categories/*` vira `/api/governance/categories/*`.
- `/api/admin/governance-rules/*` vira `/api/governance/rules/*`.

Quando `GOVERNANCE_API_SECRET` existe, o proxy adiciona:

```http
x-governance-secret: <GOVERNANCE_API_SECRET>
```

Em producao, o nginx/backend deve preservar comportamento equivalente.

### Rotas admin WhatsMiau

Estas chamadas usam Basic Auth informado manualmente na tela `/dispatch`.

- `GET /admin/whatsmiau/config`
- `GET /admin/whatsmiau/instances`
- `GET /admin/whatsmiau/health`
- `GET /admin/whatsmiau/instances/:instanceId/status`
- `GET /admin/whatsmiau/instances/:instanceId/qr`
- `DELETE /admin/whatsmiau/instances/:instanceId`
- `POST /admin/whatsmiau/instances`
- `PUT /admin/whatsmiau/instances/:instanceId/webhook`
- `GET /admin/whatsmiau/instances/:instanceId/groups`

Payload para criar instancia:

```json
{
  "instanceName": "principal",
  "id": "principal",
  "readMessages": false,
  "readStatus": false,
  "alwaysOnline": false,
  "syncRecentHistory": true,
  "webhook": {
    "url": "https://example.com/webhook",
    "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
    "enabled": true,
    "byEvents": true,
    "base64": false
  }
}
```

### Tipos do dispatch-service

```ts
type DispatchConfigSummary = {
  whatsMiauBaseUrl: string | null
  defaultInstanceId: string | null
  isConfigured: boolean
}

type DispatchInstance = {
  id: string
  instanceName: string
  ownerJid: string | null
  lastState: string | null
  webhook: {
    url?: string | null
    events?: string[]
    enabled?: boolean | null
    byEvents?: boolean | null
    base64?: boolean | null
  } | null
  raw?: unknown
}

type DispatchGroup = {
  id: string
  subject: string
  jid: string
  participantCount: number | null
}
```

QR Code pode vir em uma destas chaves, com ou sem prefixo `data:image/png;base64,`:

- `base64`
- `qrcode`
- `qrCode`
- `data.base64`
- `data.qrcode`
- `data.qrCode`

Status pode vir em:

- `state`
- `status`
- `connectionStatus`
- `data.state`
- `instance.state`

### Governance rules

Endpoints usados pelo frontend:

- `GET /api/admin/governance-rules`
- `POST /api/admin/governance-rules`

No backend/proxy isso representa `/api/governance/rules`.

Objeto:

```ts
type GovernanceRule = {
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
```

Payload:

```json
{
  "scopeType": "group",
  "mode": "allow",
  "direction": "outbound",
  "value": "120363000000000000@g.us",
  "description": "grupo oficial de ofertas",
  "active": true
}
```

### Cadencia global

Endpoints usados:

- `GET /api/admin/dispatch-config/global`
- `PATCH /api/admin/dispatch-config/:configId`

Objeto:

```ts
type DispatchCadenceConfig = {
  id: string
  spacingMinMs: number
  spacingMaxMs: number
  limiterMax: number
  limiterDurationMs: number
  rankEnabled?: boolean | null
  dedupWindowHours?: number | null
  priceDropOverride?: boolean | null
  minDropPercent?: number | null
  createdAt?: string
  updatedAt?: string
}
```

Payload de update:

```json
{
  "spacingMinMs": 3000,
  "spacingMaxMs": 8000,
  "limiterMax": 1,
  "limiterDurationMs": 10000,
  "rankEnabled": true
}
```

`rankEnabled` precisa estar ativo para que categorias/cluster cortem produtos semelhantes por grupo.

### Dispatch targets

Usado tanto pela tela `/dispatch` quanto pela aba `Grupos de envio` da campanha.

Endpoints usados:

- `GET /api/admin/dispatch-targets`
- `POST /api/admin/dispatch-targets`
- `PATCH /api/admin/dispatch-targets/:targetId`
- `DELETE /api/admin/dispatch-targets/:targetId`
- `GET /api/admin/dispatch-targets/instances`
- `GET /api/admin/dispatch-targets/instances/:instanceId/groups`

No backend/proxy isso representa `/api/governance/dispatch-targets`.

Objeto:

```ts
type DispatchTarget = {
  id: string
  niche: string
  campaignId: string | null
  instanceId: string
  groupJid: string
  priority: number
  active: boolean
  exclusive: boolean
  matchRules?: {
    titleAny?: string[]
    titleRegex?: string | null
    priceRange?: {
      min?: number | null
      max?: number | null
    } | null
  } | null
  createdAt?: string
  updatedAt?: string
}
```

Payload:

```json
{
  "niche": "ofertas-tecnologia",
  "campaignId": "campaign-id",
  "instanceId": "principal",
  "groupJid": "120363000000000000@g.us",
  "priority": 100,
  "active": true,
  "exclusive": false,
  "matchRules": {}
}
```

Regra do frontend na aba da campanha:

- Ao salvar um novo target ativo para uma campanha, o frontend desativa os outros targets ativos da mesma campanha antes de salvar o novo.
- `niche` default vira `campaign.slug` ou `campaign.name`.
- `campaignId` vazio na tela global significa target catch-all.
- Menor `priority` tem precedencia.

### Categorias

Endpoints usados:

- `GET /api/admin/categories`
- `POST /api/admin/categories`
- `PATCH /api/admin/categories/:categoryId`
- `DELETE /api/admin/categories/:categoryId`

No backend/proxy isso representa `/api/governance/categories`.

Objeto:

```ts
type DispatchCategory = {
  id: string
  name: string
  aliases: string[]
  maxPerWindow: number
  windowMinutes: number
  active: boolean
  createdAt?: string
  updatedAt?: string
}
```

Payload:

```json
{
  "name": "Eletronicos",
  "aliases": ["fone", "headset", "celular"],
  "maxPerWindow": 1,
  "windowMinutes": 60,
  "active": true
}
```

Validacoes esperadas:

- `name` obrigatorio.
- Pelo menos 1 alias.
- `maxPerWindow >= 1`.
- `windowMinutes >= 1`.

### Cluster / categorias no detalhe da campanha

Na aba `dispatch-targets` da campanha, o frontend carrega:

- `GET /api/admin/dispatch-targets`
- `GET /api/admin/categories`
- `GET /api/admin/dispatch-config/global`

O target ativo da campanha e filtrado por:

```ts
target.campaignId === campaignId && target.active
```

Sem `DispatchTarget` ativo, a campanha nao tem grupo definido e o cluster/cadencia nao tem destino para atuar.

Categorias globais afetam o grupo do target ativo. Se outras campanhas usam o mesmo `groupJid`, elas compartilham os mesmos limites.

Endpoints opcionais existentes para etapas futuras:

- `POST/PATCH/GET /api/governance/category-group-overrides`
- `GET /api/governance/rank/sent`
- `GET /api/governance/rank/suppressed`

## Pontos importantes para o backend

- Todas as respostas de lista devem ser arrays, nunca objetos envelopados como `{ data: [...] }`, pois o frontend consome diretamente o array.
- Campos JSON devem ser objetos JSON reais no backend. O frontend transforma para texto apenas para edicao na UI.
- IDs sao tratados como string.
- Status devem bater exatamente com os enums listados.
- Erros devem incluir `message`; pode ser string ou array de strings.
- O `campaign-service` e responsavel por autenticar o painel via JWT.
- O `dispatch-service` tem duas camadas: rotas WhatsMiau com Basic Auth e rotas governance via secret/header no proxy.
- A execucao manual cria registro no `campaign-service`; o envio final continua responsabilidade do `dispatch-service`.
