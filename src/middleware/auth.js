import jwt from 'jsonwebtoken'
import { Admin } from '../models/Admin.js'

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null

    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
    const admin = await Admin.findById(payload.id)

    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    req.admin = admin
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }
}
