// Иконки типов нод — чтобы с первого взгляда было понятно, что за инструмент.
// Монохром, stroke=currentColor (цвет задаёт родитель = цвет типа ноды).

export function NodeIcon({ kind, size = 15 }: { kind: string; size?: number }) {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  }
  switch (kind) {
    case 'note': // заметка / markdown
      return (
        <svg {...p}>
          <rect x="3" y="2.5" width="10" height="11" rx="1.5" />
          <line x1="5.5" y1="6" x2="10.5" y2="6" />
          <line x1="5.5" y1="8.5" x2="10.5" y2="8.5" />
          <line x1="5.5" y1="11" x2="8.5" y2="11" />
        </svg>
      )
    case 'ai': // ИИ-ассистент (чат)
      return (
        <svg {...p}>
          <path d="M4 3h8a2 2 0 0 1 2 2v3.5a2 2 0 0 1-2 2H7l-3 2.3V10.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <circle cx="6" cy="6.9" r="0.7" fill="currentColor" stroke="none" />
          <circle cx="8" cy="6.9" r="0.7" fill="currentColor" stroke="none" />
          <circle cx="10" cy="6.9" r="0.7" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'code': // запрос кода </>
      return (
        <svg {...p}>
          <path d="M6 5 L3 8 L6 11" />
          <path d="M10 5 L13 8 L10 11" />
          <line x1="8.7" y1="4.6" x2="7.3" y2="11.4" />
        </svg>
      )
    case 'codeblock': // код-панель (терминал)
      return (
        <svg {...p}>
          <rect x="2" y="3" width="12" height="10" rx="1.5" />
          <path d="M4.5 7 L6.5 9 L4.5 11" />
          <line x1="8" y1="11" x2="11" y2="11" />
        </svg>
      )
    case 'search': // веб-поиск
      return (
        <svg {...p}>
          <circle cx="7" cy="7" r="4.2" />
          <line x1="10.3" y1="10.3" x2="14" y2="14" />
        </svg>
      )
    case 'image': // генерация изображения
      return (
        <svg {...p}>
          <rect x="2" y="2.5" width="12" height="11" rx="2" />
          <circle cx="5.6" cy="6.2" r="1.2" />
          <path d="M2.5 12 L6.5 8.5 L9.5 11 L11.5 9.5 L13.5 11.5" />
        </svg>
      )
    case 'deck': // презентация
      return (
        <svg {...p}>
          <rect x="2" y="3" width="12" height="8" rx="1.5" />
          <line x1="8" y1="11" x2="8" y2="13.5" />
          <line x1="5.5" y1="13.5" x2="10.5" y2="13.5" />
        </svg>
      )
    case 'diagram': // схема / диаграмма (флоу)
      return (
        <svg {...p}>
          <rect x="2" y="2.8" width="5.5" height="3.6" rx="1" />
          <rect x="8.5" y="9.6" width="5.5" height="3.6" rx="1" />
          <path d="M4.7 6.4 V9.4 Q4.7 11.4 6.7 11.4 H8.5" />
        </svg>
      )
    case 'ref': // референс / ссылка
      return (
        <svg {...p}>
          <path d="M6.5 9.5 L9.5 6.5" />
          <path d="M8.2 4.8 L9.6 3.4 A2 2 0 0 1 12.6 6.4 L11.2 7.8" />
          <path d="M7.8 11.2 L6.4 12.6 A2 2 0 0 1 3.4 9.6 L4.8 8.2" />
        </svg>
      )
    case 'doc': // документ
      return (
        <svg {...p}>
          <path d="M4 2.5 H9.5 L12.5 5.5 V13 A0.5 0.5 0 0 1 12 13.5 H4 A0.5 0.5 0 0 1 3.5 13 V3 A0.5 0.5 0 0 1 4 2.5 Z" />
          <path d="M9.5 2.5 V5.5 H12.5" />
        </svg>
      )
    case 'answer': // ответ ИИ (искра)
      return (
        <svg {...p}>
          <path d="M8 2.5 L9 6 L12.5 7 L9 8 L8 11.5 L7 8 L3.5 7 L7 6 Z" />
        </svg>
      )
    case 'openscience': // OpenScience — научный AI-воркбенч (пересекающиеся круги)
      return (
        <svg {...p}>
          <circle cx="8" cy="5" r="2.6" />
          <circle cx="5.4" cy="10" r="2.6" />
          <circle cx="10.6" cy="10" r="2.6" />
        </svg>
      )
    case 'opencode': // OpenCode — терминал-монитор на стойке с промптом
      return (
        <svg {...p}>
          <rect x="2" y="2.8" width="12" height="8.4" rx="1.5" />
          <path d="M4.5 6 L6.2 7.5 L4.5 9" />
          <line x1="7.4" y1="9.1" x2="10" y2="9.1" />
          <line x1="8" y1="11.2" x2="8" y2="13.2" />
          <line x1="5.8" y1="13.4" x2="10.2" y2="13.4" />
        </svg>
      )
    case 'anythingllm': // AnythingLLM — база знаний (цилиндр БД)
      return (
        <svg {...p}>
          <ellipse cx="8" cy="4" rx="4.5" ry="1.8" />
          <path d="M3.5 4 V12 A4.5 1.8 0 0 0 12.5 12 V4" />
          <path d="M3.5 8 A4.5 1.8 0 0 0 12.5 8" />
        </svg>
      )
    case 'webgpt': // ChatGPT (веб) — облачко чата с точками
    case 'webgemini': // Gemini (веб)
    case 'webglm': // GLM (веб)
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="5.6" />
          <path d="M2.7 6.4 H13.3 M2.7 9.6 H13.3" />
          <path d="M8 2.4 C5.6 4.2 5.6 11.8 8 13.6 C10.4 11.8 10.4 4.2 8 2.4 Z" />
        </svg>
      )
    case 'notebook': // Jupyter — тетрадь с пружиной
      return (
        <svg {...p}>
          <rect x="4" y="2.5" width="9" height="11" rx="1" />
          <line x1="6" y1="2.5" x2="6" y2="13.5" />
          <line x1="8" y1="6" x2="11" y2="6" />
          <line x1="8" y1="8.5" x2="11" y2="8.5" />
          <line x1="8" y1="11" x2="10" y2="11" />
        </svg>
      )
    case 'pdf': // PDF — документ с плашкой
      return (
        <svg {...p}>
          <path d="M4 2.5 H9.5 L12.5 5.5 V13 A0.5 0.5 0 0 1 12 13.5 H4 A0.5 0.5 0 0 1 3.5 13 V3 A0.5 0.5 0 0 1 4 2.5 Z" />
          <path d="M9.5 2.5 V5.5 H12.5" />
          <rect x="5.2" y="8.6" width="5.6" height="2.9" rx="0.6" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'orchestrator': // Оркестратор — хаб со спутниками
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="2" />
          <circle cx="8" cy="2.7" r="1.1" />
          <circle cx="13" cy="10.2" r="1.1" />
          <circle cx="3" cy="10.2" r="1.1" />
          <line x1="8" y1="6" x2="8" y2="3.8" />
          <line x1="9.6" y1="9" x2="12.1" y2="9.5" />
          <line x1="6.4" y1="9" x2="3.9" y2="9.5" />
        </svg>
      )
    case 'orchtask': // Подзадача — ромб-узел
      return (
        <svg {...p}>
          <path d="M8 2.5 L13.5 8 L8 13.5 L2.5 8 Z" />
          <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'orchcall': // Вызов роли — play в круге
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="5.6" />
          <path d="M6.6 5.6 L11 8 L6.6 10.4 Z" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'list': // Список — колонки-плашки
    case 'listcard':
      return (
        <svg {...p}>
          <rect x="2.5" y="3" width="4" height="10" rx="1.2" />
          <rect x="9.5" y="3" width="4" height="10" rx="1.2" />
          <line x1="3.4" y1="5.4" x2="5.6" y2="5.4" />
          <line x1="10.4" y1="5.4" x2="12.6" y2="5.4" />
        </svg>
      )
    case 'kanban': // Канбан — колонки с карточками
      return (
        <svg {...p}>
          <rect x="2" y="2.5" width="5" height="11" rx="1.2" />
          <rect x="9" y="2.5" width="5" height="11" rx="1.2" />
          <rect x="3" y="4.2" width="3" height="2.2" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="3" y="7.4" width="3" height="2.2" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="10" y="4.2" width="3" height="2.2" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'board': // Бэклог — несколько досок (стопка канбанов)
      return (
        <svg {...p}>
          <rect x="2" y="2.2" width="12" height="4.2" rx="1" />
          <rect x="2" y="7.6" width="12" height="6.2" rx="1" />
          <line x1="6" y1="7.6" x2="6" y2="13.8" />
          <line x1="10" y1="7.6" x2="10" y2="13.8" />
        </svg>
      )
    case 'sheet': // Таблица — сетка
      return (
        <svg {...p}>
          <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
          <line x1="2.5" y1="6.3" x2="13.5" y2="6.3" />
          <line x1="2.5" y1="9.6" x2="13.5" y2="9.6" />
          <line x1="6.2" y1="3" x2="6.2" y2="13" />
          <line x1="9.9" y1="3" x2="9.9" y2="13" />
        </svg>
      )
    default:
      return (
        <svg {...p}>
          <rect x="4" y="4" width="8" height="8" rx="2" />
        </svg>
      )
  }
}

// Фирменные иконки КАТЕГОРИЙ нод в сайдбаре (отличаются от иконок отдельных нод).
export function GroupIcon({ id, size = 18 }: { id: string; size?: number }): JSX.Element {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  }
  switch (id) {
    case 'assist': // Ассистент — искры/спарклы
      return (
        <svg {...p}>
          <path d="M6.2 2.4 L7.1 5.1 L9.8 6 L7.1 6.9 L6.2 9.6 L5.3 6.9 L2.6 6 L5.3 5.1 Z" />
          <path d="M11.4 8.6 L11.9 10 L13.3 10.5 L11.9 11 L11.4 12.4 L10.9 11 L9.5 10.5 L10.9 10 Z" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'docs': // Документы и текст — папка
      return (
        <svg {...p}>
          <path d="M2.5 4.6 A1 1 0 0 1 3.5 3.6 H6.4 L7.6 4.9 H12.5 A1 1 0 0 1 13.5 5.9 V11 A1 1 0 0 1 12.5 12 H3.5 A1 1 0 0 1 2.5 11 Z" />
        </svg>
      )
    case 'code': // Код и данные — терминал
      return (
        <svg {...p}>
          <rect x="2.3" y="3" width="11.4" height="10" rx="1.6" />
          <path d="M4.8 6.6 L6.6 8.2 L4.8 9.8" />
          <line x1="8" y1="9.8" x2="10.6" y2="9.8" />
        </svg>
      )
    case 'media': // Медиа — картинка со спарклом (генерация)
      return (
        <svg {...p}>
          <rect x="2.4" y="4" width="9" height="7.4" rx="1.3" />
          <circle cx="4.9" cy="6.3" r="0.95" />
          <path d="M2.8 10.2 L5.3 7.9 L7.2 9.3 L8.9 7.6 L11.4 9.9" />
          <path d="M12.6 3.4 L13 4.6 L14.2 5 L13 5.4 L12.6 6.6 L12.2 5.4 L11 5 L12.2 4.6 Z" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'agents': // ИИ-агенты — робот
      return (
        <svg {...p}>
          <rect x="3.4" y="5.2" width="9.2" height="7" rx="2.2" />
          <line x1="8" y1="5.2" x2="8" y2="3.1" />
          <circle cx="8" cy="2.6" r="0.85" fill="currentColor" stroke="none" />
          <circle cx="6.1" cy="8.2" r="0.95" fill="currentColor" stroke="none" />
          <circle cx="9.9" cy="8.2" r="0.95" fill="currentColor" stroke="none" />
          <line x1="6.6" y1="10.4" x2="9.4" y2="10.4" />
        </svg>
      )
    case 'webchats': // Веб-чаты (логин) — глобус с меридианами
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="5.6" />
          <path d="M2.7 6.4 H13.3 M2.7 9.6 H13.3" />
          <path d="M8 2.4 C5.6 4.2 5.6 11.8 8 13.6 C10.4 11.8 10.4 4.2 8 2.4 Z" />
        </svg>
      )
    default:
      return (
        <svg {...p}>
          <rect x="4" y="4" width="8" height="8" rx="2" />
        </svg>
      )
  }
}
