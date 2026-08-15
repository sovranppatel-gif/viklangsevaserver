import { Router } from 'express'
import { IMPACT_CMS_KEYS } from '../data/impactDefaults.js'
import { requireAuth } from '../middleware/auth.js'
import { uploadCmsImage } from '../middleware/upload.js'
import { publicUploadPath } from '../utils/publicUrl.js'
import {
  getImpactCampaign,
  getImpactStats,
  getOrCreateImpact,
  getStoryItems,
  toImpactResponse,
} from '../models/ImpactContent.js'

const router = Router()

router.get('/impact/stories', async (_req, res) => {
  try {
    const items = await getStoryItems()
    return res.json({ success: true, data: items })
  } catch (error) {
    console.error('Get impact stories error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load stories.' })
  }
})

router.get('/impact/stats', async (_req, res) => {
  try {
    const items = await getImpactStats()
    return res.json({ success: true, data: items })
  } catch (error) {
    console.error('Get impact stats error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load statistics.' })
  }
})

router.get('/impact/campaign', async (_req, res) => {
  try {
    const data = await getImpactCampaign()
    return res.json({ success: true, data })
  } catch (error) {
    console.error('Get impact campaign error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load campaign.' })
  }
})

router.get('/impact/:key', async (req, res) => {
  try {
    const { key } = req.params
    if (!IMPACT_CMS_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: 'Invalid impact section key.' })
    }
    const doc = await getOrCreateImpact(key)
    return res.json({ success: true, data: toImpactResponse(doc) })
  } catch (error) {
    console.error('Get impact CMS error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load impact content.' })
  }
})

router.put('/impact/:key', requireAuth, async (req, res) => {
  try {
    const { key } = req.params
    if (!IMPACT_CMS_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: 'Invalid impact section key.' })
    }

    const body = { ...(req.body || {}) }
    delete body.key
    delete body.updatedAt
    delete body._id

    if (key === 'impact-campaign') {
      body.goal = Number(body.goal) || 0
      body.raised = Number(body.raised) || 0
      body.donorsToday = Number(body.donorsToday) || 0
      body.totalDonors = Number(body.totalDonors) || 0
    }

    if (key === 'impact-stats' && Array.isArray(body.items)) {
      body.items = body.items.map((item) => ({
        ...item,
        value: Number(item.value) || 0,
      }))
    }

    const doc = await getOrCreateImpact(key)
    doc.data = body
    doc.markModified('data')
    await doc.save()

    return res.json({
      success: true,
      message: 'Impact content updated successfully.',
      data: toImpactResponse(doc),
    })
  } catch (error) {
    console.error('Update impact CMS error:', error)
    return res.status(500).json({ success: false, message: 'Failed to update impact content.' })
  }
})

router.post('/impact/upload', requireAuth, (req, res) => {
  uploadCmsImage('impact')(req, res, (err) => {
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

    const imageUrl = publicUploadPath('impact', req.file.filename)
    return res.json({
      success: true,
      message: 'Image uploaded successfully.',
      data: { imageUrl },
    })
  })
})

export default router
