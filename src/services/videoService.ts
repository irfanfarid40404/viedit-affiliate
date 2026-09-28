import type { VideoClip } from '@/types/video'
import type { TextItem } from '@/types/text'

const FONT_MAP: Record<string, string> = {
  Classic: "'Cinzel', serif",
  Modern: "'Montserrat', sans-serif",
  Serif: "'Playfair Display', serif",
  Sans: "'Inter', sans-serif",
  Bold: "'Anton', sans-serif",
  Elegant: "'Dancing Script', cursive",
  Handwriting: "'Dancing Script', cursive",
  Retro: "'Righteous', cursive",
  Minimal: "'Space Grotesk', sans-serif",
}

export interface VideoMetadata {
  duration: number
  width: number
  height: number
  thumbnailUrl: string
}

export const videoService = {
  /**
   * Validate uploaded video file
   */
  validateVideoFile(file: File): { valid: boolean; error?: string } {
    const validMimeTypes = [
      'video/mp4',
      'video/quicktime', // .mov
      'video/webm',
      'video/x-matroska',
    ]

    const validExtensions = ['.mp4', '.mov', '.webm', '.mkv']
    const hasValidExt = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    )

    if (!validMimeTypes.includes(file.type) && !hasValidExt) {
      return {
        valid: false,
        error: 'Invalid video format. Please upload MP4, MOV, or WebM.',
      }
    }

    // 250 MB max limit
    const maxSizeBytes = 250 * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: 'File size too large. Maximum allowed size is 250 MB.',
      }
    }

    return { valid: true }
  },

  /**
   * Extract video duration, dimensions, and generate a thumbnail
   */
  async extractVideoMetadata(file: File): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const objectUrl = URL.createObjectURL(file)
      video.preload = 'metadata'
      video.muted = true
      video.playsInline = true
      video.src = objectUrl

      video.onloadedmetadata = () => {
        // seek to 0.5s or 25% of video to capture thumbnail
        video.currentTime = Math.min(1.0, video.duration / 4)
      }

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = Math.min(video.videoWidth || 360, 480)
          canvas.height = (canvas.width * (video.videoHeight || 640)) / (video.videoWidth || 360)

          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          }

          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8)
          const duration = video.duration
          const width = video.videoWidth
          const height = video.videoHeight

          URL.revokeObjectURL(objectUrl)
          resolve({
            duration,
            width,
            height,
            thumbnailUrl,
          })
        } catch (err) {
          URL.revokeObjectURL(objectUrl)
          reject(err)
        }
      }

      video.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Unable to process video file. The codec may not be supported.'))
      }
    })
  },

  /**
   * Create standard VideoClip object from uploaded file
   */
  async createClipFromFile(file: File): Promise<VideoClip> {
    const meta = await this.extractVideoMetadata(file)
    const url = URL.createObjectURL(file)

    const isLongerThan6s = meta.duration > 6.1

    return {
      id: 'clip-' + Date.now(),
      name: file.name,
      url,
      file,
      duration: isLongerThan6s ? 6 : Math.round(meta.duration * 10) / 10,
      startTime: 10, // positioned at 10s mark
      trimStart: 0,
      trimEnd: isLongerThan6s ? 6 : meta.duration,
      size: file.size,
      thumbnailUrl: meta.thumbnailUrl,
      width: meta.width,
      height: meta.height,
    }
  },

  /**
   * Upload video file directly to Vercel Blob via server endpoint
   */
  async uploadToBlob(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData()
    formData.append('video', file)

    const response = await fetch('/api/upload-blob', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to upload video to Vercel Blob')
    }

    const data = await response.json()
    return data.file
  },

  /**
   * Format seconds to mm:ss or mm:ss:ms
   */
  formatTime(seconds: number, includeMs = false): string {
    const safeSec = Math.max(0, seconds)
    const mins = Math.floor(safeSec / 60)
    const secs = Math.floor(safeSec % 60)
    const ms = Math.floor((safeSec % 1) * 100)

    const mStr = String(mins).padStart(2, '0')
    const sStr = String(secs).padStart(2, '0')

    if (includeMs) {
      const msStr = String(ms).padStart(2, '0')
      return `${mStr}:${sStr}.${msStr}`
    }
    return `${mStr}:${sStr}`
  },

  /**
   * Format bytes to readable size
   */
  formatBytes(bytes: number, decimals = 1): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  },

  /**
   * Render individual text item onto a full-resolution transparent PNG canvas
   */
  async renderTextItemToBlob(
    item: TextItem,
    canvasW: number,
    canvasH: number
  ): Promise<Blob | null> {
    if (!item.text || !item.text.trim()) return null

    const canvas = document.createElement('canvas')
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.clearRect(0, 0, canvasW, canvasH)

    if (document.fonts) {
      await document.fonts.ready
    }

    ctx.save()

    // 1. Position on canvas
    const posX = (item.x / 100) * canvasW
    const posY = (item.y / 100) * canvasH
    ctx.translate(posX, posY)

    // 2. Rotation
    if (item.rotation) {
      ctx.rotate((item.rotation * Math.PI) / 180)
    }

    // 3. Exact proportional scaling to match 720x1280 canonical video
    const resScale = canvasH / 1280
    const effectiveScale = (item.scale || 1) * resScale
    ctx.scale(effectiveScale, effectiveScale)

    // 4. Opacity
    ctx.globalAlpha = item.opacity !== undefined ? item.opacity : 1

    // 5. Font
    const fontStyle = item.italic ? 'italic ' : ''
    const fontWeight = item.bold ? 'bold ' : 'normal '
    const fontSize = item.fontSize || 32
    const fontFamily = FONT_MAP[item.fontFamily] || 'sans-serif'

    ctx.font = `${fontStyle}${fontWeight}${fontSize}px ${fontFamily}`
    ctx.textBaseline = 'middle'
    ctx.textAlign = (item.textAlign as CanvasTextAlign) || 'center'

    // 6. Multi-line split preserving user lines and spaces
    const lines = item.text.split('\n')
    const lineHeight = fontSize * (item.lineHeight || 1.25)
    const totalHeight = lines.length * lineHeight
    const startLineY = -(totalHeight / 2) + lineHeight / 2

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineY = startLineY + i * lineHeight

      // Shadow
      if (item.shadow?.enabled) {
        ctx.shadowColor = item.shadow.color || 'rgba(0,0,0,0.8)'
        ctx.shadowBlur = item.shadow.blur || 8
        ctx.shadowOffsetX = item.shadow.offsetX || 2
        ctx.shadowOffsetY = item.shadow.offsetY || 2
      } else {
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
      }

      // Stroke
      if (item.stroke?.enabled) {
        ctx.strokeStyle = item.stroke.color || '#000000'
        ctx.lineWidth = (item.stroke.width || 2) * 2
        ctx.strokeText(line, 0, lineY)
      }

      // Text Fill
      ctx.fillStyle = item.color || '#ffffff'
      ctx.fillText(line, 0, lineY)

      // Underline
      if (item.underline) {
        const textMetrics = ctx.measureText(line)
        let startX = -textMetrics.width / 2
        if (item.textAlign === 'left') startX = 0
        else if (item.textAlign === 'right') startX = -textMetrics.width

        ctx.strokeStyle = item.color || '#ffffff'
        ctx.lineWidth = Math.max(2, fontSize / 14)
        ctx.beginPath()
        ctx.moveTo(startX, lineY + fontSize * 0.45)
        ctx.lineTo(startX + textMetrics.width, lineY + fontSize * 0.45)
        ctx.stroke()
      }
    }

    ctx.restore()

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png')
    })
  },
}
