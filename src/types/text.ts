export type FontFamilyKey =
  | 'Classic'
  | 'Modern'
  | 'Serif'
  | 'Sans'
  | 'Bold'
  | 'Elegant'
  | 'Handwriting'
  | 'Retro'
  | 'Minimal'

export interface FontOption {
  label: FontFamilyKey
  fontFamily: string
  sample: string
}

export const FONT_OPTIONS: FontOption[] = [
  { label: 'Classic', fontFamily: "'Cinzel', serif", sample: 'Classic' },
  { label: 'Modern', fontFamily: "'Montserrat', sans-serif", sample: 'Modern' },
  { label: 'Serif', fontFamily: "'Playfair Display', serif", sample: 'Serif' },
  { label: 'Sans', fontFamily: "'Inter', sans-serif", sample: 'Sans' },
  { label: 'Bold', fontFamily: "'Anton', sans-serif", sample: 'Bold' },
  { label: 'Elegant', fontFamily: "'Dancing Script', cursive", sample: 'Elegant' },
  { label: 'Handwriting', fontFamily: "'Dancing Script', cursive", sample: 'Handwriting' },
  { label: 'Retro', fontFamily: "'Righteous', cursive", sample: 'Retro' },
  { label: 'Minimal', fontFamily: "'Space Grotesk', sans-serif", sample: 'Minimal' },
]

export interface TextShadowStyle {
  enabled: boolean
  color: string
  blur: number
  offsetX: number
  offsetY: number
}

export interface TextStrokeStyle {
  enabled: boolean
  color: string
  width: number
}

export interface TextItem {
  id: string
  text: string
  fontFamily: FontFamilyKey
  fontSize: number
  color: string
  backgroundColor?: string
  x: number // percentage (0-100) or pixel
  y: number // percentage (0-100) or pixel
  rotation: number // degrees
  scale: number
  opacity: number // 0-1
  startTime: number // seconds (e.g. 0 to 16)
  endTime: number // seconds (e.g. 0 to 16)
  bold: boolean
  italic: boolean
  underline: boolean
  shadow: TextShadowStyle
  stroke: TextStrokeStyle
  letterSpacing?: number
  lineHeight?: number
  textAlign?: 'left' | 'center' | 'right'
}
