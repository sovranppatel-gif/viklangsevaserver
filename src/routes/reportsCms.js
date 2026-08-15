import { Router } from 'express'
import { REPORTS_CMS_KEYS } from '../data/reportsDefaults.js'
import { requireAuth } from '../middleware/auth.js'
import { uploadCmsDocument, uploadCmsImage } from '../middleware/upload.js'
import { publicUploadPath } from '../utils/publicUrl.js'
import {
  getOrCreateReports,
  getReportItems,
  toReportsResponse,
} from '../models/ReportsContent.js'

const router = Router()

router.get('/reports/items', async (_req, res) => {
  try {
    const items = await getReportItems()
    return res.json({ success: true, data: items })
  } catch (error) {
    console.error('Get report items error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load reports.' })
  }
})

router.get('/reports/:key', async (req, res) => {
  try {
    const { key } = req.params
    if (!REPORTS_CMS_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: 'Invalid reports section key.' })
    }
    const doc = await getOrCreateReports(key)
    return res.json({ success: true, data: toReportsResponse(doc) })
  } catch (error) {
    console.error('Get reports CMS error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load reports content.' })
  }
})

router.put('/reports/:key', requireAuth, async (req, res) => {
  try {
    const { key } = req.params
    if (!REPORTS_CMS_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: 'Invalid reports section key.' })
    }

    const body = { ...(req.body || {}) }
    delete body.key
    delete body.updatedAt
    delete body._id

    if (key === 'report-items' && Array.isArray(body.items)) {
      body.items = body.items.map((item) => ({
        ...item,
        placeholder: !String(item.fileUrl || '').trim() || item.fileUrl === '#',
      }))
    }

    const doc = await getOrCreateReports(key)
    doc.data = body
    doc.markModified('data')
    await doc.save()

    return res.json({
      success: true,
      message: 'Reports content updated successfully.',
      data: toReportsResponse(doc),
    })
  } catch (error) {
    console.error('Update reports CMS error:', error)
    return res.status(500).json({ success: false, message: 'Failed to update reports content.' })
  }
})

router.post('/reports/upload', requireAuth, (req, res) => {
  uploadCmsDocument('reports')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File must be 10MB or smaller.'
          : err.message || 'Failed to upload file.'
      return res.status(400).json({ success: false, message })
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please choose a PDF or document file.' })
    }

    const fileUrl = publicUploadPath('reports', req.file.filename)
    return res.json({
      success: true,
      message: 'Document uploaded successfully.',
      data: { fileUrl },
    })
  })
})

router.post('/reports/upload-image', requireAuth, (req, res) => {
  uploadCmsImage('reports')(req, res, (err) => {
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

    const imageUrl = publicUploadPath('reports', req.file.filename)
    return res.json({
      success: true,
      message: 'Image uploaded successfully.',
      data: { imageUrl },
    })
  })
})

export default router
