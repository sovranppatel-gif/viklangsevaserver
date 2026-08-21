import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { uploadCmsDocument, uploadCmsImage } from '../middleware/upload.js'
import { publicUploadPath } from '../utils/publicUrl.js'
import { Volunteer } from '../models/Volunteer.js'

const router = Router()

const STATUSES = ['new', 'contacted', 'accepted', 'active', 'declined', 'archived']
const SOURCES = ['website', 'office']

function sanitizeText(value, max) {
  return String(value || '')
    .trim()
    .slice(0, max)
}

function digitsOnly(value, max) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, max)
}

function maskAadhaar(value) {
  const digits = digitsOnly(value, 12)
  if (digits.length !== 12) return ''
  return `XXXX-XXXX-${digits.slice(-4)}`
}

function addYears(isoDate, years = 1) {
  const base = isoDate ? new Date(isoDate) : new Date()
  if (Number.isNaN(base.getTime())) return ''
  base.setFullYear(base.getFullYear() + years)
  return base.toISOString().slice(0, 10)
}

async function generateVolunteerCode() {
  const year = new Date().getFullYear()
  const prefix = `VSS-VOL-${year}-`
  const last = await Volunteer.findOne({ volunteerCode: { $regex: `^${prefix}` } })
    .sort({ volunteerCode: -1 })
    .select('volunteerCode')
    .lean()
  const current = last?.volunteerCode ? Number(last.volunteerCode.replace(prefix, '')) : 0
  const next = Number.isFinite(current) ? current + 1 : 1
  return `${prefix}${String(next).padStart(4, '0')}`
}

function toVolunteerResponse(item, { includeSensitive = false } = {}) {
  const aadhaar = item.aadhaarNumber || ''
  return {
    id: item._id.toString(),
    volunteerCode: item.volunteerCode || '',
    name: item.name,
    fatherName: item.fatherName || '',
    motherName: item.motherName || '',
    gender: item.gender || '',
    dateOfBirth: item.dateOfBirth || '',
    bloodGroup: item.bloodGroup || '',
    photoUrl: item.photoUrl || '',
    aadhaarMasked: maskAadhaar(aadhaar),
    aadhaarNumber: includeSensitive ? aadhaar : undefined,
    aadhaarDocumentUrl: item.aadhaarDocumentUrl || '',
    pan: item.pan || '',
    panDocumentUrl: item.panDocumentUrl || '',
    email: item.email,
    phone: item.phone,
    whatsapp: item.whatsapp || item.phone || '',
    alternatePhone: item.alternatePhone || '',
    addressLine1: item.addressLine1 || '',
    addressLine2: item.addressLine2 || '',
    city: item.city || '',
    state: item.state || '',
    pincode: item.pincode || '',
    qualification: item.qualification || '',
    occupation: item.occupation || '',
    skills: item.skills || '',
    interest: item.interest,
    availability: item.availability || '',
    joiningDate: item.joiningDate || '',
    validUntil: item.validUntil || '',
    emergencyName: item.emergencyName || '',
    emergencyPhone: item.emergencyPhone || '',
    emergencyRelation: item.emergencyRelation || '',
    message: item.message || '',
    notes: item.notes || '',
    source: item.source || 'website',
    status: item.status,
    idCardIssuedAt: item.idCardIssuedAt || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function pickVolunteerFields(body) {
  const email = sanitizeText(body?.email, 160).toLowerCase()
  const aadhaar = digitsOnly(body?.aadhaarNumber, 12)
  const pan = sanitizeText(body?.pan, 10).toUpperCase()

  return {
    name: sanitizeText(body?.name, 120),
    fatherName: sanitizeText(body?.fatherName, 120),
    motherName: sanitizeText(body?.motherName, 120),
    gender: sanitizeText(body?.gender, 20),
    dateOfBirth: sanitizeText(body?.dateOfBirth, 20),
    bloodGroup: sanitizeText(body?.bloodGroup, 8),
    photoUrl: sanitizeText(body?.photoUrl, 500),
    aadhaarNumber: aadhaar,
    aadhaarDocumentUrl: sanitizeText(body?.aadhaarDocumentUrl, 500),
    pan,
    panDocumentUrl: sanitizeText(body?.panDocumentUrl, 500),
    email,
    phone: sanitizeText(body?.phone, 20),
    whatsapp: sanitizeText(body?.whatsapp, 20),
    alternatePhone: sanitizeText(body?.alternatePhone, 20),
    addressLine1: sanitizeText(body?.addressLine1, 200),
    addressLine2: sanitizeText(body?.addressLine2, 200),
    city: sanitizeText(body?.city, 80),
    state: sanitizeText(body?.state, 80),
    pincode: sanitizeText(body?.pincode, 10),
    qualification: sanitizeText(body?.qualification, 120),
    occupation: sanitizeText(body?.occupation, 120),
    skills: sanitizeText(body?.skills, 500),
    interest: sanitizeText(body?.interest, 80),
    availability: sanitizeText(body?.availability, 80),
    joiningDate: sanitizeText(body?.joiningDate, 20),
    validUntil: sanitizeText(body?.validUntil, 20),
    emergencyName: sanitizeText(body?.emergencyName, 120),
    emergencyPhone: sanitizeText(body?.emergencyPhone, 20),
    emergencyRelation: sanitizeText(body?.emergencyRelation, 40),
    message: sanitizeText(body?.message, 5000),
    notes: sanitizeText(body?.notes, 5000),
  }
}

function validateIdentity({ email, aadhaarNumber, pan }) {
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please provide a valid email address.'
  }
  if (aadhaarNumber && aadhaarNumber.length !== 12) {
    return 'Aadhaar number must be 12 digits.'
  }
  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
    return 'Please provide a valid PAN, or leave it blank.'
  }
  return ''
}

