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
    default:
      return (
        <svg {...p}>
          <rect x="4" y="4" width="8" height="8" rx="2" />
        </svg>
      )
  }
}
