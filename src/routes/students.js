import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { uploadCmsImage } from '../middleware/upload.js'
import { publicUploadPath } from '../utils/publicUrl.js'
import { Student } from '../models/Student.js'

const router = Router()
const STATUSES = ['applied', 'admitted', 'left', 'archived']

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

async function generateRegistrationNumber() {
  const year = new Date().getFullYear()
  const prefix = `VSS-STU-${year}-`
  const last = await Student.findOne({ registrationNumber: { $regex: `^${prefix}` } })
    .sort({ registrationNumber: -1 })
    .select('registrationNumber')
    .lean()
  const current = last?.registrationNumber ? Number(last.registrationNumber.replace(prefix, '')) : 0
  const next = Number.isFinite(current) ? current + 1 : 1
  return `${prefix}${String(next).padStart(4, '0')}`
}

function toStudentResponse(item, { includeSensitive = false } = {}) {
  const aadhaar = item.aadhaarNumber || ''
  return {
    id: item._id.toString(),
    registrationNumber: item.registrationNumber || '',
    registrationDate: item.registrationDate || '',
    photoUrl: item.photoUrl || '',
    name: item.name,
    age: item.age || '',
    gender: item.gender || '',
    dateOfBirth: item.dateOfBirth || '',
    disabilityType: item.disabilityType || '',
    fatherGuardianName: item.fatherGuardianName || '',
    motherName: item.motherName || '',
    address: item.address || '',
    city: item.city || '',
    state: item.state || '',
    pincode: item.pincode || '',
    guardianPhone: item.guardianPhone || '',
    guardianEmail: item.guardianEmail || '',
    fatherOccupation: item.fatherOccupation || '',
    fatherEducation: item.fatherEducation || '',
    fatherAge: item.fatherAge || '',
    motherOccupation: item.motherOccupation || '',
    motherEducation: item.motherEducation || '',
    motherAge: item.motherAge || '',
    caste: item.caste || '',
    motherTongue: item.motherTongue || '',
    siblingsCount: item.siblingsCount || '',
    familyDisabilityType: item.familyDisabilityType || '',
    childInterests: item.childInterests || '',
    childNature: item.childNature || '',
    familyEnvironment: item.familyEnvironment || '',
    aadhaarMasked: maskAadhaar(aadhaar),
    aadhaarNumber: includeSensitive ? aadhaar : undefined,
    bloodGroup: item.bloodGroup || '',
    className: item.className || '',
    declarationName: item.declarationName || '',
    declarationRelation: item.declarationRelation || 'आत्मज',
    declarationAgreed: Boolean(item.declarationAgreed),
    declarationDate: item.declarationDate || '',
    guardianSignature: item.guardianSignature || '',
    notes: item.notes || '',
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function pickStudentFields(body) {
  const aadhaar = digitsOnly(body?.aadhaarNumber, 12)
  const email = sanitizeText(body?.guardianEmail, 160).toLowerCase()
  return {
    registrationDate: sanitizeText(body?.registrationDate, 20),
    photoUrl: sanitizeText(body?.photoUrl, 500),
    name: sanitizeText(body?.name, 120),
    age: sanitizeText(body?.age, 10),
    gender: sanitizeText(body?.gender, 20),
    dateOfBirth: sanitizeText(body?.dateOfBirth, 20),
    disabilityType: sanitizeText(body?.disabilityType, 80),
    fatherGuardianName: sanitizeText(body?.fatherGuardianName, 120),
    motherName: sanitizeText(body?.motherName, 120),
    address: sanitizeText(body?.address, 500),
    city: sanitizeText(body?.city, 80),
    state: sanitizeText(body?.state, 80),
    pincode: sanitizeText(body?.pincode, 10),
    guardianPhone: sanitizeText(body?.guardianPhone, 20),
    guardianEmail: email,
    fatherOccupation: sanitizeText(body?.fatherOccupation, 120),
    fatherEducation: sanitizeText(body?.fatherEducation, 120),
    fatherAge: sanitizeText(body?.fatherAge, 10),
    motherOccupation: sanitizeText(body?.motherOccupation, 120),
    motherEducation: sanitizeText(body?.motherEducation, 120),
    motherAge: sanitizeText(body?.motherAge, 10),
    caste: sanitizeText(body?.caste, 80),
    motherTongue: sanitizeText(body?.motherTongue, 80),
    siblingsCount: sanitizeText(body?.siblingsCount, 10),
    familyDisabilityType: sanitizeText(body?.familyDisabilityType, 300),
    childInterests: sanitizeText(body?.childInterests, 500),
    childNature: sanitizeText(body?.childNature, 500),
    familyEnvironment: sanitizeText(body?.familyEnvironment, 3000),
    aadhaarNumber: aadhaar,
    bloodGroup: sanitizeText(body?.bloodGroup, 8),
    className: sanitizeText(body?.className, 80),
    declarationName: sanitizeText(body?.declarationName, 120),
    declarationRelation: sanitizeText(body?.declarationRelation, 40) || 'आत्मज',
    declarationAgreed: Boolean(body?.declarationAgreed),
    declarationDate: sanitizeText(body?.declarationDate, 20),
    guardianSignature: sanitizeText(body?.guardianSignature, 120),
    notes: sanitizeText(body?.notes, 5000),
  }
}

router.use(requireAuth)

router.post('/upload', (req, res) => {
  uploadCmsImage('student')(req, res, (err) => {
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
      data: { imageUrl: publicUploadPath('student', req.file.filename) },
    })
  })
})

