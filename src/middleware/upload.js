import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import { UploadedFile } from '../models/UploadedFile.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const isServerless = Boolean(process.env.VERCEL)

export const uploadsRoot = isServerless
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, '../../uploads')

export const heroUploadsDir = path.join(uploadsRoot, 'hero')
export const aboutUploadsDir = path.join(uploadsRoot, 'about')
export const programsUploadsDir = path.join(uploadsRoot, 'programs')
export const blogUploadsDir = path.join(uploadsRoot, 'blog')
export const galleryUploadsDir = path.join(uploadsRoot, 'gallery')
export const reportsUploadsDir = path.join(uploadsRoot, 'reports')
export const impactUploadsDir = path.join(uploadsRoot, 'impact')
export const volunteerUploadsDir = path.join(uploadsRoot, 'volunteer')
export const studentUploadsDir = path.join(uploadsRoot, 'student')
export const donateUploadsDir = path.join(uploadsRoot, 'donate')

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true })
  } catch (error) {
    if (!isServerless) {
      throw error
    }
    console.warn(`Could not create upload directory ${dir}:`, error.message)
  }
}

ensureDir(heroUploadsDir)
ensureDir(aboutUploadsDir)
ensureDir(programsUploadsDir)
ensureDir(blogUploadsDir)
ensureDir(galleryUploadsDir)
ensureDir(reportsUploadsDir)
ensureDir(impactUploadsDir)
ensureDir(volunteerUploadsDir)
ensureDir(studentUploadsDir)
ensureDir(donateUploadsDir)

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ALLOWED_DOCS = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
])

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
const DOC_EXTS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp']

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
  donate: donateUploadsDir,
}

function makeFilename(folder, originalname, fallbackExt, allowedExts) {
  const ext = path.extname(originalname || '').toLowerCase() || fallbackExt
  const safeExt = allowedExts.includes(ext) ? ext : fallbackExt
  return `${folder}-${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExt}`
}

function mongoStorage(folder, allowedExts, fallbackExt) {
  return {
    _handleFile(_req, file, cb) {
      const chunks = []

      file.stream.on('data', (chunk) => {
        chunks.push(chunk)
      })

      file.stream.on('error', (error) => {
        cb(error)
      })

      file.stream.on('end', () => {
        const filename = makeFilename(folder, file.originalname, fallbackExt, allowedExts)
        const data = Buffer.concat(chunks)

        UploadedFile.findOneAndUpdate(
          { folder, filename },
          { folder, filename, contentType: file.mimetype, data },
          { upsert: true, new: true },
        )
          .then(() => cb(null, { filename, path: filename, size: data.length }))
          .catch(cb)
      })
    },
    _removeFile(_req, file, cb) {
      UploadedFile.deleteOne({ folder, filename: file.filename })
        .then(() => cb(null))
        .catch(() => cb(null))
    },
  }
}

function diskStorage(dest, folder, allowedExts, fallbackExt) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      cb(null, makeFilename(folder, file.originalname, fallbackExt, allowedExts))
    },
  })
}

function storageFor(folder, dest, allowedExts, fallbackExt) {
  if (isServerless) {
    return mongoStorage(folder, allowedExts, fallbackExt)
  }

  return diskStorage(dest, folder, allowedExts, fallbackExt)
}

export function uploadCmsImage(folder = 'about') {
  const dest = destMap[folder] || aboutUploadsDir
  const name = folder || 'about'

  return multer({
    storage: storageFor(name, dest, IMAGE_EXTS, '.jpg'),
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
    storage: storageFor(name, dest, DOC_EXTS, '.pdf'),
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

export async function serveUploadedFile(req, res) {
  const folder = String(req.params.folder || '')
  const filename = String(req.params.filename || '')

  if (
    !folder ||
    !filename ||
    folder.includes('..') ||
    filename.includes('..') ||
    folder.includes('/') ||
    folder.includes('\\') ||
    filename.includes('/') ||
    filename.includes('\\')
  ) {
    return res.status(400).json({ success: false, message: 'Invalid file path.' })
  }

  try {
    const stored = await UploadedFile.findOne({ folder, filename })
    if (stored?.data) {
      const buffer = Buffer.isBuffer(stored.data) ? stored.data : Buffer.from(stored.data)
      res.setHeader('Content-Type', stored.contentType || 'application/octet-stream')
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      return res.send(buffer)
    }
  } catch (error) {
    console.error('Upload lookup failed:', error.message)
  }

  const resolvedRoot = path.resolve(uploadsRoot)
  const resolvedFile = path.resolve(path.join(uploadsRoot, folder, filename))

  if (!resolvedFile.startsWith(resolvedRoot + path.sep) && resolvedFile !== resolvedRoot) {
    return res.status(400).json({ success: false, message: 'Invalid file path.' })
  }

  if (!fs.existsSync(resolvedFile)) {
    return res.status(404).json({ success: false, message: 'File not found.' })
  }

  return res.sendFile(resolvedFile)
}
