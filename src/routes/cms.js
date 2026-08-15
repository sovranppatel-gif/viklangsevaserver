import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { uploadHeroImage } from '../middleware/upload.js'
import { publicUploadPath } from '../utils/publicUrl.js'
import { DEFAULT_HERO_CONTENT, HeroContent } from '../models/HeroContent.js'

const router = Router()

const EDITABLE_FIELDS = [
  'imageUrl',
  'imageAlt',
  'imageAltHi',
  'eyebrow',
  'eyebrowHi',
  'title',
  'titleHi',
  'headline',
  'headlineHi',
  'description',
  'descriptionHi',
  'primaryCtaLabel',
  'primaryCtaLabelHi',
  'primaryCtaLink',
  'secondaryCtaLabel',
  'secondaryCtaLabelHi',
  'secondaryCtaLink',
  'isActive',
]

async function getOrCreateHero() {
  let doc = await HeroContent.findOne({ key: 'home-hero' })
  if (!doc) {
    doc = await HeroContent.create(DEFAULT_HERO_CONTENT)
  }
  return doc
}

function toPublicHero(doc) {
  return {
    imageUrl: doc.imageUrl,
    imageAlt: doc.imageAlt,
    imageAltHi: doc.imageAltHi,
    eyebrow: doc.eyebrow,
    eyebrowHi: doc.eyebrowHi,
    title: doc.title,
    titleHi: doc.titleHi,
    headline: doc.headline,
    headlineHi: doc.headlineHi,
    description: doc.description,
    descriptionHi: doc.descriptionHi,
    primaryCtaLabel: doc.primaryCtaLabel,
    primaryCtaLabelHi: doc.primaryCtaLabelHi,
    primaryCtaLink: doc.primaryCtaLink,
    secondaryCtaLabel: doc.secondaryCtaLabel,
    secondaryCtaLabelHi: doc.secondaryCtaLabelHi,
    secondaryCtaLink: doc.secondaryCtaLink,
    isActive: doc.isActive,
    updatedAt: doc.updatedAt,
  }
}

router.get('/hero', async (_req, res) => {
  try {
    const doc = await getOrCreateHero()
    return res.json({ success: true, data: toPublicHero(doc) })
  } catch (error) {
    console.error('Get hero CMS error:', error)
    return res.status(500).json({ success: false, message: 'Failed to load hero content.' })
  }
})

router.post('/hero/upload', requireAuth, (req, res) => {
  uploadHeroImage(req, res, async (err) => {
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

    try {
      const imageUrl = publicUploadPath('hero', req.file.filename)
      const doc = await getOrCreateHero()
      doc.imageUrl = imageUrl
      await doc.save()

      return res.json({
        success: true,
        message: 'Image uploaded successfully.',
        data: { ...toPublicHero(doc), imageUrl },
      })
    } catch (error) {
      console.error('Hero upload save error:', error)
      return res.status(500).json({ success: false, message: 'Failed to save uploaded image.' })
    }
  })
})

router.put('/hero', requireAuth, async (req, res) => {
  try {
    const doc = await getOrCreateHero()
    const body = req.body || {}

    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) {
        doc[field] = body[field]
      }
    }

    if (!String(doc.imageUrl || '').trim()) {
      return res.status(400).json({ success: false, message: 'Hero image URL is required.' })
    }
    if (!String(doc.title || '').trim()) {
      return res.status(400).json({ success: false, message: 'Title is required.' })
    }

    await doc.save()
    return res.json({
      success: true,
      message: 'Hero section updated successfully.',
      data: toPublicHero(doc),
    })
  } catch (error) {
    console.error('Update hero CMS error:', error)
    return res.status(500).json({ success: false, message: 'Failed to update hero content.' })
  }
})

export default router
