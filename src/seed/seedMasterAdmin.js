import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { connectDB } from '../config/db.js'
import { Admin } from '../models/Admin.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../.env') })

export async function seedMasterAdmin() {
  const email = (process.env.MASTER_ADMIN_EMAIL || 'vss.about@gmail.com').toLowerCase().trim()
  const password = process.env.MASTER_ADMIN_PASSWORD || 'admin123'

  const existing = await Admin.findOne({ email })
  if (existing) {
    console.log(`Master admin already exists: ${email}`)
    return existing
  }

  const admin = await Admin.create({
    email,
    password,
    role: 'master-admin',
    name: 'Master Admin',
  })

  console.log(`Master admin created: ${email}`)
  return admin
}

async function run() {
  try {
    await connectDB(process.env.MONGODB_URI)
    await seedMasterAdmin()
  } catch (error) {
    console.error('Seed failed:', error.message)
    process.exitCode = 1
  } finally {
    process.exit()
  }
}

const isDirectRun = process.argv[1] && process.argv[1].includes('seedMasterAdmin')
if (isDirectRun) {
  run()
}
