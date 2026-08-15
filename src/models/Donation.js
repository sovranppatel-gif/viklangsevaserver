import mongoose from 'mongoose'

const donationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 160,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    frequency: {
      type: String,
      enum: ['once', 'monthly'],
      default: 'once',
    },
    method: {
      type: String,
      enum: ['upi', 'cash', 'cheque', 'bank_transfer', 'other'],
      default: 'upi',
    },
    source: {
      type: String,
      enum: ['website', 'office'],
      default: 'website',
    },
    status: {
      type: String,
      enum: ['new', 'confirmed', 'receipt_sent', 'cancelled'],
      default: 'new',
    },
    paidConfirm: {
      type: Boolean,
      default: false,
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 20,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    receiptNumber: {
      type: String,
      trim: true,
      maxlength: 60,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    donationDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
)

donationSchema.index({ createdAt: -1 })
donationSchema.index({ source: 1, createdAt: -1 })
donationSchema.index({ status: 1, createdAt: -1 })

export const Donation = mongoose.model('Donation', donationSchema)

export function toDonationResponse(doc) {
  const item = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return {
    id: item._id.toString(),
    name: item.name,
    email: item.email || '',
    phone: item.phone || '',
    amount: item.amount,
    frequency: item.frequency,
    method: item.method,
    source: item.source,
    status: item.status,
    paidConfirm: Boolean(item.paidConfirm),
    pan: item.pan || '',
    address: item.address || '',
    receiptNumber: item.receiptNumber || '',
    notes: item.notes || '',
    donationDate: item.donationDate,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}
