import './config/env.js'
import cors from 'cors'
import express from 'express'
import { connectDB, describeMongoUri, mongoErrorCode, mongoErrorMessage } from './config/db.js'
import { serveUploadedFile, uploadsRoot } from './middleware/upload.js'
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

const app = express()

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const LAN_ORIGIN_RE =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/
const VERCEL_FRONTEND_RE = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i

const extraOrigins = (process.env.CLIENT_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const staticOrigins = new Set([
  CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://sovranppatel-gif-viklangsevafronten.vercel.app',
  'https://viklangsevafrontend.vercel.app',
  ...extraOrigins,
])

function isAllowedOrigin(origin) {
  if (!origin) return true
  if (staticOrigins.has(origin)) return true
  if (LAN_ORIGIN_RE.test(origin)) return true
  if (VERCEL_FRONTEND_RE.test(origin)) return true
  return false
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true)
        return
      }

      callback(new Error(`CORS blocked origin: ${origin}`))
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
)

app.use(express.json({ limit: '2mb' }))

function sendHealth(_req, res) {
  res.json({
    ok: true,
    service: 'viklang-sewa-sansthan-api',
  })
}

app.get('/api/health', sendHealth)
app.get('/health', sendHealth)

app.get('/api/health/db', async (_req, res) => {
  const uriInfo = describeMongoUri()

  try {
    await connectDB()
    res.json({
      ok: true,
      service: 'viklang-sewa-sansthan-api',
      database: 'connected',
      ...uriInfo,
    })
  } catch (error) {
    const code = error.dbCode || mongoErrorCode(error)
    console.error('Database health check failed:', code)
    res.status(503).json({
      ok: false,
      service: 'viklang-sewa-sansthan-api',
      database: 'unavailable',
      code,
      message: mongoErrorMessage(code),
      ...uriInfo,
    })
  }
})

app.use(async (req, res, next) => {
  if (req.method === 'OPTIONS') {
    next()
    return
  }

  try {
    await connectDB()
    next()
  } catch (error) {
    const code = error.dbCode || mongoErrorCode(error)
    console.error('MongoDB connection failed:', code)
    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        code,
        message: mongoErrorMessage(code),
      })
    }
  }
})

app.get('/uploads/:folder/:filename', serveUploadedFile)
app.get('/api/uploads/:folder/:filename', serveUploadedFile)
app.use('/uploads', express.static(uploadsRoot))
app.use('/api/uploads', express.static(uploadsRoot))

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

app.use((error, _req, res, _next) => {
  console.error('Unhandled error:', error)
  if (res.headersSent) {
    return
  }

  const status = Number(error.status || error.statusCode) || 500
  res.status(status).json({
    success: false,
    message: error.message || 'Internal server error',
  })
})

export default app