router.post('/', async (req, res) => {
  try {
    const fields = pickStudentFields(req.body)
    if (!fields.name || !fields.fatherGuardianName) {
      return res.status(400).json({
        success: false,
        message: 'Student name and father/guardian name are required.',
      })
    }
    if (fields.aadhaarNumber && fields.aadhaarNumber.length !== 12) {
      return res.status(400).json({ success: false, message: 'Aadhaar number must be 12 digits.' })
    }
    if (fields.guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.guardianEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email.' })
    }

    const status = STATUSES.includes(req.body?.status) ? req.body.status : 'applied'
    const student = await Student.create({
      ...fields,
      registrationNumber: sanitizeText(req.body?.registrationNumber, 40) || (await generateRegistrationNumber()),
      registrationDate: fields.registrationDate || new Date().toISOString().slice(0, 10),
      declarationName: fields.declarationName || fields.fatherGuardianName,
      declarationDate: fields.declarationDate || new Date().toISOString().slice(0, 10),
      status,
    })

    return res.status(201).json({
      success: true,
      message: 'Student admission saved.',
      data: toStudentResponse(student, { includeSensitive: true }),
    })
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'Registration number already exists.' })
    }
    console.error('Create student failed:', error)
    return res.status(500).json({ success: false, message: 'Unable to save student admission.' })
  }
})

router.get('/', async (req, res) => {
  try {
    const status = sanitizeText(req.query?.status, 20)
    const q = sanitizeText(req.query?.q, 80)
    const filter = {}
    if (status && STATUSES.includes(status)) filter.status = status
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { fatherGuardianName: { $regex: q, $options: 'i' } },
        { registrationNumber: { $regex: q, $options: 'i' } },
        { guardianPhone: { $regex: q, $options: 'i' } },
        { disabilityType: { $regex: q, $options: 'i' } },
        { className: { $regex: q, $options: 'i' } },
      ]
    }
    const items = await Student.find(filter).sort({ createdAt: -1 }).lean()
    return res.json({ success: true, data: items.map((item) => toStudentResponse(item)) })
  } catch (error) {
    console.error('List students failed:', error)
    return res.status(500).json({ success: false, message: 'Unable to load students.' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).lean()
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' })
    return res.json({ success: true, data: toStudentResponse(student, { includeSensitive: true }) })
  } catch (error) {
    console.error('Get student failed:', error)
    return res.status(500).json({ success: false, message: 'Unable to load student.' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const existing = await Student.findById(req.params.id)
    if (!existing) return res.status(404).json({ success: false, message: 'Student not found.' })

    const keys = Object.keys(req.body || {})
    if (keys.length === 1 && keys[0] === 'status') {
      const status = sanitizeText(req.body?.status, 20)
      if (!STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status.' })
      }
      existing.status = status
    } else {
      const fields = pickStudentFields(req.body)
      if (!fields.name || !fields.fatherGuardianName) {
        return res.status(400).json({
          success: false,
          message: 'Student name and father/guardian name are required.',
        })
      }
      if (fields.aadhaarNumber && fields.aadhaarNumber.length !== 12) {
        return res.status(400).json({ success: false, message: 'Aadhaar number must be 12 digits.' })
      }
      Object.assign(existing, fields)
      if (STATUSES.includes(req.body?.status)) existing.status = req.body.status
      if (req.body?.registrationNumber !== undefined) {
        existing.registrationNumber =
          sanitizeText(req.body.registrationNumber, 40) || existing.registrationNumber
      }
      if (!existing.registrationNumber) existing.registrationNumber = await generateRegistrationNumber()
    }

    await existing.save()
    return res.json({
      success: true,
      message: 'Student updated.',
      data: toStudentResponse(existing.toObject(), { includeSensitive: true }),
    })
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'Registration number already exists.' })
    }
    console.error('Update student failed:', error)
    return res.status(500).json({ success: false, message: 'Unable to update student.' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id)
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' })
    return res.json({ success: true, message: 'Student deleted.' })
  } catch (error) {
    console.error('Delete student failed:', error)
    return res.status(500).json({ success: false, message: 'Unable to delete student.' })
  }
})

export default router
