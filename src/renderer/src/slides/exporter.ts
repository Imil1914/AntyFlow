import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import pptxgen from 'pptxgenjs'
import SlideView, { type Slide } from './SlideView'
import { renderMermaidIn } from './mermaid'

export type ExportItem = { slide: Slide; image?: string }

// Отрисовать один слайд (1280×720) в PNG
async function slideToPng(item: ExportItem): Promise<string> {
  const markup = renderToStaticMarkup(createElement(SlideView, { slide: item.slide, image: item.image }))
  const holder = document.createElement('div')
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;'
  holder.innerHTML = markup
  document.body.appendChild(holder)
  const slideEl =
    (holder.querySelector('.sd-slide') as HTMLElement) || (holder.firstElementChild as HTMLElement)
  try {
    await renderMermaidIn(holder)
    await new Promise((r) => setTimeout(r, 160))
    const canvas = await html2canvas(slideEl, {
      width: 1280,
      height: 720,
      scale: 1,
      backgroundColor: '#12151c',
      logging: false
    })
    return canvas.toDataURL('image/png')
  } finally {
    document.body.removeChild(holder)
  }
}

export async function slidesToPngs(
  items: ExportItem[],
  onProgress?: (i: number, n: number) => void
): Promise<string[]> {
  const pngs: string[] = []
  for (let i = 0; i < items.length; i++) {
    onProgress?.(i + 1, items.length)
    pngs.push(await slideToPng(items[i]))
  }
  return pngs
}

export async function exportPdf(title: string, pngs: string[]) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1280, 720] })
  pngs.forEach((p, i) => {
    if (i) pdf.addPage([1280, 720], 'landscape')
    pdf.addImage(p, 'PNG', 0, 0, 1280, 720)
  })
  const base64 = pdf.output('datauristring').split(',')[1]
  await window.flow.saveFile({ base64, name: (title || 'presentation') + '.pdf' })
}

export async function exportPptx(title: string, pngs: string[]) {
  const p = new pptxgen()
  p.defineLayout({ name: 'W16x9', width: 13.333, height: 7.5 })
  p.layout = 'W16x9'
  pngs.forEach((png) => {
    const s = p.addSlide()
    s.addImage({ data: png, x: 0, y: 0, w: 13.333, h: 7.5 })
  })
  const base64 = (await p.write({ outputType: 'base64' })) as string
  await window.flow.saveFile({ base64, name: (title || 'presentation') + '.pptx' })
}
