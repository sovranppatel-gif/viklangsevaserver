import mongoose from 'mongoose'
import { DEFAULT_IMPACT, IMPACT_CMS_KEYS } from '../data/impactDefaults.js'

const impactContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: IMPACT_CMS_KEYS,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true },
)

export const ImpactContent = mongoose.model('ImpactContent', impactContentSchema)

export async function getOrCreateImpact(key) {
  if (!IMPACT_CMS_KEYS.includes(key)) {
    const error = new Error('Invalid impact CMS key')
    error.status = 400
    throw error
  }

  let doc = await ImpactContent.findOne({ key })
  if (!doc) {
    doc = await ImpactContent.create({
      key,
      data: structuredClone(DEFAULT_IMPACT[key]),
    })
  }
  return doc
}

export function toImpactResponse(doc) {
  return {
    key: doc.key,
    ...doc.data,
    updatedAt: doc.updatedAt,
  }
}

export async function getStoryItems() {
  const doc = await getOrCreateImpact('story-items')
  return (doc.data?.items || [])
    .filter((item) => item.isActive !== false)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
}

export async function getImpactStats() {
  const doc = await getOrCreateImpact('impact-stats')
  return (doc.data?.items || []).filter((item) => item.isActive !== false)
}

export async function getImpactCampaign() {
  const doc = await getOrCreateImpact('impact-campaign')
  return toImpactResponse(doc)
}
