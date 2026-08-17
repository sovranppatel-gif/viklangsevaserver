import { Router } from 'express'
import { DONATE_COPY, donateCopy } from '../data/donateDefaults.js'
import { requireAuth } from '../middleware/auth.js'
import { Donation, toDonationResponse } from '../models/Donation.js'

const router = Router()

const METHODS = ['upi', 'cash', 'cheque', 'bank_transfer', 'other']
const FREQUENCIES = ['once', 'monthly']
const SOURCES = ['website', 'office']
const STATUSES = ['new', 'confirmed', 'receipt_sent', 'cancelled']

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

function parseAmount(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 1) return null
  return Math.round(amount)
}

function parseDonationDate(value) {
  if (!value) return new Date()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function buildDonationPayload(body, { sourceDefault = 'website', requireEmail = false, requireAadhaarOrPan = false } = {}) {
  const name = sanitizeText(body?.name, 120)
  const email = sanitizeText(body?.email, 160).toLowerCase()
  const phone = sanitizeText(body?.phone, 20)
  const amount = parseAmount(body?.amount)
  const frequency = FREQUENCIES.includes(body?.frequency) ? body.frequency : 'once'
  const method = METHODS.includes(body?.method) ? body.method : 'upi'
  const source = SOURCES.includes(body?.source) ? body.source : sourceDefault
  const status = STATUSES.includes(body?.status) ? body.status : 'new'
  const paidConfirm = Boolean(body?.paidConfirm)
  const aadhaarNumber = digitsOnly(body?.aadhaarNumber, 12)
  const pan = sanitizeText(body?.pan, 10).toUpperCase()
  const address = sanitizeText(body?.address, 500)
  const receiptNumber = sanitizeText(body?.receiptNumber, 60)
  const notes = sanitizeText(body?.notes, 2000)
  const donationDate = parseDonationDate(body?.donationDate)

  if (!name || !amount) {
    return { error: 'Name and amount are required.' }
  }

  if (requireEmail && !email) {
    return { error: 'Email is required.' }
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please provide a valid email address.' }
  }

  if (aadhaarNumber && aadhaarNumber.length !== 12) {
    return { error: 'Aadhaar number must be 12 digits, or leave it blank.' }
  }

  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
    return { error: 'Please provide a valid PAN, or leave it blank.' }
  }

  if (requireAadhaarOrPan && !aadhaarNumber && !pan) {
    return {
      error: 'Please enter Aadhaar or PAN — at least one is required for the 80G receipt.',
    }
  }

  return {
    data: {
      name,
      email,
      phone,
      amount,
      frequency,
      method,
      source,
      status,
      paidConfirm,
      aadhaarNumber,
      pan,
      address,
      receiptNumber,
      notes,
      donationDate,
    },
  }
}

function parseLang(req) {
  const fromBody = String(req.body?.lang || req.query?.lang || '').toLowerCase()
  if (fromBody.startsWith('hi')) return 'hi'
  const accept = String(req.headers['accept-language'] || '').toLowerCase()
  if (accept.startsWith('hi')) return 'hi'
  return 'en'
}

/** Public: website donate form */
router.post('/', async (req, res) => {
  try {
    const parsed = buildDonationPayload(
      {
        ...req.body,
        source: 'website',
        method: req.body?.method || 'upi',
        status: 'new',
      },
      { sourceDefault: 'website', requireEmail: true, requireAadhaarOrPan: true },
    )

    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error })
    }

    const donation = await Donation.create(parsed.data)
    const copy = donateCopy(parseLang(req))

    return res.status(201).json({
      success: true,
      message: copy.successMessage,
      messageEn: DONATE_COPY.successMessage,
      messageHi: DONATE_COPY.successMessageHi,
      notice: copy.form80gNotice,
      noticeEn: DONATE_COPY.form80gNotice,
      noticeHi: DONATE_COPY.form80gNoticeHi,
      data: { id: donation._id.toString() },
    })
  } catch (error) {
    console.error('Create donation failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to save donation right now. Please try again.',
    })
  }
})

