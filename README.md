# AI Video Generator & CapCut-Style Editors

A modern, high-performance web application built with **Vue.js 3**, **TypeScript**, **Pinia**, **Tailwind CSS**, and **Node.js/FFmpeg**.

The application allows users to generate a 10-second AI video using Google Gemini / Veo API, upload a 6-second user video, customize them with real-time CapCut-style cinematic filters, position interactive draggable text layers, and export a merged 16-second final composition via FFmpeg.

---

## 🚀 Key Features

1. **AI Video Generation (00:00 - 00:10)**
   - Powered by Google Gemini / Veo 2.0 API (`veo-2.0-generate-video:predictLongRunning`).
   - Secure backend proxy with asynchronous operation polling.
   - Built-in procedural video generator fallback for offline or testing mode without API keys.

2. **User Video Upload & Trim (00:10 - 00:16)**
   - Drag-and-drop video upload (MP4, MOV, WebM up to 250MB).
   - Real-time client-side thumbnail generation and duration analysis.
   - 6-second trim window slider with instant preview.

3. **CapCut-Style Real-Time Cinematic Filters**
   - 12 individual adjustment sliders: Temperature, Hue (-18°), Saturation (-50%), Brightness (-31%), Contrast (+20%), Highlight (-10%), Shadow (-10%), Illumination (-10%), Sharpen, Particles, Fade, and Vignette.
   - Built-in presets: **Cinematic Default**, **Cyberpunk**, **Warm Vintage**.
   - Custom preset saving to `localStorage`.
   - Real-time animated canvas particles and CSS filter rendering.

4. **Interactive Text Overlay System**
   - Draggable, rotatable, and resizable text layers directly on the video canvas.
   - 9 Google Font pairings: Classic (Inter), Modern (Montserrat), Serif (Playfair Display), Bold (Anton), Elegant (Cinzel), Handwriting (Dancing Script), Retro (Righteous), etc.
   - Fine-grained start/end time markers on the timeline.

5. **4-Track Synchronized Master Timeline (0-16s)**
   - Multi-track timeline layout:
     - **Track 1**: AI Video clip (0s - 10s)
     - **Track 2**: User Video clip (10s - 16s)
     - **Track 3**: Text overlays
     - **Track 4**: Transitions & Effects
   - Seamless dual-element video player engine switching between AI and User clips at exactly 10.0s.

6. **FFmpeg Master Export Engine**
   - Server-side FFmpeg pipeline: video scaling, padding, concatenation, color grading, text overlay burning (`drawtext`), and AAC audio mixing.
   - Real-time progress tracker in modal dialog.

---

## 🛠 Tech Stack

- **Frontend**: Vue.js 3 (Composition API, `<script setup>`), TypeScript, Vite 8, Pinia 4, Vue Router 4, Tailwind CSS v4, Lucide Icons.
- **Backend**: Node.js, Express 5, Multer, `dotenv`, Child Process / FFmpeg CLI.
- **System**: macOS / Linux native FFmpeg binary (`/opt/homebrew/bin/ffmpeg` or `/usr/bin/ffmpeg`).

---

## 🏁 Quick Start

### 1. Prerequisites
- Node.js 18+ (verified on Node v24)
- FFmpeg installed (`brew install ffmpeg` on macOS)

### 2. Installation
```bash
git clone <repo-url>
cd VideoAffiliate
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Optional: set your Google Gemini API key:
```env
GEMINI_API_KEY=your_google_api_key_here
FFMPEG_PATH=/opt/homebrew/bin/ffmpeg
PORT=5001
```
*(If no API key is provided, the application automatically uses the procedural video generator for testing).*

### 4. Running the Application
Run both frontend and backend concurrently:
```bash
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:5001/api](http://localhost:5001/api)

---

## ⌨️ Keyboard Shortcuts

- `Space`: Play / Pause 16-second master timeline
- `Left Arrow`: Step backward 1 second
- `Right Arrow`: Step forward 1 second
- `Delete` / `Backspace`: Remove selected text layer

---

## 📂 Project Structure

```
VideoAffiliate/
├── server/
│   ├── index.ts                # Express server entry point
│   ├── routes/
│   │   └── videoRoutes.ts      # API endpoints (upload, generate, export)
│   └── services/
│       ├── geminiVeoService.ts # Google Veo API client & fallback generator
│       └── videoExportService.ts # FFmpeg rendering & concatenation pipeline
├── src/
│   ├── components/             # 19 CapCut-style Vue components
│   ├── services/               # Frontend API clients (gemini, video, ffmpeg)
│   ├── stores/                 # Pinia stores (project, video, editor)
│   ├── types/                  # TypeScript interfaces (filter, video, text)
│   ├── App.vue                 # Master app shell with keyboard shortcuts
│   └── main.ts                 # Vue application mount
├── uploads/                    # Uploaded user clips
├── generated/                  # AI-generated video clips
└── exports/                    # Final exported 16s MP4 compositions
```

<!-- Project documentation note -->
