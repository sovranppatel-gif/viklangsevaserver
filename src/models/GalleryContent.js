import mongoose from 'mongoose'
import { DEFAULT_GALLERY, GALLERY_CMS_KEYS } from '../data/galleryDefaults.js'

const galleryContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: GALLERY_CMS_KEYS,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true },
)

export const GalleryContent = mongoose.model('GalleryContent', galleryContentSchema)

export async function getOrCreateGallery(key) {
  if (!GALLERY_CMS_KEYS.includes(key)) {
    const error = new Error('Invalid gallery CMS key')
    error.status = 400
    throw error
  }

  let doc = await GalleryContent.findOne({ key })
  if (!doc) {
    doc = await GalleryContent.create({
      key,
      data: structuredClone(DEFAULT_GALLERY[key]),
    })
  }
  return doc
}

export function toGalleryResponse(doc) {
  return {
    key: doc.key,
    ...doc.data,
    updatedAt: doc.updatedAt,
  }
}

export async function getGalleryPhotos() {
  const doc = await getOrCreateGallery('gallery-photo-items')
  return (doc.data?.items || []).filter((item) => item.isActive !== false)
}

export async function getGalleryVideos() {
  const doc = await getOrCreateGallery('gallery-video-items')
  return (doc.data?.items || []).filter((item) => item.isActive !== false)
}
