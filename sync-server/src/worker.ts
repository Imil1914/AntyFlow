// Real-time сервер совместных досок Flow.
// Каждая доска (roomId) обслуживается своим Durable Object: он держит общий стор
// tldraw в памяти, раздаёт изменения всем подключённым клиентам по WebSocket и
// периодически сохраняет снапшот в SQLite-хранилище самого DO (переживает выгрузку
// комнаты). SQLite-backed DO работают на бесплатном плане Cloudflare.
import { TLSocketRoom } from '@tldraw/sync-core'
import { createFlowSchema } from './schema'

interface Env {
  FLOW_SYNC: DurableObjectNamespace
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*'
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS })
    const url = new URL(request.url)
    // /connect/<roomId> — апгрейд в WebSocket, маршрутизируем в Durable Object комнаты
    const m = url.pathname.match(/^\/connect\/([^/]+)/)
    if (m) {
      const id = env.FLOW_SYNC.idFromName(m[1])
      return env.FLOW_SYNC.get(id).fetch(request)
    }
    return new Response('Flow sync server OK', { status: 200, headers: CORS })
  }
}

// Durable Object — одна комната (одна общая доска).
export class FlowSyncRoom {
  private roomPromise: Promise<TLSocketRoom<any, void>> | null = null
  private roomId = 'default'
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const m = url.pathname.match(/^\/connect\/([^/]+)/)
    this.roomId = m ? decodeURIComponent(m[1]) : 'default'

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Ожидается WebSocket', { status: 400, headers: CORS })
    }

    const sessionId = url.searchParams.get('sessionId') ?? crypto.randomUUID()
    const room = await this.getRoom()

    const pair = new WebSocketPair()
    const client = pair[0]
    const server = pair[1]
    server.accept()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    room.handleSocketConnect({ sessionId, socket: server as any })

    return new Response(null, { status: 101, webSocket: client })
  }

  private getRoom(): Promise<TLSocketRoom<any, void>> {
    if (!this.roomPromise) {
      this.roomPromise = (async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let initial: any = undefined
        try {
          const sql = this.state.storage.sql
          sql.exec('CREATE TABLE IF NOT EXISTS snapshot (id INTEGER PRIMARY KEY, data TEXT)')
          const rows = sql.exec('SELECT data FROM snapshot WHERE id = 0').toArray()
          const data = rows[0]?.data
          if (typeof data === 'string' && data) initial = JSON.parse(data)
        } catch {
          /* нет сохранённого снапшота — начинаем с пустого */
        }
        return new TLSocketRoom<any, void>({
          schema: createFlowSchema(),
          initialSnapshot: initial,
          onDataChange: () => this.scheduleSave()
        })
      })()
    }
    return this.roomPromise
  }

  private scheduleSave(): void {
    if (this.saveTimer) return
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      void this.save()
    }, 3000)
  }

  private async save(): Promise<void> {
    const room = await this.roomPromise
    if (!room) return
    try {
      const json = JSON.stringify(room.getCurrentSnapshot())
      const sql = this.state.storage.sql
      sql.exec('CREATE TABLE IF NOT EXISTS snapshot (id INTEGER PRIMARY KEY, data TEXT)')
      sql.exec('INSERT OR REPLACE INTO snapshot (id, data) VALUES (0, ?)', json)
    } catch {
      /* сохранение не критично — повторится при следующем изменении */
    }
  }
}
