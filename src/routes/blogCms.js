import { Router } from 'express'
import { BLOG_CMS_KEYS } from '../data/blogDefaults.js'
import { requireAuth } from '../middleware/auth.js'
import { uploadCmsImage } from '../middleware/upload.js'
import {
  getBlogArticles,
  getEventItems,
  getOrCreateBlog,
  toBlogResponse,
} from '../models/BlogContent.js'

const router = Router()

router.get('/blog/articles', async (_req, res) => {
  try {
    const items = await getBlogArticles()
    return res.json({ success: true, data: items })
  } catch (error) {
    console.error('Get blog articles error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load articles.' })
  }
})

router.get('/blog/events', async (_req, res) => {
  try {
    const items = await getEventItems()
    return res.json({ success: true, data: items })
  } catch (error) {
    console.error('Get event items error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load events.' })
  }
})

router.get('/blog/:key', async (req, res) => {
  try {
    const { key } = req.params
    if (!BLOG_CMS_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: 'Invalid blog section key.' })
    }
    const doc = await getOrCreateBlog(key)
    return res.json({ success: true, data: toBlogResponse(doc) })
  } catch (error) {
    console.error('Get blog CMS error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load blog content.' })
  }
})

router.put('/blog/:key', requireAuth, async (req, res) => {
  try {
    const { key } = req.params
    if (!BLOG_CMS_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: 'Invalid blog section key.' })
    }

    const body = { ...(req.body || {}) }
    delete body.key
    delete body.updatedAt
    delete body._id

    const doc = await getOrCreateBlog(key)
    doc.data = body
    doc.markModified('data')
    await doc.save()

    return res.json({
      success: true,
      message: 'Blog content updated successfully.',
      data: toBlogResponse(doc),
    })
  } catch (error) {
    console.error('Update blog CMS error:', error)
    return res.status(500).json({ success: false, message: 'Failed to update blog content.' })
  }
})

router.post('/blog/upload', requireAuth, (req, res) => {
  uploadCmsImage('blog')(req, res, (err) => {
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

    const imageUrl = `/uploads/blog/${req.file.filename}`
    return res.json({
      success: true,
      message: 'Image uploaded successfully.',
      data: { imageUrl },
    })
  })
})

export default router
