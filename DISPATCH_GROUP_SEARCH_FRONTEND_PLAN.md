# Integracao frontend: busca de grupos WhatsMiau para Dispatch Targets

Este documento descreve como integrar o `admin-panel-campaign` com a nova busca de grupos exposta pelo `dispatch-service`.

## Objetivo

Permitir que o usuario pesquise grupos WhatsApp pelo nome ou JID antes de salvar um `DispatchTarget`, evitando cadastro manual de `groupJid`.

O fluxo esperado e:

1. Usuario escolhe uma instancia WhatsMiau.
2. Frontend busca os grupos daquela instancia.
3. Usuario filtra/pesquisa pelo nome do grupo ou JID.
4. Usuario seleciona o grupo.
5. Frontend salva o `DispatchTarget` usando o `jid` selecionado.

## Backend disponivel

O backend do projeto `afillitate-system` foi atualizado para aceitar `search` nas rotas de grupos.

Rotas disponiveis:

```http
GET /api/governance/dispatch-targets/instances/:instanceId/groups
GET /api/governance/dispatch-targets/instances/:instanceId/groups?search=ofertas
```

No frontend, por causa do proxy, usar:

```http
GET /api/admin/dispatch-targets/instances/:instanceId/groups
GET /api/admin/dispatch-targets/instances/:instanceId/groups?search=ofertas
```

Tambem existe a rota admin WhatsMiau, usada na tela operacional `/dispatch` com Basic Auth:

```http
GET /admin/whatsmiau/instances/:instanceId/groups
GET /admin/whatsmiau/instances/:instanceId/groups?search=ofertas
```

## Proxy

Nenhuma alteracao necessaria no proxy.

O `vite.config.ts` ja contem:

```ts
'/api/admin/dispatch-targets': governanceProxy('dispatch-targets')
```

Isso transforma:

```http
/api/admin/dispatch-targets/instances/:id/groups?search=abc
```

em:

```http
/api/governance/dispatch-targets/instances/:id/groups?search=abc
```

O `nginx.conf` tambem ja possui o proxy equivalente para producao.

## Tipo de resposta

O tipo ja existe em `src/services/dispatch.service.ts`:

```ts
export type DispatchGroup = {
  id: string
  subject: string
  jid: string
  participantCount: number | null
}
```

Resposta esperada:

```json
[
  {
    "id": "120363000000000000@g.us",
    "subject": "Ofertas Tecnologia",
    "jid": "120363000000000000@g.us",
    "participantCount": 42
  }
]
```

## Arquivos afetados

Alterar principalmente:

```txt
src/components/campaigns/CampaignDispatchTargetsPanel.vue
src/pages/DispatchServicePage.vue
```

Provavelmente nao precisa alterar:

```txt
src/services/dispatch.service.ts
vite.config.ts
nginx.conf
```

## Implementacao 1: aba Grupos de envio da campanha

Arquivo:

```txt
src/components/campaigns/CampaignDispatchTargetsPanel.vue
```

### Estado novo

Adicionar um `ref` para o termo de busca:

```ts
const groupSearch = ref('')
```

### Helper para montar a URL

Adicionar uma funcao pequena:

```ts
function groupsPath(instanceId: string, search?: string) {
  const query = search?.trim()
  const suffix = query ? `?search=${encodeURIComponent(query)}` : ''

  return `/api/admin/dispatch-targets/instances/${encodeURIComponent(instanceId)}/groups${suffix}`
}
```

### Alterar `loadGroups`

Hoje:

```ts
groups.value = await dispatchRequest<DispatchGroup[]>(
  `/api/admin/dispatch-targets/instances/${encodeURIComponent(selectedInstanceId.value)}/groups`,
)
```

Trocar para:

```ts
groups.value = await dispatchRequest<DispatchGroup[]>(
  groupsPath(selectedInstanceId.value, groupSearch.value),
)
```

### Limpar busca ao trocar instancia

