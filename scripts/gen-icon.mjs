// Генератор иконки приложения (без внешних зависимостей).
// Рисуем в 4× разрешении и уменьшаем (сглаживание), кодируем PNG через zlib,
// затем оборачиваем 256×256 PNG в .ico. Дизайн: скруглённый градиентный квадрат
// с граф-мотивом (узлы + связи) — в стиле «Персональной ОС».
import zlib from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'build')
mkdirSync(OUT, { recursive: true })

const SIZE = 256
const SS = 4 // суперсэмплинг
const N = SIZE * SS

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const A = hex('#22D3EE') // акцент-циан
const B = hex('#5B7CFF') // сине-фиолетовый
const lerp = (a, b, t) => Math.round(a + (b - a) * t)

// буфер большого разрешения RGBA
const big = new Uint8ClampedArray(N * N * 4)

function inRoundRect(x, y, n, r) {
  const half = n / 2
  const dx = Math.max(Math.abs(x - half) - (half - r), 0)
  const dy = Math.max(Math.abs(y - half) - (half - r), 0)
  return dx * dx + dy * dy <= r * r
}
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy || 1
  let t = ((px - ax) * dx + (py - ay) * dy) / l2
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

const R = 58 * SS
const nodes = [
  [90, 96, 20],
  [176, 118, 15],
  [116, 182, 17]
].map(([x, y, r]) => [x * SS, y * SS, r * SS])
const links = [
  [0, 1],
  [0, 2],
  [1, 2]
]
const lineW = 7 * SS

for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4
    if (!inRoundRect(x, y, N, R)) {
      big[i + 3] = 0
      continue
    }
    // градиент по диагонали
    const t = (x + y) / (2 * (N - 1))
    let r = lerp(A[0], B[0], t)
    let g = lerp(A[1], B[1], t)
    let b = lerp(A[2], B[2], t)
    // связи (белые, полупрозрачные поверх фона)
    let lit = 0
    for (const [u, v] of links) {
      const d = distSeg(x, y, nodes[u][0], nodes[u][1], nodes[v][0], nodes[v][1])
      if (d <= lineW / 2) lit = Math.max(lit, 0.85)
    }
    // узлы (сплошной белый с лёгкой обводкой)
    let node = 0
    for (const [nx, ny, nr] of nodes) {
      const d = Math.hypot(x - nx, y - ny)
      if (d <= nr) node = 1
    }
    if (node) {
      r = 255
      g = 255
      b = 255
    } else if (lit) {
      r = lerp(r, 255, lit)
      g = lerp(g, 255, lit)
      b = lerp(b, 255, lit)
    }
    big[i] = r
    big[i + 1] = g
    big[i + 2] = b
    big[i + 3] = 255
  }
}

// даунсэмпл SS×SS → 256×256 (среднее, даёт сглаживание)
const rgba = Buffer.alloc(SIZE * SIZE * 4)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let r = 0
    let g = 0
    let b = 0
    let a = 0
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const j = ((y * SS + sy) * N + (x * SS + sx)) * 4
        r += big[j]
        g += big[j + 1]
        b += big[j + 2]
        a += big[j + 3]
      }
    }
    const c = SS * SS
    const o = (y * SIZE + x) * 4
    rgba[o] = Math.round(r / c)
    rgba[o + 1] = Math.round(g / c)
    rgba[o + 2] = Math.round(b / c)
    rgba[o + 3] = Math.round(a / c)
  }
}

// --- PNG-энкодер ---
const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return (buf) => {
    let c = 0xffffffff
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
})()
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(CRC(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}
function encodePng(width, height, rgbaBuf) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const raw = Buffer.alloc(height * (width * 4 + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0 // filter none
    rgbaBuf.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

const png = encodePng(SIZE, SIZE, rgba)
writeFileSync(join(OUT, 'icon.png'), png)

// --- ICO (одна запись 256×256, встроенный PNG) ---
const dir = Buffer.alloc(6)
dir.writeUInt16LE(0, 0) // reserved
dir.writeUInt16LE(1, 2) // type = icon
dir.writeUInt16LE(1, 4) // count
const entry = Buffer.alloc(16)
entry[0] = 0 // width 256 → 0
entry[1] = 0 // height 256 → 0
entry[2] = 0 // colors
entry[3] = 0 // reserved
entry.writeUInt16LE(1, 4) // planes
entry.writeUInt16LE(32, 6) // bpp
entry.writeUInt32LE(png.length, 8) // size
entry.writeUInt32LE(6 + 16, 12) // offset
writeFileSync(join(OUT, 'icon.ico'), Buffer.concat([dir, entry, png]))

console.log('icon.png', png.length, 'bytes; icon.ico', 6 + 16 + png.length, 'bytes → ' + OUT)
