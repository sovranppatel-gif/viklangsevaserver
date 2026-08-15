import './config/env.js'
import app from './index.js'
import { connectDB } from './config/db.js'

const PORT = Number(process.env.PORT) || 5000

async function start() {
  await connectDB()

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start().catch((error) => {
  console.error('Failed to start server:', error.message)
  process.exit(1)
})
