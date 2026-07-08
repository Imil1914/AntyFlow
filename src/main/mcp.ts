import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'

// --- Конфиг MCP-серверов ---
export type McpServer = {
  id: string
  name: string
  command: string
  args: string[]
  env: Record<string, string>
  enabled: boolean
}

const isWin = process.platform === 'win32'
const NPX = isWin ? 'npx.cmd' : 'npx'
const HOME = app.getPath('home')

// Наборы по умолчанию (бесплатные, node-серверы через npx)
export const DEFAULT_MCP: McpServer[] = [
  {
    id: 'filesystem',
    name: 'Файлы',
    command: NPX,
    args: ['-y', '@modelcontextprotocol/server-filesystem', HOME],
    env: {},
    enabled: true
  },
  {
    id: 'memory',
    name: 'Память',
    command: NPX,
    args: ['-y', '@modelcontextprotocol/server-memory'],
    env: {},
    enabled: true
  },
  {
    id: 'sequential-thinking',
    name: 'Рассуждение',
    command: NPX,
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    env: {},
    enabled: true
  },
  {
    id: 'playwright',
    name: 'Браузер (Playwright)',
    command: NPX,
    args: ['-y', '@playwright/mcp@latest'],
    env: {},
    enabled: false
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    command: NPX,
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    env: { BRAVE_API_KEY: '' },
    enabled: false
  },
  {
    id: 'github',
    name: 'GitHub',
    command: NPX,
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' },
    enabled: false
  }
]

function configPath() {
  return join(app.getPath('userData'), 'mcp.json')
}

export function getMcpConfig(): McpServer[] {
  try {
    const saved = JSON.parse(readFileSync(configPath(), 'utf-8')) as McpServer[]
    const byId = new Map(saved.map((s) => [s.id, s]))
    for (const d of DEFAULT_MCP) if (!byId.has(d.id)) byId.set(d.id, d)
    return [...byId.values()]
  } catch {
    return DEFAULT_MCP
  }
}

export function saveMcpConfig(list: McpServer[]) {
  writeFileSync(configPath(), JSON.stringify(list, null, 2), 'utf-8')
}

// --- Подключение и инструменты ---
type Tool = { name: string; description?: string; inputSchema?: unknown }
type Connected = {
  id: string
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any
  tools: Tool[]
  error?: string
}

const connected = new Map<string, Connected>()
// Карта: безопасное имя функции → { serverId, toolName }
const toolMap = new Map<string, { serverId: string; toolName: string }>()

function safeName(serverId: string, tool: string) {
  return `${serverId}__${tool}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64)
}

// Подключиться ко всем включённым серверам (те, что ещё не подключены)
export async function ensureConnected(): Promise<void> {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js')

  const cfg = getMcpConfig().filter((s) => s.enabled)
  const wantIds = new Set(cfg.map((s) => s.id))

  // Отключаем те, что больше не нужны
  for (const [id, c] of connected) {
    if (!wantIds.has(id)) {
      try {
        await c.client.close()
      } catch {
        /* ignore */
      }
      connected.delete(id)
    }
  }

  for (const s of cfg) {
    if (connected.has(s.id)) continue
    try {
      const transport = new StdioClientTransport({
        command: s.command,
        args: s.args,
        env: { ...process.env, ...s.env } as Record<string, string>,
        stderr: 'ignore'
      })
      const client = new Client({ name: 'flow', version: '0.1.0' }, { capabilities: {} })
      await client.connect(transport)
      const list = await client.listTools()
      connected.set(s.id, { id: s.id, name: s.name, client, tools: list.tools ?? [] })
    } catch (e) {
      connected.set(s.id, {
        id: s.id,
        name: s.name,
        client: null,
        tools: [],
        error: (e as Error).message
      })
    }
  }
}

// Переподключить всё заново (после изменения конфига)
export async function reconnect(): Promise<void> {
  for (const [, c] of connected) {
    try {
      if (c.client) await c.client.close()
    } catch {
      /* ignore */
    }
  }
  connected.clear()
  await ensureConnected()
}

// Статус для UI
export function mcpStatus() {
  return getMcpConfig().map((s) => {
    const c = connected.get(s.id)
    return {
      ...s,
      status: !s.enabled ? 'off' : c?.error ? 'error' : c ? 'ready' : 'connecting',
      toolCount: c?.tools.length ?? 0,
      error: c?.error
    }
  })
}

// Инструменты в формате OpenAI (для tool-calling)
export function getOpenAITools() {
  toolMap.clear()
  const tools: Array<{
    type: 'function'
    function: { name: string; description?: string; parameters?: unknown }
  }> = []
  for (const [serverId, c] of connected) {
    if (c.error || !c.client) continue
    for (const t of c.tools) {
      const fname = safeName(serverId, t.name)
      toolMap.set(fname, { serverId, toolName: t.name })
      tools.push({
        type: 'function',
        function: {
          name: fname,
          description: t.description,
          parameters: t.inputSchema ?? { type: 'object', properties: {} }
        }
      })
    }
  }
  return tools
}

// Вызвать инструмент по безопасному имени функции
export async function callTool(fname: string, args: unknown): Promise<string> {
  const ref = toolMap.get(fname)
  if (!ref) return `Инструмент ${fname} не найден`
  const c = connected.get(ref.serverId)
  if (!c || !c.client) return `Сервер ${ref.serverId} недоступен`
  try {
    const res = await c.client.callTool({ name: ref.toolName, arguments: args ?? {} })
    const content = (res.content ?? []) as Array<{ type: string; text?: string }>
    const text = content
      .map((p) => (p.type === 'text' ? p.text : `[${p.type}]`))
      .join('\n')
      .slice(0, 8000)
    return text || '(пустой результат)'
  } catch (e) {
    return `Ошибка вызова ${fname}: ${(e as Error).message}`
  }
}
