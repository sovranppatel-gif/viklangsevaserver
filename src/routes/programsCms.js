import { Router } from 'express'
import { PROGRAM_CMS_KEYS } from '../data/programsDefaults.js'
import { requireAuth } from '../middleware/auth.js'
import { uploadCmsImage } from '../middleware/upload.js'
import {
  getOrCreateProgram,
  getProgramsCatalog,
  toProgramResponse,
} from '../models/ProgramsContent.js'

const router = Router()

router.get('/programs/catalog', async (_req, res) => {
  try {
    const items = await getProgramsCatalog()
    return res.json({ success: true, data: items })
  } catch (error) {
    console.error('Get programs catalog error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load programs.' })
  }
})

router.get('/programs/:key', async (req, res) => {
  try {
    const { key } = req.params
    if (!PROGRAM_CMS_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: 'Invalid programs section key.' })
    }
    const doc = await getOrCreateProgram(key)
    return res.json({ success: true, data: toProgramResponse(doc) })
  } catch (error) {
    console.error('Get programs CMS error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load programs content.' })
  }
})

router.put('/programs/:key', requireAuth, async (req, res) => {
  try {
    const { key } = req.params
    if (!PROGRAM_CMS_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: 'Invalid programs section key.' })
    }

    const body = { ...(req.body || {}) }
    delete body.key
    delete body.updatedAt
    delete body._id
    delete body.id

    // keep stable id/slug for program items from defaults if missing
    const doc = await getOrCreateProgram(key)
    const next = { ...body }
    if (key.startsWith('program-')) {
      next.id = doc.data?.id || next.slug || key.replace('program-', '')
      next.slug = next.slug || doc.data?.slug || next.id
    }

    doc.data = next
    doc.markModified('data')
    await doc.save()

    return res.json({
      success: true,
      message: 'Programs content updated successfully.',
      data: toProgramResponse(doc),
    })
  } catch (error) {
    console.error('Update programs CMS error:', error)
    return res.status(500).json({ success: false, message: 'Failed to update programs content.' })
  }
})

router.post('/programs/upload', requireAuth, (req, res) => {
  uploadCmsImage('programs')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Image must be 5MB or smaller.'
          : err.message || 'Failed to upload image.'
      return res.status(400).json({ success: false, message })
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please choose an image file.' })
    }

    const imageUrl = `/uploads/programs/${req.file.filename}`
    return res.json({
      success: true,
      message: 'Image uploaded successfully.',
      data: { imageUrl },
    })
  })
})

export default router
