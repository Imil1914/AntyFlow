// SVG-иконки сайдбара и панелей (1:1 из макета «Персональная ОС»)

type IconProps = { size?: number }

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4
})

export function IconFiles({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="2" y="2" width="12" height="4" rx="1" />
      <rect x="2" y="9" width="12" height="4" rx="1" />
    </svg>
  )
}

// Холст — доска-фрейм с двумя связанными нодами (символ бесконечного холста Flow)
export function IconCanvas({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="2" y="3" width="12" height="10" rx="1.6" />
      <circle cx="5.6" cy="6.8" r="1.3" />
      <circle cx="10.4" cy="9.6" r="1.3" />
      <line x1="6.7" y1="7.6" x2="9.3" y2="8.8" />
    </svg>
  )
}

// Логотип Obsidian — фиолетовый гранёный кристалл (для ноды заметок).
// Задаём собственный градиент/цвет, поэтому не наследует currentColor.
export function IconObsidian({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M4.3 2.9 H11.7 L14 6.3 L8 14.4 L2 6.3 Z"
        fill="#7C3AED"
        stroke="#A78BFA"
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      <path d="M4.3 2.9 L6.1 6.3 L2 6.3" stroke="#C4B5FD" strokeWidth={0.7} fill="none" strokeLinejoin="round" />
      <path d="M11.7 2.9 L9.9 6.3 L14 6.3" stroke="#C4B5FD" strokeWidth={0.7} fill="none" strokeLinejoin="round" />
      <path d="M6.1 6.3 L8 14.4 L9.9 6.3 Z" fill="#6D28D9" stroke="none" />
      <line x1="2" y1="6.3" x2="14" y2="6.3" stroke="#C4B5FD" strokeWidth={0.7} />
    </svg>
  )
}

export function IconGraph({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="4" cy="4" r="2" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="7" cy="12" r="2" />
      <line x1="5.5" y1="5.2" x2="10.4" y2="5.7" />
      <line x1="5" y1="10.6" x2="4.5" y2="6" />
      <line x1="8.6" y1="10.9" x2="10.8" y2="7.5" />
    </svg>
  )
}

export function IconAgents({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="5" width="10" height="8" rx="2" />
      <line x1="8" y1="5" x2="8" y2="2" />
      <circle cx="8" cy="2" r="1" />
      <circle cx="6" cy="9" r="0.6" fill="currentColor" />
      <circle cx="10" cy="9" r="0.6" fill="currentColor" />
    </svg>
  )
}

export function IconGen({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M8 2 L9.5 6.5 L14 8 L9.5 9.5 L8 14 L6.5 9.5 L2 8 L6.5 6.5 Z" />
    </svg>
  )
}

export function IconSettings({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="8" cy="8" r="2.4" />
      <circle cx="8" cy="8" r="6" strokeDasharray="2.6 2.2" />
    </svg>
  )
}
