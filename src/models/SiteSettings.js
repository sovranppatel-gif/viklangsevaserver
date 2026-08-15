import mongoose from 'mongoose'
import { DEFAULT_SITE_SETTINGS, SITE_SETTINGS_KEYS } from '../data/siteSettingsDefaults.js'

const siteSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: SITE_SETTINGS_KEYS,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true },
)

export const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema)

export async function getOrCreateSiteSettings(key) {
  if (!SITE_SETTINGS_KEYS.includes(key)) {
    const error = new Error('Invalid site settings key')
    error.status = 400
    throw error
  }

  let doc = await SiteSettings.findOne({ key })
  if (!doc) {
    doc = await SiteSettings.create({
      key,
      data: structuredClone(DEFAULT_SITE_SETTINGS[key]),
    })
  }
  return doc
}

export function toSiteSettingsResponse(doc) {
  return {
    key: doc.key,
    ...doc.data,
    updatedAt: doc.updatedAt,
  }
}
