import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { Enquiry } from '../models/Enquiry.js'

const router = Router()

function sanitizeText(value, max) {
  return String(value || '')
    .trim()
    .slice(0, max)
}

router.post('/', async (req, res) => {
  try {
    const name = sanitizeText(req.body?.name, 120)
    const email = sanitizeText(req.body?.email, 160).toLowerCase()
    const mobile = sanitizeText(req.body?.mobile, 20)
    const message = sanitizeText(req.body?.message, 5000)

    if (!name || !email || !mobile || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, mobile and message are required.',
      })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      })
    }

    const enquiry = await Enquiry.create({ name, email, mobile, message })

    return res.status(201).json({
      success: true,
      message: 'Thank you. Your message has been received.',
      data: {
        id: enquiry._id.toString(),
      },
    })
  } catch (error) {
    console.error('Create enquiry failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to send your message right now. Please try again.',
    })
  }
})

router.get('/', requireAuth, async (req, res) => {
  try {
    const status = sanitizeText(req.query?.status, 20)
    const filter = {}
    if (status && ['new', 'read', 'archived'].includes(status)) {
      filter.status = status
    }

    const items = await Enquiry.find(filter).sort({ createdAt: -1 }).lean()

    return res.json({
      success: true,
      data: items.map((item) => ({
        id: item._id.toString(),
        name: item.name,
        email: item.email,
        mobile: item.mobile,
        message: item.message,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    })
  } catch (error) {
    console.error('List enquiries failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to load enquiries.',
    })
  }
})

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const status = sanitizeText(req.body?.status, 20)
    if (!['new', 'read', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status.',
      })
    }

    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    ).lean()

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' })
    }

    return res.json({
      success: true,
      message: 'Enquiry updated.',
      data: {
        id: enquiry._id.toString(),
        name: enquiry.name,
        email: enquiry.email,
        mobile: enquiry.mobile,
        message: enquiry.message,
        status: enquiry.status,
        createdAt: enquiry.createdAt,
        updatedAt: enquiry.updatedAt,
      },
    })
  } catch (error) {
    console.error('Update enquiry failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to update enquiry.',
    })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndDelete(req.params.id)
    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' })
    }
    return res.json({ success: true, message: 'Enquiry deleted.' })
  } catch (error) {
    console.error('Delete enquiry failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to delete enquiry.',
    })
  }
})

export default router