router.post('/', async (req, res) => {
  try {
    const fields = pickVolunteerFields(req.body)
    if (!fields.name || !fields.email || !fields.phone || !fields.interest) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone and area of interest are required.',
      })
    }
    if (fields.aadhaarNumber.length !== 12) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar number is required (12 digits) so you can download your ID card later.',
      })
    }

    const identityError = validateIdentity(fields)
    if (identityError) {
      return res.status(400).json({ success: false, message: identityError })
    }

    const volunteer = await Volunteer.create({
      ...fields,
      whatsapp: fields.whatsapp || fields.phone,
      joiningDate: '',
      validUntil: '',
      notes: '',
      source: 'website',
      status: 'new',
    })

    return res.status(201).json({
      success: true,
      message:
        'Thank you for applying. Your request is with the admin team. After approval, a volunteer ID card can be issued.',
      data: {
        id: volunteer._id.toString(),
      },
    })
  } catch (error) {
    console.error('Create volunteer failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to submit your application right now. Please try again.',
    })
  }
})

router.post('/photo', (req, res) => {
  uploadCmsImage('volunteer')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Photo must be 5MB or smaller.'
          : err.message || 'Failed to upload photo.'
      return res.status(400).json({ success: false, message })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please choose a photo.' })
    }
    return res.json({
      success: true,
      message: 'Photo uploaded successfully.',
      data: { imageUrl: publicUploadPath('volunteer', req.file.filename) },
    })
  })
})

router.post('/document', (req, res) => {
  uploadCmsDocument('volunteer', { maxBytes: 2 * 1024 * 1024 })(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Document must be 2MB or smaller.'
          : err.message || 'Failed to upload document.'
      return res.status(400).json({ success: false, message })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please choose a document.' })
    }
    return res.json({
      success: true,
      message: 'Document uploaded successfully.',
      data: { fileUrl: publicUploadPath('volunteer', req.file.filename) },
    })
  })
})

const idCardLookupAttempts = new Map()

function allowIdCardLookup(ip) {
  const key = String(ip || 'unknown')
  const now = Date.now()
  const windowMs = 15 * 60 * 1000
  const current = idCardLookupAttempts.get(key) || []
  const recent = current.filter((time) => now - time < windowMs)
  if (recent.length >= 8) {
    idCardLookupAttempts.set(key, recent)
    return false
  }
  recent.push(now)
  idCardLookupAttempts.set(key, recent)
  return true
}

