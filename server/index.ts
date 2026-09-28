import express from 'express'
import cors from 'cors'
import path from 'node:path'
import dotenv from 'dotenv'
import { videoRouter } from './routes/videoRoutes'

// Load environment variables (.env.local takes precedence over .env)
dotenv.config({ path: ['.env.local', '.env'] })

const app = express()
const PORT = process.env.PORT || 5001

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Static file hosting for uploads, generated videos, and exported media
const rootDir = process.cwd()
app.use('/uploads', express.static(path.join(rootDir, 'uploads')))
app.use('/generated', express.static(path.join(rootDir, 'generated')))
app.use('/exports', express.static(path.join(rootDir, 'exports')))

// API Routes
app.use('/api', videoRouter)

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ffmpeg: process.env.FFMPEG_PATH || '/opt/homebrew/bin/ffmpeg',
    geminiKeySet: Boolean(process.env.GEMINI_API_KEY),
    routerKeySet: Boolean(process.env.NINEROUTER_API_KEY),
    routerModel: process.env.NINEROUTER_MODEL || null,
    magichourKeySet: Boolean(process.env.MAGICHOUR_API_KEY),
    pixazoKeySet: Boolean(process.env.PIXAZO_API_KEY),
  })
})

app.listen(PORT, () => {
  console.log(`[VideoAffiliate Server] Running at http://localhost:${PORT}`)
})
