import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { Admin } from '../models/Admin.js'

const router = Router()

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase()
    const password = String(req.body?.password || '')

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' })
    }

    const admin = await Admin.findOne({ email, isActive: true })
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' })
    }

    const ok = await admin.comparePassword(password)
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' })
    }

    const token = jwt.sign(
      { id: admin._id.toString(), role: admin.role, email: admin.email },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' },
    )

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: admin.toSafeJSON(),
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ success: false, message: 'Server error during login.' })
  }
})

router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to continue.',
      })
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
    const admin = await Admin.findById(payload.id)
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your login session is invalid. Please sign in again.',
      })
    }

    return res.json({ success: true, user: admin.toSafeJSON() })
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Your login session is invalid. Please sign in again.',
    })
  }
})

export default router
