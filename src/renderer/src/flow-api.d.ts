// Описание для TypeScript: что за объект window.flow появился из preload
export {}

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }
export type Provider = {
  id: string
  name: string
  baseURL: string
  apiKey: string
  models: string
  enabled: boolean
}
type ModelOption = { value: string; label: string; group: string }

declare global {
  interface Window {
    flow: {
      aiChat: (args: {
        model: string
        messages: ChatMessage[]
        images?: string[]
      }) => Promise<
        | { ok: true; content: string; totalTokens: number }
        | { ok: false; error: string }
      >
      listModels: () => Promise<ModelOption[]>
      getProviders: () => Promise<Provider[]>
      saveProviders: (list: Provider[]) => Promise<{ ok: boolean; error?: string }>
      getSettings: () => Promise<{
        defaultModel: string
        autoStart: boolean
        comfyCmd: string
        comfyCwd: string
        lmsCmd: string
      }>
      saveSettings: (s: {
        defaultModel?: string
        autoStart?: boolean
        comfyCmd?: string
        comfyCwd?: string
        lmsCmd?: string
      }) => Promise<{ ok: boolean; error?: string }>
      servicesStatus: () => Promise<{ comfy: boolean; lm: boolean }>
      startService: (args: { name: 'comfy' | 'lm' }) => Promise<{ ok: true }>
      getStartup: () => Promise<boolean>
      setStartup: (args: { enabled: boolean }) => Promise<{ ok: boolean; error?: string }>
      runCode: (args: { id: string; code: string }) => Promise<
        | { ok: true; stdout: string; images: string[] }
        | { ok: false; error: string; killed?: boolean }
      >
      killCode: (args: { id: string }) => Promise<{ ok: true }>
      webSearch: (args: { query: string }) => Promise<
        | { ok: true; results: Array<{ title: string; url: string; snippet: string }> }
        | { ok: false; error: string }
      >
      openExternal: (args: { url: string }) => Promise<{ ok: true }>
      saveFile: (args: { base64: string; name: string }) => Promise<
        { ok: true; path: string } | { ok: false; error: string }
      >
      extractDoc: (args: { base64: string; name: string }) => Promise<
        { ok: true; text: string } | { ok: false; error: string }
      >
      agentChat: (args: {
        model: string
        messages: ChatMessage[]
      }) => Promise<
        | { ok: true; content: string; totalTokens: number }
        | { ok: false; error: string }
      >
      mcpList: () => Promise<
        Array<{
          id: string
          name: string
          command: string
          args: string[]
          env: Record<string, string>
          enabled: boolean
          status: string
          toolCount: number
          error?: string
        }>
      >
      mcpSave: (list: McpServer[]) => Promise<{ ok: boolean }>
      comfyModels: () => Promise<
        | { ok: true; checkpoints: string[]; unets: string[]; clips: string[]; vaes: string[] }
        | { ok: false; error: string }
      >
      comfyGenerate: (args: {
        checkpoint: string
        prompt: string
        negative: string
        width: number
        height: number
        steps: number
        modelType: string
      }) => Promise<{ ok: true; image: string } | { ok: false; error: string }>
      opencodeEnsure: (args: { cwd?: string }) => Promise<{ ok: boolean; port?: number; error?: string }>
      opencodeProviders: (args: { cwd?: string }) => Promise<
        | {
            ok: true
            providers: Array<{ id: string; name: string; models: string[]; env: string[] }>
            defaultModel: string
          }
        | { ok: false; error: string }
      >
      opencodeSetAuth: (args: {
        cwd?: string
        provider: string
        key: string
      }) => Promise<{ ok: true } | { ok: false; error: string }>
      opencodeSession: (args: { cwd?: string; title?: string }) => Promise<
        { ok: true; id: string; directory: string } | { ok: false; error: string }
      >
      opencodeMessage: (args: {
        cwd?: string
        sessionId: string
        model?: string
        text: string
      }) => Promise<{ ok: true; text: string } | { ok: false; error: string }>
      pickFolder: () => Promise<{ ok: true; path: string } | { ok: false }>
      ptyStart: (args: {
        id: string
        cwd?: string
        cols?: number
        rows?: number
        autostart?: boolean
        autostartCmd?: string
      }) => Promise<{ ok: true; reused: boolean } | { ok: false; error: string }>
      ptyWrite: (args: { id: string; data: string }) => void
      ptyResize: (args: { id: string; cols: number; rows: number }) => void
      ptyRun: (args: { id: string; cmd: string; interrupt?: boolean }) => void
      ptyKill: (args: { id: string }) => void
      onPtyData: (cb: (d: { id: string; data: string }) => void) => () => void
      onPtyExit: (cb: (d: { id: string; exitCode: number }) => void) => () => void
      anythingEnsure: () => Promise<{ ok: boolean; port?: number; error?: string }>
      anythingState: () => Promise<{
        phase: string
        message: string
        installed: boolean
        running: boolean
        port: number
        error: string
      }>
      anythingStop: () => Promise<{ ok: true }>
      onAnythingProgress: (cb: (p: { phase: string; message: string }) => void) => () => void
      openscienceEnsure: () => Promise<{ ok: boolean; url?: string; error?: string }>
      openscienceState: () => Promise<{
        phase: string
        message: string
        running: boolean
        url: string
        error: string
      }>
      openscienceStop: () => Promise<{ ok: true }>
      onOpenscienceProgress: (cb: (p: { phase: string; message: string }) => void) => () => void
      notebookKernels: () => Promise<{ ok: true; kernels: Array<{ name: string; python: string }> }>
      notebookStart: (args: { id: string; python?: string }) => Promise<{ ok: true; running: boolean; python: string }>
      notebookRun: (args: { id: string; cell: string; code: string }) => void
      notebookRestart: (args: { id: string; python?: string }) => Promise<{ ok: true }>
      notebookShutdown: (args: { id: string }) => void
      onNotebookMsg: (cb: (m: NotebookMsg) => void) => () => void
      pdfImport: (args: { base64: string; id: string }) => Promise<
        { ok: true; id: string; path: string } | { ok: false; error: string }
      >
      pdfBytes: (args: { id: string }) => Promise<{ ok: true; base64: string } | { ok: false; error: string }>
      pdfIndexAdd: (args: {
        id: string
        chunks: Array<{ id: string; page: number; text: string; vector: number[] }>
      }) => Promise<{ ok: true; total: number } | { ok: false; error: string }>
      pdfSearch: (args: { id: string; vector: number[]; topK?: number }) => Promise<
        { ok: true; chunks: Array<{ page: number; text: string; score: number }> } | { ok: false; error: string }
      >
      pdfIndexed: (args: { id: string }) => Promise<{ ok: true; indexed: boolean; count: number }>
      pdfDelete: (args: { id: string }) => Promise<{ ok: true }>
      pdfAsk: (args: {
        reqId: string
        model: string
        pdfId: string
        question: string
        queryVector?: number[]
        selection?: string
        imageDataUrl?: string
      }) => Promise<{ ok: true; text: string } | { ok: false; error: string }>
      onPdfStream: (
        cb: (m: {
          channel: 'token' | 'done' | 'error'
          reqId: string
          delta?: string
          text?: string
          error?: string
        }) => void
      ) => () => void
    }
  }
}

export type NotebookMsg = {
  id: string
  cell?: string
  type: 'ready' | 'stream' | 'image' | 'result' | 'error' | 'done' | 'exit'
  name?: string
  text?: string
  html?: string | null
  mime?: string
  data?: string
  count?: number
}

export type McpServer = {
  id: string
  name: string
  command: string
  args: string[]
  env: Record<string, string>
  enabled: boolean
}
