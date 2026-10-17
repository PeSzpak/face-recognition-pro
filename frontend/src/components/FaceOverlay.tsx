import clsx from 'clsx'
import { percent } from '@/lib/format'
import type { FaceResult } from '@/lib/types'

interface FaceOverlayProps {
  faces: FaceResult[]
  width: number
  height: number
  mirrored?: boolean
  selected?: number
  onSelect?: (index: number) => void
}

/** Draws detection boxes over an image or video that fills its parent with object-contain semantics. */
export function FaceOverlay({ faces, width, height, mirrored, selected, onSelect }: FaceOverlayProps) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {faces.map((face, index) => {
        const x = mirrored ? width - face.box.x - face.box.w : face.box.x
        const known = face.status === 'identified'
        const label = known ? `${face.person!.name} · ${percent(face.person!.similarity)}` : 'Desconhecido'
        const stroke = known ? 'rgb(var(--ok))' : 'rgb(var(--warn))'
        const scale = width / 640
        const fontSize = Math.max(11, 13 * scale)
        const corner = Math.min(face.box.w, face.box.h) * 0.22
        const { y, w, h } = face.box
        return (
          <g
            key={index}
            className={clsx(onSelect && 'pointer-events-auto cursor-pointer')}
            onClick={() => onSelect?.(index)}
            opacity={selected === undefined || selected === index ? 1 : 0.45}
          >
            <rect x={x} y={y} width={w} height={h} fill={stroke} fillOpacity={0.06} stroke={stroke} strokeOpacity={0.35} strokeWidth={1.5 * scale} rx={4 * scale} />
            <path
              d={`M${x} ${y + corner}V${y}H${x + corner} M${x + w - corner} ${y}H${x + w}V${y + corner} M${x + w} ${y + h - corner}V${y + h}H${x + w - corner} M${x + corner} ${y + h}H${x}V${y + h - corner}`}
              fill="none"
              stroke={stroke}
              strokeWidth={3 * scale}
              strokeLinecap="round"
            />
            <g transform={`translate(${x}, ${Math.max(0, y - fontSize * 1.9)})`}>
              <rect width={label.length * fontSize * 0.58 + fontSize} height={fontSize * 1.6} rx={4 * scale} fill={stroke} />
              <text x={fontSize * 0.5} y={fontSize * 1.12} fontSize={fontSize} fontWeight={600} fill="rgb(var(--canvas))" fontFamily="Geist, sans-serif">
                {label}
              </text>
            </g>
          </g>
        )
      })}
    </svg>
  )
}
