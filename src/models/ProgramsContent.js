import mongoose from 'mongoose'
import {
  DEFAULT_PROGRAMS,
  PROGRAM_CMS_KEYS,
  PROGRAM_ITEM_KEYS,
} from '../data/programsDefaults.js'

const programsContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: PROGRAM_CMS_KEYS,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true },
)

export const ProgramsContent = mongoose.model('ProgramsContent', programsContentSchema)

export async function getOrCreateProgram(key) {
  if (!PROGRAM_CMS_KEYS.includes(key)) {
    const error = new Error('Invalid programs CMS key')
    error.status = 400
    throw error
  }

  let doc = await ProgramsContent.findOne({ key })
  if (!doc) {
    doc = await ProgramsContent.create({
      key,
      data: structuredClone(DEFAULT_PROGRAMS[key]),
    })
  }
  return doc
}

export function toProgramResponse(doc) {
  return {
    key: doc.key,
    ...doc.data,
    updatedAt: doc.updatedAt,
  }
}

export async function getProgramsCatalog() {
  const docs = await Promise.all(PROGRAM_ITEM_KEYS.map((key) => getOrCreateProgram(key)))
  return docs
    .map((doc) => toProgramResponse(doc))
    .filter((item) => item.isActive !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
}