function toPublicIdCard(item) {
  return {
    name: item.name,
    volunteerCode: item.volunteerCode || '',
    photoUrl: item.photoUrl || '',
    bloodGroup: item.bloodGroup || '',
    interest: item.interest,
    phone: item.phone,
    addressLine1: item.addressLine1 || '',
    addressLine2: item.addressLine2 || '',
    city: item.city || '',
    state: item.state || '',
    pincode: item.pincode || '',
    emergencyName: item.emergencyName || '',
    emergencyPhone: item.emergencyPhone || '',
    joiningDate: item.joiningDate || '',
    validUntil: item.validUntil || '',
    status: item.status,
  }
}

router.post('/id-card', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip
    if (!allowIdCardLookup(ip)) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please try again after some time.',
      })
    }

    const aadhaar = digitsOnly(req.body?.aadhaarNumber, 12)
    if (aadhaar.length !== 12) {
      return res.status(400).json({
        success: false,
        message: 'Enter the 12-digit Aadhaar number used during registration.',
      })
    }

    const volunteer = await Volunteer.findOne({ aadhaarNumber: aadhaar }).lean()
    if (!volunteer || volunteer.status === 'declined' || volunteer.status === 'archived') {
      return res.status(404).json({
        success: false,
        message: 'No ID card found for this Aadhaar number. Check the number or wait for admin approval.',
      })
    }

    if (volunteer.status === 'new' || volunteer.status === 'contacted') {
      return res.status(403).json({
        success: false,
        message: 'Your application is still under review. You can download the ID card after admin approval.',
      })
    }

    if (!volunteer.volunteerCode) {
      return res.status(403).json({
        success: false,
        message: 'Your request is approved, but the ID card is not issued yet. Please check back soon.',
      })
    }

    return res.json({
      success: true,
      message: 'ID card found. You can download or print it now.',
      data: toPublicIdCard(volunteer),
    })
  } catch (error) {
    console.error('Public volunteer ID card lookup failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch ID card right now. Please try again.',
    })
  }
})

router.post('/admin', requireAuth, async (req, res) => {
  try {
    const fields = pickVolunteerFields(req.body)
    if (!fields.name || !fields.email || !fields.phone || !fields.interest) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone and department are required.',
      })
    }

    const identityError = validateIdentity(fields)
    if (identityError) {
      return res.status(400).json({ success: false, message: identityError })
    }

    const status = STATUSES.includes(req.body?.status) ? req.body.status : 'active'
    const joiningDate = fields.joiningDate || new Date().toISOString().slice(0, 10)

    const volunteer = await Volunteer.create({
      ...fields,
      volunteerCode: await generateVolunteerCode(),
      whatsapp: fields.whatsapp || fields.phone,
      joiningDate,
      validUntil: fields.validUntil || addYears(joiningDate, 1),
      source: 'office',
      status,
    })

    return res.status(201).json({
      success: true,
      message: 'Volunteer added successfully.',
      data: toVolunteerResponse(volunteer, { includeSensitive: true }),
    })
  } catch (error) {
    console.error('Admin create volunteer failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to add volunteer right now.',
    })
  }
})

router.post('/upload', requireAuth, (req, res) => {
  uploadCmsImage('volunteer')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Photo must be 5MB or smaller.'
          : err.message || 'Failed to upload photo.'
      return res.status(400).json({ success: false, message })
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please choose a photo.' })
    }
    return res.json({
      success: true,
      message: 'Photo uploaded successfully.',
      data: { imageUrl: publicUploadPath('volunteer', req.file.filename) },
    })
  })
})