No `changeInstance`, limpar tambem o termo:

```ts
async function changeInstance() {
  selectedGroupJid.value = ''
  groupSearch.value = ''
  groups.value = []
  await withBusy('groups', loadGroups)
}
```

### Template

Na area do formulario, antes do `<select>` de grupo, adicionar um input de pesquisa e um botao.

Sugestao:

```vue
<label>
  Buscar grupo
  <input
    v-model="groupSearch"
    :disabled="loading || !selectedInstanceId"
    placeholder="Nome do grupo ou JID"
    @keyup.enter="loadGroups"
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
```

Na linha de acoes, adicionar:

```vue
<button
  class="secondary-button"
  type="button"
  :disabled="loading || !selectedInstanceId"
  @click="loadGroups"
>
  Buscar grupos
</button>
```

### UX recomendada

- Ao selecionar instancia, carregar grupos sem filtro.
- Ao digitar termo, o usuario clica em `Buscar grupos` ou pressiona Enter.
- Se `groups.length === 0`, exibir mensagem: `Nenhum grupo encontrado para esta busca.`
- Manter o `jid` salvo no `DispatchTarget`; o backend continua precisando desse valor.

## Implementacao 2: tela global Dispatch Service

Arquivo:

```txt
src/pages/DispatchServicePage.vue
```

Essa tela possui duas areas que podem usar busca:

1. Painel `groups`, que lista grupos da instancia selecionada.
2. Painel `targets`, que cria/edita Dispatch Targets.

### Estado novo para painel groups

Adicionar:

```ts
const groupsSearch = ref('')
```

Alterar `listGroups`:

```ts
async function listGroups() {
  if (!requireAdminCredentials()) return
  if (!selectedId.value) return showAlert('warning', 'Selecione uma instancia primeiro.')

  await withBusy('groups', async () => {
    const query = groupsSearch.value.trim()
    const suffix = query ? `?search=${encodeURIComponent(query)}` : ''

    groups.value = await dispatchRequest<DispatchGroup[]>(
      `/admin/whatsmiau/instances/${encodeURIComponent(selectedId.value)}/groups${suffix}`,
      {
        basicAuth: basicAuth(),
        onDebug: debug,
      },
    )
    showAlert('success', 'Grupos carregados.')
  })
}
```

No template do painel `groups`, adicionar input:

```vue
<input
  v-model="groupsSearch"
  :disabled="loading || !selectedId"
  placeholder="Pesquisar grupo por nome ou JID"
  @keyup.enter="listGroups"
/>
```

### Estado novo para painel targets

Adicionar:

```ts
const targetGroupSearch = ref('')
```

Alterar `loadTargetGroups`:

```ts
async function loadTargetGroups() {
  if (!targetForm.value.instanceId) {
    targetGroups.value = []
    targetForm.value.groupJid = ''
    return
  }

  await withBusy('target-groups', async () => {
    const query = targetGroupSearch.value.trim()
    const suffix = query ? `?search=${encodeURIComponent(query)}` : ''

    targetGroups.value = await dispatchRequest<DispatchGroup[]>(
      `/api/admin/dispatch-targets/instances/${encodeURIComponent(targetForm.value.instanceId)}/groups${suffix}`,
      { onDebug: debug },
    )

    if (targetForm.value.groupJid && !targetGroups.value.some((group) => group.jid === targetForm.value.groupJid)) {
      targetForm.value.groupJid = ''
    }
  })
}
```

Ao trocar `targetForm.instanceId`, limpar busca:

```ts
targetGroupSearch.value = ''
```

Isso pode ser feito em uma funcao dedicada:

```ts
async function changeTargetInstance() {
  targetForm.value.groupJid = ''
  targetGroupSearch.value = ''
  targetGroups.value = []
  await loadTargetGroups()
}
```

E no template:

```vue
<select v-model="targetForm.instanceId" @change="changeTargetInstance">
```

Antes do select de grupo, adicionar:

