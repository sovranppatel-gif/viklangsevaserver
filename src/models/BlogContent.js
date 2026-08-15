import mongoose from 'mongoose'
import { BLOG_CMS_KEYS, DEFAULT_BLOG } from '../data/blogDefaults.js'

const blogContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: BLOG_CMS_KEYS,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true },
)

export const BlogContent = mongoose.model('BlogContent', blogContentSchema)

export async function getOrCreateBlog(key) {
  if (!BLOG_CMS_KEYS.includes(key)) {
    const error = new Error('Invalid blog CMS key')
    error.status = 400
    throw error
  }

  let doc = await BlogContent.findOne({ key })
  if (!doc) {
    doc = await BlogContent.create({
      key,
      data: structuredClone(DEFAULT_BLOG[key]),
    })
  }
  return doc
}

export function toBlogResponse(doc) {
  return {
    key: doc.key,
    ...doc.data,
    updatedAt: doc.updatedAt,
  }
}

export async function getBlogArticles() {
  const doc = await getOrCreateBlog('blog-articles')
  return (doc.data?.items || [])
    .filter((item) => item.isActive !== false)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
}

export async function getEventItems() {
  const doc = await getOrCreateBlog('event-items')
  return (doc.data?.items || [])
    .filter((item) => item.isActive !== false)
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
}
