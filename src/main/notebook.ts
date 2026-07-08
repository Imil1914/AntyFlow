// Постоянные Python-kernel'ы для Colab-ноды (Jupyter-подобная).
// На каждую ноду — свой живой Python-процесс, помнящий состояние между
// ячейками. Обмен через stdin/stdout рамочным JSON-протоколом (кадр = \x1e+json+\n).
import { ipcMain, type WebContents } from 'electron'
import { spawn, execSync, type ChildProcess } from 'child_process'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join, basename } from 'path'
import { tmpdir, homedir } from 'os'

const PYTHON = process.platform === 'win32' ? 'python' : 'python3'
const IS_WIN = process.platform === 'win32'

// Поиск доступных интерпретаторов Python: лаунчер py (Windows), conda-окружения,
// системный python. Возвращает список для выбора ядра в ноде.
export function listKernels(): Array<{ name: string; python: string }> {
  const out: Array<{ name: string; python: string }> = []
  const seen = new Set<string>()
  const add = (name: string, python: string): void => {
    const key = python.toLowerCase()
    if (python && !seen.has(key)) {
      seen.add(key)
      out.push({ name, python })
    }
  }
  const run = (cmd: string): string => {
    try {
      return execSync(cmd, { encoding: 'utf-8', windowsHide: true, timeout: 8000 })
    } catch {
      return ''
    }
  }
  // Windows py launcher: "py -0p" перечисляет все версии с путями
  if (IS_WIN) {
    for (const line of run('py -0p').split(/\r?\n/)) {
      const m = line.match(/-V:(\S+)\s+\*?\s*(.+\.exe)\s*$/i)
      if (m && existsSync(m[2].trim())) add('Python ' + m[1].trim(), m[2].trim())
    }
  }
  // conda-окружения. Anaconda на Windows часто НЕ в PATH — берём пути из реестра
  // ~/.conda/environments.txt (надёжно), плюс `conda env list`, если conda доступна.
  const condaRoots: string[] = []
  try {
    const reg = readFileSync(join(homedir(), '.conda', 'environments.txt'), 'utf-8')
    for (const l of reg.split(/\r?\n/)) if (l.trim()) condaRoots.push(l.trim())
  } catch {
    /* нет реестра */
  }
  for (const line of run('conda env list').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const parts = line.trim().split(/\s{2,}|\s\*\s/).filter(Boolean)
    const p = parts[parts.length - 1]
    if (p && (p.includes('\\') || p.startsWith('/'))) condaRoots.push(p)
  }
  for (const root of condaRoots) {
    const py = IS_WIN ? join(root, 'python.exe') : join(root, 'bin', 'python')
    if (!existsSync(py)) continue
    const envMatch = /[\\/]envs[\\/]([^\\/]+)$/.exec(root)
    const name = envMatch ? envMatch[1] : basename(root) || 'base'
    add('conda: ' + name, py)
  }
  // системный python из PATH
  for (const line of run((IS_WIN ? 'where python' : 'which python3') + '').split(/\r?\n/)) {
    const p = line.trim()
    if (p && existsSync(p) && !p.toLowerCase().includes('windowsapps')) {
      add('python (PATH)', p)
      break
    }
  }
  if (!out.length) add('python', PYTHON)
  return out
}

// Скрипт kernel'а. \x1e — разделитель кадров; \n экранированы для JS-строки.
const KERNEL_PY = `import sys, io, json, base64, traceback, ast, os
os.environ.setdefault('MPLBACKEND', 'Agg')
try:
    sys.stdin.reconfigure(encoding='utf-8')
    sys.__stdout__.reconfigure(encoding='utf-8')
except Exception:
    pass
SENT = '\\x1e'
_real_stdout = sys.__stdout__
ns = {'__name__': '__main__'}
current = None
count = 0
def emit(obj):
    obj['cell'] = current
    _real_stdout.write(SENT + json.dumps(obj) + '\\n')
    _real_stdout.flush()
class Catcher(io.TextIOBase):
    def __init__(self, name):
        self.name = name
    def write(self, s):
        if s:
            emit({'type': 'stream', 'name': self.name, 'text': s})
        return len(s)
    def flush(self):
        pass
def capture_figures():
    mod = sys.modules.get('matplotlib.pyplot')
    if not mod:
        return
    try:
        for num in mod.get_fignums():
            fig = mod.figure(num)
            b = io.BytesIO()
            fig.savefig(b, format='png', dpi=110, bbox_inches='tight')
            emit({'type': 'image', 'mime': 'image/png', 'data': base64.b64encode(b.getvalue()).decode()})
        mod.close('all')
    except Exception:
        pass
def rich_result(val):
    if val is None:
        return
    html = None
    try:
        r = getattr(val, '_repr_html_', None)
        if callable(r):
            html = r()
    except Exception:
        html = None
    try:
        text = repr(val)
    except Exception:
        text = '<unrepresentable>'
    emit({'type': 'result', 'text': text, 'html': html})
def run_cell(code):
    global count
    count += 1
    out, err = Catcher('stdout'), Catcher('stderr')
    old_o, old_e = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = out, err
    try:
        block = ast.parse(code, '<cell>', 'exec')
        last = None
        if block.body and isinstance(block.body[-1], ast.Expr):
            last = ast.Expression(block.body.pop().value)
        exec(compile(block, '<cell>', 'exec'), ns)
        if last is not None:
            rich_result(eval(compile(last, '<cell>', 'eval'), ns))
    except KeyboardInterrupt:
        emit({'type': 'error', 'text': 'KeyboardInterrupt'})
    except Exception:
        emit({'type': 'error', 'text': traceback.format_exc()})
    finally:
        sys.stdout, sys.stderr = old_o, old_e
        capture_figures()
        emit({'type': 'done', 'count': count})
emit({'type': 'ready'})
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        req = json.loads(line)
    except Exception:
        continue
    if req.get('cmd') == 'shutdown':
        break
    current = req.get('cell')
    run_cell(req.get('code', ''))
`