```vue
<label>
  Buscar grupo
  <input
    v-model="targetGroupSearch"
    :disabled="!targetForm.instanceId || loading"
    placeholder="Nome do grupo ou JID"
    @keyup.enter="loadTargetGroups"
  />
</label>
```

Na action row do formulario, adicionar:

```vue
<button
  class="secondary-button"
  type="button"
  :disabled="loading || !targetForm.instanceId"
  @click="loadTargetGroups"
>
  Buscar grupos
</button>
```

## Opcao com debounce

Se quiser pesquisar automaticamente enquanto digita, usar `watch` com debounce simples.

Exemplo para `CampaignDispatchTargetsPanel.vue`:

```ts
let groupSearchTimer: ReturnType<typeof setTimeout> | null = null

watch(groupSearch, () => {
  if (!selectedInstanceId.value) return
  if (groupSearchTimer) clearTimeout(groupSearchTimer)

  groupSearchTimer = setTimeout(() => {
    void withBusy('groups', loadGroups)
  }, 350)
})
```

Recomendacao: comecar com botao/Enter. E mais simples, gera menos chamadas ao WhatsMiau e reduz risco de lentidao.

## Validacoes

Antes de salvar um target, manter as validacoes atuais:

```ts
if (!payload.instanceId) errors.push('instanceId e obrigatorio.')
if (!payload.groupJid) errors.push('groupJid e obrigatorio.')
```

Nao permitir salvar quando:

- nao houver instancia selecionada;
- nao houver grupo selecionado;
- `priority` for invalido;
- `groupJid` selecionado nao existir em `groups` ou `targetGroups`, exceto ao editar target antigo e a listagem de grupos falhar.

## Estados de tela

Recomendado exibir estes estados:

- `Selecione uma instancia para buscar grupos.`
- `Buscando grupos...`
- `Nenhum grupo encontrado.`
- `Grupo selecionado: <subject> (<jid>)`
- `Falha ao carregar grupos: <mensagem do backend>`

## Fluxo de teste manual

1. Subir o backend com WhatsMiau `v1.0.0`.
2. Garantir `GOVERNANCE_API_SECRET` no `.env` do frontend.
3. Abrir uma campanha.
4. Entrar na aba `Grupos de envio`.
5. Selecionar uma instancia.
6. Buscar termo parcial do nome de um grupo.
7. Selecionar o grupo retornado.
8. Salvar.
9. Confirmar que `GET /api/admin/dispatch-targets` retorna o target com:

```json
{
  "campaignId": "<id-da-campanha>",
  "instanceId": "<id-da-instancia>",
  "groupJid": "<jid-do-grupo>",
  "active": true
}
```

10. Editar o target e confirmar que o grupo continua selecionavel.

## Checklist de entrega

- [ ] `CampaignDispatchTargetsPanel.vue` tem busca por nome/JID.
- [ ] `CampaignDispatchTargetsPanel.vue` envia `?search=` para o backend.
- [ ] `DispatchServicePage.vue` painel `groups` usa `?search=`.
- [ ] `DispatchServicePage.vue` formulario `targets` usa `?search=`.
- [ ] Selects exibem `subject`, `participantCount` e mantem `jid` como value.
- [ ] Troca de instancia limpa busca e grupo selecionado.
- [ ] Mensagens de vazio/erro/loading estao claras.
- [ ] Fluxo de salvar `DispatchTarget` continua enviando `groupJid`.
- [ ] Proxy continua sem alteracao.

## Observacoes importantes

- O backend filtra por `id`, `subject` e `jid`.
- A busca e case-insensitive.
- O backend continua retornando array simples.
- O WhatsMiau precisa estar pareado/conectado para retornar grupos.
- Se a instancia nao estiver conectada, o backend pode retornar erro do provedor ou array vazio, dependendo do WhatsMiau.
- O valor persistido no banco continua sendo `groupJid`, nao o nome do grupo.
