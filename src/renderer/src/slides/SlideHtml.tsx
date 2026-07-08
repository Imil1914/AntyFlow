import { useEffect, useRef } from 'react'
import SlideView, { type Slide } from './SlideView'
import { renderMermaidIn } from './mermaid'

// Слайд, отмасштабированный под ширину карточки (1280×720 → width)
export default function ScaledSlide({
  slide,
  image,
  width
}: {
  slide: Slide
  image?: string
  width: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const scale = width / 1280

  useEffect(() => {
    if (ref.current) renderMermaidIn(ref.current)
  }, [slide, image])

  return (
    <div style={{ width, height: 720 * scale, overflow: 'hidden' }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 1280, height: 720 }}>
        <div ref={ref}>
          <SlideView slide={slide} image={image} />
        </div>
      </div>
    </div>
  )
}
