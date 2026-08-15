import app from '../src/index.js'
import { connectDB } from '../src/config/db.js'

function isHealthPath(url = '') {
  const pathname = String(url).split('?')[0]
  return (
    pathname === '/api/health' ||
    pathname === '/health' ||
    pathname.endsWith('/api/health')
  )
}

function runExpress(req, res) {
  return new Promise((resolve, reject) => {
    const finish = () => resolve()
    res.on('finish', finish)
    res.on('close', finish)

    try {
      const maybe = app(req, res, (error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })

      if (maybe && typeof maybe.then === 'function') {
        maybe.catch(reject)
      }
    } catch (error) {
      reject(error)
    }
  })
}

export default async function handler(req, res) {
  try {
    if (!isHealthPath(req.url)) {
      await connectDB(process.env.MONGODB_URI)
    }

    await runExpress(req, res)
  } catch (error) {
    console.error('Vercel API Error:', error)

    if (res.headersSent) {
      return
    }

    res.status(500).json({
      success: false,
      message: 'Database unavailable',
      error:
        process.env.NODE_ENV === 'production'
          ? 'Database connection failed'
          : error.message,
    })
  }
}
