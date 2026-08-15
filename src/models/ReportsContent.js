import mongoose from 'mongoose'
import { DEFAULT_REPORTS, REPORTS_CMS_KEYS } from '../data/reportsDefaults.js'

const reportsContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: REPORTS_CMS_KEYS,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true },
)

export const ReportsContent = mongoose.model('ReportsContent', reportsContentSchema)

export async function getOrCreateReports(key) {
  if (!REPORTS_CMS_KEYS.includes(key)) {
    const error = new Error('Invalid reports CMS key')
    error.status = 400
    throw error
  }

  let doc = await ReportsContent.findOne({ key })
  if (!doc) {
    doc = await ReportsContent.create({
      key,
      data: structuredClone(DEFAULT_REPORTS[key]),
    })
  }
  return doc
}

export function toReportsResponse(doc) {
  return {
    key: doc.key,
    ...doc.data,
    updatedAt: doc.updatedAt,
  }
}

export async function getReportItems() {
  const doc = await getOrCreateReports('report-items')
  return (doc.data?.items || []).filter((item) => item.isActive !== false)
}
