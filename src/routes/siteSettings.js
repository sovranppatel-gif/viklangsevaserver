import { Router } from 'express'
import { SITE_SETTINGS_KEYS } from '../data/siteSettingsDefaults.js'
import { requireAuth } from '../middleware/auth.js'
import { uploadCmsImage } from '../middleware/upload.js'
import { getOrCreateSiteSettings, toSiteSettingsResponse } from '../models/SiteSettings.js'
import { publicUploadPath } from '../utils/publicUrl.js'

const router = Router()

router.post('/settings/donate/upload', requireAuth, (req, res) => {
  uploadCmsImage('donate')(req, res, (err) => {
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

    const imageUrl = publicUploadPath('donate', req.file.filename)
    return res.json({
      success: true,
      message: 'QR image uploaded successfully.',
      data: { imageUrl },
    })
  })
})

router.get('/settings/:key', async (req, res) => {
  try {
    const { key } = req.params
    if (!SITE_SETTINGS_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: 'Invalid settings key.' })
    }
    const doc = await getOrCreateSiteSettings(key)
    return res.json({ success: true, data: toSiteSettingsResponse(doc) })
  } catch (error) {
    console.error('Get site settings error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load settings.' })
  }
})

router.put('/settings/:key', requireAuth, async (req, res) => {
  try {
    const { key } = req.params
    if (!SITE_SETTINGS_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: 'Invalid settings key.' })
    }

    const body = { ...(req.body || {}) }
    delete body.key
    delete body.updatedAt
    delete body._id
    delete body.id

    const doc = await getOrCreateSiteSettings(key)
    doc.data = body
    doc.markModified('data')
    await doc.save()

    return res.json({
      success: true,
      message: 'Settings updated successfully.',
      data: toSiteSettingsResponse(doc),
    })
  } catch (error) {
    console.error('Update site settings error:', error)
    return res.status(500).json({ success: false, message: 'Failed to update settings.' })
  }
})

export default router
