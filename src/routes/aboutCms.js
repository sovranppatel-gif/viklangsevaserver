import { Router } from 'express'
import { ABOUT_KEYS } from '../data/aboutDefaults.js'
import { requireAuth } from '../middleware/auth.js'
import { uploadCmsImage } from '../middleware/upload.js'
import { publicUploadPath } from '../utils/publicUrl.js'
import { getOrCreateAbout, toAboutResponse } from '../models/AboutContent.js'

const router = Router()

router.get('/about/:key', async (req, res) => {
  try {
    const { key } = req.params
    if (!ABOUT_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: 'Invalid about section key.' })
    }
    const doc = await getOrCreateAbout(key)
    return res.json({ success: true, data: toAboutResponse(doc) })
  } catch (error) {
    console.error('Get about CMS error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load about content.' })
  }
})

router.put('/about/:key', requireAuth, async (req, res) => {
  try {
    const { key } = req.params
    if (!ABOUT_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: 'Invalid about section key.' })
    }

    const body = { ...(req.body || {}) }
    delete body.key
    delete body.updatedAt
    delete body._id
    delete body.id

    const doc = await getOrCreateAbout(key)
    doc.data = body
    doc.markModified('data')
    await doc.save()

    return res.json({
      success: true,
      message: 'About content updated successfully.',
      data: toAboutResponse(doc),
    })
  } catch (error) {
    console.error('Update about CMS error:', error)
    return res.status(500).json({ success: false, message: 'Failed to update about content.' })
  }
})

router.post('/about/upload', requireAuth, (req, res) => {
  uploadCmsImage('about')(req, res, (err) => {
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

    const imageUrl = publicUploadPath('about', req.file.filename)
    return res.json({
      success: true,
      message: 'Image uploaded successfully.',
      data: { imageUrl },
    })
  })
})

export default router