/** Admin: list donations */
router.get('/', requireAuth, async (req, res) => {
  try {
    const filter = {}
    const source = sanitizeText(req.query?.source, 20)
    const status = sanitizeText(req.query?.status, 20)
    const q = sanitizeText(req.query?.q, 120)

    if (SOURCES.includes(source)) filter.source = source
    if (STATUSES.includes(status)) filter.status = status
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { receiptNumber: { $regex: q, $options: 'i' } },
      ]
    }

    const items = await Donation.find(filter).sort({ donationDate: -1, createdAt: -1 }).lean()

    return res.json({
      success: true,
      data: items.map((item) => toDonationResponse(item)),
    })
  } catch (error) {
    console.error('List donations failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to load donations.',
    })
  }
})

/** Admin: create office / manual donor */
router.post('/admin', requireAuth, async (req, res) => {
  try {
    const parsed = buildDonationPayload(
      {
        ...req.body,
        source: req.body?.source || 'office',
      },
      { sourceDefault: 'office', requireEmail: false },
    )

    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error })
    }

    if (!parsed.data.status || parsed.data.status === 'new') {
      parsed.data.status = 'confirmed'
    }

    const donation = await Donation.create(parsed.data)

    return res.status(201).json({
      success: true,
      message: 'Donor entry created successfully.',
      data: toDonationResponse(donation),
    })
  } catch (error) {
    console.error('Admin create donation failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to create donor entry.',
    })
  }
})

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id).lean()
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' })
    }
    return res.json({ success: true, data: toDonationResponse(donation) })
  } catch (error) {
    console.error('Get donation failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to load donation.',
    })
  }
})

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' })
    }

    const fields = [
      'name',
      'email',
      'phone',
      'amount',
      'frequency',
      'method',
      'source',
      'status',
      'paidConfirm',
      'aadhaarNumber',
      'pan',
      'address',
      'receiptNumber',
      'notes',
      'donationDate',
    ]

    for (const field of fields) {
      if (req.body?.[field] === undefined) continue
      if (field === 'amount') {
        const amount = parseAmount(req.body.amount)
        if (!amount) {
          return res.status(400).json({ success: false, message: 'Invalid amount.' })
        }
        donation.amount = amount
        continue
      }
      if (field === 'donationDate') {
        donation.donationDate = parseDonationDate(req.body.donationDate)
        continue
      }
      if (field === 'frequency' && !FREQUENCIES.includes(req.body.frequency)) continue
      if (field === 'method' && !METHODS.includes(req.body.method)) continue
      if (field === 'source' && !SOURCES.includes(req.body.source)) continue
      if (field === 'status' && !STATUSES.includes(req.body.status)) continue
      if (field === 'paidConfirm') {
        donation.paidConfirm = Boolean(req.body.paidConfirm)
        continue
      }
      if (typeof req.body[field] === 'string') {
        if (field === 'aadhaarNumber') {
          const aadhaar = digitsOnly(req.body.aadhaarNumber, 12)
          if (aadhaar && aadhaar.length !== 12) {
            return res.status(400).json({
              success: false,
              message: 'Aadhaar number must be 12 digits, or leave it blank.',
            })
          }
          donation.aadhaarNumber = aadhaar
          continue
        }
        const max =
          field === 'notes'
            ? 2000
            : field === 'address'
              ? 500
              : field === 'email'
                ? 160
                : field === 'name'
                  ? 120
                  : 60
        donation[field] = sanitizeText(req.body[field], max)
        if (field === 'email') donation.email = donation.email.toLowerCase()
        if (field === 'pan') {
          donation.pan = donation.pan.toUpperCase()
          if (donation.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(donation.pan)) {
            return res.status(400).json({
              success: false,
              message: 'Please provide a valid PAN, or leave it blank.',
            })
          }
        }
      } else {
        donation[field] = req.body[field]
      }
    }

    await donation.save()

    return res.json({
      success: true,
      message: 'Donation updated.',
      data: toDonationResponse(donation),
    })
  } catch (error) {
    console.error('Update donation failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to update donation.',
    })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const donation = await Donation.findByIdAndDelete(req.params.id)
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' })
    }
    return res.json({ success: true, message: 'Donation deleted.' })
  } catch (error) {
    console.error('Delete donation failed:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to delete donation.',
    })
  }
})

export default router
