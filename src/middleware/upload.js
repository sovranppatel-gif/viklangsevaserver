import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const uploadsRoot = path.join(__dirname, '../../uploads')
export const heroUploadsDir = path.join(uploadsRoot, 'hero')
export const aboutUploadsDir = path.join(uploadsRoot, 'about')
export const programsUploadsDir = path.join(uploadsRoot, 'programs')
export const blogUploadsDir = path.join(uploadsRoot, 'blog')
export const galleryUploadsDir = path.join(uploadsRoot, 'gallery')
export const reportsUploadsDir = path.join(uploadsRoot, 'reports')
export const impactUploadsDir = path.join(uploadsRoot, 'impact')
export const volunteerUploadsDir = path.join(uploadsRoot, 'volunteer')
export const studentUploadsDir = path.join(uploadsRoot, 'student')

fs.mkdirSync(heroUploadsDir, { recursive: true })
fs.mkdirSync(aboutUploadsDir, { recursive: true })
fs.mkdirSync(programsUploadsDir, { recursive: true })
fs.mkdirSync(blogUploadsDir, { recursive: true })
fs.mkdirSync(galleryUploadsDir, { recursive: true })
fs.mkdirSync(reportsUploadsDir, { recursive: true })
fs.mkdirSync(impactUploadsDir, { recursive: true })
fs.mkdirSync(volunteerUploadsDir, { recursive: true })
fs.mkdirSync(studentUploadsDir, { recursive: true })

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ALLOWED_DOCS = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
])

const destMap = {
  hero: heroUploadsDir,
  about: aboutUploadsDir,
  programs: programsUploadsDir,
  blog: blogUploadsDir,
  gallery: galleryUploadsDir,
  reports: reportsUploadsDir,
  impact: impactUploadsDir,
  volunteer: volunteerUploadsDir,
  student: studentUploadsDir,
}

export function uploadCmsImage(folder = 'about') {
  const dest = destMap[folder] || aboutUploadsDir
  const name = folder || 'about'

  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dest),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg'
        const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg'
        cb(null, `${name}-${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExt}`)
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_TYPES.has(file.mimetype)) {
        cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed.'))
        return
      }
      cb(null, true)
    },
  }).single('image')
}

export const uploadHeroImage = uploadCmsImage('hero')

export function uploadCmsDocument(folder = 'reports') {
  const dest = destMap[folder] || reportsUploadsDir
  const name = folder || 'reports'

  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dest),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.pdf'
        const safeExt = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'].includes(ext)
          ? ext
          : '.pdf'
        cb(null, `${name}-${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExt}`)
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_DOCS.has(file.mimetype)) {
        cb(new Error('Only PDF, DOC, DOCX or image files are allowed.'))
        return
      }
      cb(null, true)
    },
  }).single('file')
}