type Kernel = {
  proc: ChildProcess
  wc: WebContents
  buf: string
  queue: Array<{ cell: string; code: string }>
  busy: boolean
  python: string
}
const kernels = new Map<string, Kernel>()

function kernelFile(): string {
  const p = join(tmpdir(), 'flow-notebook-kernel.py')
  try {
    writeFileSync(p, KERNEL_PY, 'utf-8')
  } catch {
    /* ignore */
  }
  return p
}

function send(k: Kernel, id: string, msg: Record<string, unknown>): void {
  try {
    k.wc.send('notebook:msg', { id, ...msg })
  } catch {
    /* окно закрыто */
  }
}

function pump(id: string, k: Kernel): void {
  if (k.busy) return
  const next = k.queue.shift()
  if (!next) return
  k.busy = true
  try {
    k.proc.stdin?.write(JSON.stringify({ cell: next.cell, code: next.code }) + '\n')
  } catch {
    k.busy = false
  }
}

function handleData(id: string, k: Kernel, chunk: string): void {
  k.buf += chunk
  let idx: number
  while ((idx = k.buf.indexOf('\n')) >= 0) {
    const line = k.buf.slice(0, idx)
    k.buf = k.buf.slice(idx + 1)
    if (line && line.charCodeAt(0) === 0x1e) {
      try {
        const msg = JSON.parse(line.slice(1))
        send(k, id, msg)
        if (msg.type === 'done') {
          k.busy = false
          pump(id, k)
        }
      } catch {
        /* битый кадр — пропускаем */
      }
    }
  }
}

function startKernel(id: string, wc: WebContents, python?: string): Kernel {
  const existing = kernels.get(id)
  if (existing) {
    existing.wc = wc
    return existing
  }
  const py = python && python.trim() ? python : PYTHON
  const proc = spawn(py, [kernelFile()], {
    windowsHide: true,
    env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', MPLBACKEND: 'Agg' }
  })
  proc.stdout?.setEncoding('utf-8')
  const k: Kernel = { proc, wc, buf: '', queue: [], busy: false, python: py }
  kernels.set(id, k)
  proc.stdout?.on('data', (c: string) => handleData(id, k, c))
  proc.on('error', (e) => send(k, id, { type: 'error', text: 'Не удалось запустить Python: ' + e.message }))
  proc.on('exit', () => {
    kernels.delete(id)
    send(k, id, { type: 'exit' })
  })
  return k
}

function killKernel(id: string): void {
  const k = kernels.get(id)
  if (k) {
    try {
      k.proc.kill()
    } catch {
      /* ignore */
    }
    kernels.delete(id)
  }
}

export function registerNotebookIpc(): void {
  ipcMain.handle('notebook:kernels', () => ({ ok: true as const, kernels: listKernels() }))
  ipcMain.handle('notebook:start', (e, args: { id: string; python?: string }) => {
    const k = startKernel(args.id, e.sender, args.python)
    return { ok: true as const, running: k.busy, python: k.python }
  })
  ipcMain.on('notebook:run', (e, args: { id: string; cell: string; code: string }) => {
    const k = startKernel(args.id, e.sender) // авто-старт, если ещё нет
    k.wc = e.sender
    k.queue.push({ cell: args.cell, code: args.code })
    pump(args.id, k)
  })
  // Перезапуск: убить процесс и поднять свежий (можно сменить интерпретатор).
  ipcMain.handle('notebook:restart', (e, args: { id: string; python?: string }) => {
    killKernel(args.id)
    startKernel(args.id, e.sender, args.python)
    return { ok: true as const }
  })
  ipcMain.on('notebook:shutdown', (_e, args: { id: string }) => killKernel(args.id))
}

export function stopAllKernels(): void {
  for (const id of [...kernels.keys()]) killKernel(id)
}