router.get('/', requireAuth, async (req, res) => {
  try {
    const status = sanitizeText(req.query?.status, 20)
    const source = sanitizeText(req.query?.source, 20)
    const q = sanitizeText(req.query?.q, 80)
    const filter = {}
    if (status && STATUSES.includes(status)) filter.status = status
    if (source && SOURCES.includes(source)) filter.source = source
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { interest: { $regex: q, $options: 'i' } },
        { volunteerCode: { $regex: q, $options: 'i' } },
        { fatherName: { $regex: q, $options: 'i' } },
        { city: { $regex: q, $options: 'i' } },
      ]
    }

    const items = await Volunteer.find(filter).sort({ createdAt: -1 }).lean()

    return res.json({
      success: true,
      data: items.map((item) => toVolunteerResponse(item)),
    })
  } catch (error) {
    console.error('List volunteers failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to load volunteer applications.',
    })
  }
})

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const volunteer = await Volunteer.findById(req.params.id).lean()
    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer not found.' })
    }
    return res.json({
      success: true,
      data: toVolunteerResponse(volunteer, { includeSensitive: true }),
    })
  } catch (error) {
    console.error('Get volunteer failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to load volunteer details.',
    })
  }
})

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await Volunteer.findById(req.params.id)
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Volunteer not found.' })
    }

    const keys = Object.keys(req.body || {})
    const statusOnly = keys.length === 1 && keys[0] === 'status'

    if (statusOnly) {
      const status = sanitizeText(req.body?.status, 20)
      if (!STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status.' })
      }
      existing.status = status
      if ((status === 'accepted' || status === 'active') && !existing.volunteerCode) {
        existing.volunteerCode = await generateVolunteerCode()
      }
      if ((status === 'accepted' || status === 'active') && !existing.joiningDate) {
        existing.joiningDate = new Date().toISOString().slice(0, 10)
      }
      if ((status === 'accepted' || status === 'active') && !existing.validUntil) {
        existing.validUntil = addYears(existing.joiningDate, 1)
      }
    } else {
      const fields = pickVolunteerFields(req.body)
      if (!fields.name || !fields.email || !fields.phone || !fields.interest) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, phone and department are required.',
        })
      }
      const identityError = validateIdentity(fields)
      if (identityError) {
        return res.status(400).json({ success: false, message: identityError })
      }
      Object.assign(existing, fields)
      if (STATUSES.includes(req.body?.status)) existing.status = req.body.status
      if (!existing.volunteerCode) existing.volunteerCode = await generateVolunteerCode()
    }

    await existing.save()

    return res.json({
      success: true,
      message: 'Volunteer updated.',
      data: toVolunteerResponse(existing.toObject(), { includeSensitive: true }),
    })
  } catch (error) {
    console.error('Update volunteer failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to update volunteer.',
    })
  }
})

router.patch('/:id/issue-card', requireAuth, async (req, res) => {
  try {
    const volunteer = await Volunteer.findById(req.params.id)
    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer not found.' })
    }

    if (volunteer.status === 'declined' || volunteer.status === 'archived') {
      return res.status(400).json({
        success: false,
        message: 'Approve this volunteer before generating an ID card.',
      })
    }
    if (volunteer.status === 'new' || volunteer.status === 'contacted') {
      return res.status(400).json({
        success: false,
        message: 'Approve this request first, then generate the ID card.',
      })
    }
    if (!volunteer.volunteerCode) {
      volunteer.volunteerCode = await generateVolunteerCode()
    }
    if (!volunteer.joiningDate) {
      volunteer.joiningDate = new Date().toISOString().slice(0, 10)
    }
    if (!volunteer.validUntil) {
      volunteer.validUntil = addYears(volunteer.joiningDate, 1)
    }
    volunteer.idCardIssuedAt = new Date()
    if (volunteer.status === 'new' || volunteer.status === 'contacted' || volunteer.status === 'accepted') {
      volunteer.status = 'active'
    }
    await volunteer.save()

    return res.json({
      success: true,
      message: 'Volunteer ID card issued.',
      data: toVolunteerResponse(volunteer.toObject(), { includeSensitive: true }),
    })
  } catch (error) {
    console.error('Issue volunteer card failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to issue volunteer ID card.',
    })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const volunteer = await Volunteer.findByIdAndDelete(req.params.id)
    if (!volunteer) {
      return res.status(404).json({ success: false, message: 'Volunteer not found.' })
    }
    return res.json({ success: true, message: 'Volunteer deleted.' })
  } catch (error) {
    console.error('Delete volunteer failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to delete volunteer.',
    })
  }
})

export default router
