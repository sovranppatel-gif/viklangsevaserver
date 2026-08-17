import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Load local .env for development/CLI only.
 * On Vercel, environment variables are injected automatically.
 */
export function loadEnv() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  dotenv.config({ path: path.join(__dirname, '../../.env') })
}

loadEnv()
