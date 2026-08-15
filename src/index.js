import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })
import { connectDB } from './config/db.js'
import { uploadsRoot } from './middleware/upload.js'
import authRoutes from './routes/auth.js'
import aboutCmsRoutes from './routes/aboutCms.js'
import blogCmsRoutes from './routes/blogCms.js'
import cmsRoutes from './routes/cms.js'
import galleryCmsRoutes from './routes/galleryCms.js'
import programsCmsRoutes from './routes/programsCms.js'
import reportsCmsRoutes from './routes/reportsCms.js'
import impactCmsRoutes from './routes/impactCms.js'
import siteSettingsRoutes from './routes/siteSettings.js'
import enquiriesRoutes from './routes/enquiries.js'
import volunteersRoutes from './routes/volunteers.js'
import studentsRoutes from './routes/students.js'
import donationsRoutes from './routes/donations.js'
import dashboardRoutes from './routes/dashboard.js'
import { seedMasterAdmin } from './seed/seedMasterAdmin.js'

const app = express()
const PORT = Number(process.env.PORT) || 5000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const LAN_ORIGIN_RE =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/

const extraOrigins = (process.env.CLIENT_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const staticOrigins = new Set([
  CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  ...extraOrigins,
])

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || staticOrigins.has(origin) || LAN_ORIGIN_RE.test(origin)) {
        callback(null, true)
        return
      }
      callback(new Error(`CORS blocked: ${origin}`))
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
)
app.use(express.json())
app.use('/uploads', express.static(uploadsRoot))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'viklang-sewa-sansthan-api' })
})

app.use('/api/auth', authRoutes)
app.use('/api/cms', cmsRoutes)
app.use('/api/cms', aboutCmsRoutes)
app.use('/api/cms', programsCmsRoutes)
app.use('/api/cms', blogCmsRoutes)
app.use('/api/cms', galleryCmsRoutes)
app.use('/api/cms', reportsCmsRoutes)
app.use('/api/cms', impactCmsRoutes)
app.use('/api/cms', siteSettingsRoutes)
app.use('/api/enquiries', enquiriesRoutes)
app.use('/api/volunteers', volunteersRoutes)
app.use('/api/students', studentsRoutes)
app.use('/api/donations', donationsRoutes)
app.use('/api/dashboard', dashboardRoutes)

async function start() {
  await connectDB(process.env.MONGODB_URI)
  await seedMasterAdmin()

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start().catch((error) => {
  console.error('Failed to start server:', error.message)
  process.exit(1)
})
