import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { put } from '@vercel/blob'
import { geminiVeoService } from '../services/geminiVeoService'
import { videoExportService } from '../services/videoExportService'

export const videoRouter = Router()

// Memory storage for Vercel Blob uploads
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/x-matroska',
      'image/png',
      'image/jpeg',
      'image/webp',
    ]
    if (allowed.includes(file.mimetype) || /\.(mp4|mov|webm|mkv|png|jpg|jpeg|webp)$/i.test(file.originalname)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file format. Supported: MP4, MOV, WebM, MKV, PNG, JPG'))
    }
  },
})

// Configure Multer for local video file upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const uniqueName = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`
    cb(null, uniqueName)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 250 * 1024 * 1024 }, // 250MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/x-matroska',
      'image/png',
      'image/jpeg',
      'image/webp',
    ]
    if (allowed.includes(file.mimetype) || /\.(mp4|mov|webm|mkv|png|jpg|jpeg|webp)$/i.test(file.originalname)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file format. Supported: MP4, MOV, WebM, MKV, PNG, JPG'))
    }
  },
})

/**
 * 1. Upload Video Endpoint
 * POST /api/upload-video
 */
videoRouter.post('/upload-video', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' })
  }

  const fileUrl = `/uploads/${req.file.filename}`
  res.json({
    success: true,
    file: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: fileUrl,
    },
  })
})

/**
 * 1b. Upload to Vercel Blob Endpoint
 * POST /api/upload-blob
 */
videoRouter.post('/upload-blob', memoryUpload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token || token === '[SENSITIVE]') {
      return res.status(500).json({
        error: 'BLOB_READ_WRITE_TOKEN is missing or marked [SENSITIVE]. Please set the real token in .env or .env.local',
      })
    }

    const ext = path.extname(req.file.originalname)
    const blobKey = `videos/upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`

    const blob = await put(blobKey, req.file.buffer, {
      access: 'public',
      contentType: req.file.mimetype,
      token,
    })

    res.json({
      success: true,
      file: {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        pathname: blob.pathname,
      },
    })
  } catch (error: any) {
    console.error('Vercel Blob upload failed:', error)
    res.status(500).json({ error: error.message || 'Failed to upload to Vercel Blob' })
  }
})

/**
 * 2. Generate AI Video (Veo 2.0) Endpoint
 * POST /api/generate-video
 */
videoRouter.post('/generate-video', async (req, res) => {
  try {
    const { prompt, aspectRatio, quality } = req.body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    const outputDir = path.join(process.cwd(), 'generated')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const task = await geminiVeoService.startGeneration(
      { prompt, aspectRatio, quality },
      outputDir
    )

    res.json(task)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to start video generation' })
  }
})

/**
 * 3. Check AI Generation Status Endpoint
 * GET /api/generate-video/status/:operationId
 */
videoRouter.get('/generate-video/status/:operationId', (req, res) => {
  const { operationId } = req.params
  const task = geminiVeoService.getStatus(operationId)

  if (!task) {
    return res.status(404).json({ error: 'Operation not found' })
  }

  res.json(task)
})

/**
 * 4. Export Video Endpoint
 * POST /api/export-video
 */
videoRouter.post(
  '/export-video',
  upload.any(),
  async (req, res) => {
    try {
      const rootDir = process.cwd()
      const exportsDir = path.join(rootDir, 'exports')
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true })
      }

      let exportPayload = req.body
      if (req.body.projectJson) {
        try {
          const parsed = JSON.parse(req.body.projectJson)
          exportPayload = {
            aiVideoUrl: parsed.aiVideo?.cloudUrl || parsed.aiVideo?.url || parsed.aiVideoUrl,
            userVideoUrl: parsed.userVideo?.cloudUrl || parsed.userVideo?.url || parsed.userVideoUrl,
            userVideoTrimStart: parsed.userVideo?.trimStart !== undefined ? parsed.userVideo.trimStart : parsed.userVideoTrimStart,
            userVideoTrimEnd: parsed.userVideo?.trimEnd !== undefined ? parsed.userVideo.trimEnd : parsed.userVideoTrimEnd,
            userVideoCrop: parsed.userVideo?.crop || parsed.userVideoCrop,
            aiVideoCrop: parsed.aiVideo?.crop || parsed.aiVideoCrop,
            filters: parsed.filters,
            texts: parsed.texts,
            transition: parsed.transition,
            effects: parsed.effects,
            audio: parsed.audio,
            aspectRatio: parsed.aspectRatio,
            resolution: parsed.resolution || '1080p',
          }
        } catch (e) {
          // fallback to raw body
        }
      }

      const files = req.files as Express.Multer.File[] | undefined
      if (files && Array.isArray(files)) {
        const textOverlayPaths: { path: string; startTime: number; endTime: number }[] = []
        for (const file of files) {
          if (file.fieldname === 'userVideoFile') {
            exportPayload.userVideoUrl = `/uploads/${file.filename}`
          } else if (file.fieldname === 'aiVideoFile') {
            exportPayload.aiVideoUrl = `/uploads/${file.filename}`
          } else if (file.fieldname.startsWith('textOverlay_')) {
            const parts = file.fieldname.split('_')
            const idx = parseInt(parts[1], 10)
            const textItem = exportPayload.texts?.[idx]
            textOverlayPaths.push({
              path: path.join(rootDir, 'uploads', file.filename),
              startTime: textItem?.startTime || 0,
              endTime: Math.min(10, textItem?.endTime || 10),
            })
          }
        }
        exportPayload.textOverlayPaths = textOverlayPaths
      } else if (req.file) {
        exportPayload.userVideoUrl = `/uploads/${req.file.filename}`
      }

      const job = await videoExportService.startExport(exportPayload, rootDir)
      res.json(job)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to start video export' })
  }
})

/**
 * 5. Check Export Status Endpoint
 * GET /api/export-video/status/:jobId
 */
videoRouter.get('/export-video/status/:jobId', (req, res) => {
  const { jobId } = req.params
  const job = videoExportService.getStatus(jobId)

  if (!job) {
    return res.status(404).json({ error: 'Export job not found' })
  }

  res.json(job)
})
