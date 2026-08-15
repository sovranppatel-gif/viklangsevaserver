import mongoose from 'mongoose'
import { ABOUT_KEYS, DEFAULT_ABOUT } from '../data/aboutDefaults.js'

const aboutContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: ABOUT_KEYS,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true },
)

export const AboutContent = mongoose.model('AboutContent', aboutContentSchema)

export async function getOrCreateAbout(key) {
  if (!ABOUT_KEYS.includes(key)) {
    const error = new Error('Invalid about CMS key')
    error.status = 400
    throw error
  }

  let doc = await AboutContent.findOne({ key })
  if (!doc) {
    doc = await AboutContent.create({
      key,
      data: structuredClone(DEFAULT_ABOUT[key]),
    })
  }
  return doc
}

export function toAboutResponse(doc) {
  return {
    key: doc.key,
    ...doc.data,
    updatedAt: doc.updatedAt,
  }
}
