import { Router } from 'express'
import { GALLERY_CMS_KEYS } from '../data/galleryDefaults.js'
import { requireAuth } from '../middleware/auth.js'
import { uploadCmsImage } from '../middleware/upload.js'
import {
  getGalleryPhotos,
  getGalleryVideos,
  getOrCreateGallery,
  toGalleryResponse,
} from '../models/GalleryContent.js'

const router = Router()

router.get('/gallery/photos', async (_req, res) => {
  try {
    const items = await getGalleryPhotos()
    return res.json({ success: true, data: items })
  } catch (error) {
    console.error('Get gallery photos error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load photos.' })
  }
})

router.get('/gallery/videos', async (_req, res) => {
  try {
    const items = await getGalleryVideos()
    return res.json({ success: true, data: items })
  } catch (error) {
    console.error('Get gallery videos error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load videos.' })
  }
})

router.get('/gallery/catalog', async (_req, res) => {
  try {
    const [photos, videos] = await Promise.all([getGalleryPhotos(), getGalleryVideos()])
    return res.json({ success: true, data: { photos, videos } })
  } catch (error) {
    console.error('Get gallery catalog error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load gallery.' })
  }
})

router.get('/gallery/:key', async (req, res) => {
  try {
    const { key } = req.params
    if (!GALLERY_CMS_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: 'Invalid gallery section key.' })
    }
    const doc = await getOrCreateGallery(key)
    return res.json({ success: true, data: toGalleryResponse(doc) })
  } catch (error) {
    console.error('Get gallery CMS error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load gallery content.' })
  }
})

router.put('/gallery/:key', requireAuth, async (req, res) => {
  try {
    const { key } = req.params
    if (!GALLERY_CMS_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: 'Invalid gallery section key.' })
    }

    const body = { ...(req.body || {}) }
    delete body.key
    delete body.updatedAt
    delete body._id

    const doc = await getOrCreateGallery(key)
    doc.data = body
    doc.markModified('data')
    await doc.save()

    return res.json({
      success: true,
      message: 'Gallery content updated successfully.',
      data: toGalleryResponse(doc),
    })
  } catch (error) {
    console.error('Update gallery CMS error:', error)
    return res.status(500).json({ success: false, message: 'Failed to update gallery content.' })
  }
})

router.post('/gallery/upload', requireAuth, (req, res) => {
  uploadCmsImage('gallery')(req, res, (err) => {
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

    const imageUrl = `/uploads/gallery/${req.file.filename}`
    return res.json({
      success: true,
      message: 'Image uploaded successfully.',
      data: { imageUrl },
    })
  })
})

export default router
