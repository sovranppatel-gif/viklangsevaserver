import mongoose from 'mongoose'

const volunteerSchema = new mongoose.Schema(
  {
    volunteerCode: {
      type: String,
      trim: true,
      maxlength: 32,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    fatherName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    motherName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    gender: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
    dateOfBirth: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
    bloodGroup: {
      type: String,
      trim: true,
      maxlength: 8,
      default: '',
    },
    photoUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    aadhaarNumber: {
      type: String,
      trim: true,
      maxlength: 12,
      default: '',
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 10,
      default: '',
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    whatsapp: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
    alternatePhone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
    addressLine1: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    state: {
      type: String,
      trim: true,
      maxlength: 80,
      default: 'Madhya Pradesh',
    },
    pincode: {
      type: String,
      trim: true,
      maxlength: 10,
      default: '',
    },
    qualification: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    occupation: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    skills: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    interest: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    availability: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    joiningDate: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
    validUntil: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
    emergencyName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    emergencyPhone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
    emergencyRelation: {
      type: String,
      trim: true,
      maxlength: 40,
      default: '',
    },
    message: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    source: {
      type: String,
      enum: ['website', 'office'],
      default: 'website',
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'accepted', 'active', 'declined', 'archived'],
      default: 'new',
    },
    idCardIssuedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
)

volunteerSchema.index({ createdAt: -1 })
volunteerSchema.index({ status: 1, createdAt: -1 })
volunteerSchema.index({ volunteerCode: 1 }, { unique: true, sparse: true })
volunteerSchema.index({ name: 1 })
volunteerSchema.index({ phone: 1 })

export const Volunteer = mongoose.model('Volunteer', volunteerSchema)
