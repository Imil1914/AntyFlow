import mermaid from 'mermaid'

let ready = false
let counter = 0

function initMermaid() {
  if (ready) return
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    flowchart: { htmlLabels: true, curve: 'basis' },
    themeVariables: {
      primaryColor: '#1c2536',
      primaryTextColor: '#eef1f6',
      primaryBorderColor: '#4c8dff',
      lineColor: '#8aa0c0',
      fontSize: '18px'
    }
  })
  ready = true
}

function escapeHtml(s: string): string {
  return s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] as string)
}

// Отрисовать код Mermaid в элемент (императивно, через mermaid.render — без кэша,
// поэтому обновление кода сразу перерисовывает диаграмму и нет конфликта с React).
export async function renderMermaidCode(el: HTMLElement, code: string): Promise<void> {
  const src = (code || '').trim()
  if (!src) {
    el.innerHTML = ''
    return
  }
  initMermaid()
  try {
    const id = 'mmd-' + ++counter
    const { svg } = await mermaid.render(id, src)
    el.innerHTML = svg
  } catch {
    // Некорректный синтаксис — показываем сам код, чтобы было видно и можно поправить
    el.innerHTML =
      '<pre style="margin:0;color:#8aa0c0;font:12px/1.45 monospace;white-space:pre-wrap;text-align:left">' +
      escapeHtml(src) +
      '</pre>'
  }
}

// Совместимость: отрисовать все .mermaid внутри контейнера
export async function renderMermaidIn(el: HTMLElement): Promise<void> {
  const nodes = Array.from(el.querySelectorAll<HTMLElement>('.mermaid'))
  for (const n of nodes) {
    await renderMermaidCode(n, n.getAttribute('data-code') || n.textContent || '')
  }
}
