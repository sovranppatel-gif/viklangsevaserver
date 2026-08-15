import mongoose from 'mongoose'

const studentSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    registrationDate: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
    photoUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    age: {
      type: String,
      trim: true,
      maxlength: 10,
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
    disabilityType: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    fatherGuardianName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    motherName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      maxlength: 80,
      default: 'Narsinghpur',
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
    guardianPhone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
    guardianEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 160,
      default: '',
    },
    fatherOccupation: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    fatherEducation: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    fatherAge: {
      type: String,
      trim: true,
      maxlength: 10,
      default: '',
    },
    motherOccupation: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    motherEducation: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    motherAge: {
      type: String,
      trim: true,
      maxlength: 10,
      default: '',
    },
    caste: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    motherTongue: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    siblingsCount: {
      type: String,
      trim: true,
      maxlength: 10,
      default: '',
    },
    familyDisabilityType: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    childInterests: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    childNature: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    familyEnvironment: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },
    aadhaarNumber: {
      type: String,
      trim: true,
      maxlength: 12,
      default: '',
    },
    bloodGroup: {
      type: String,
      trim: true,
      maxlength: 8,
      default: '',
    },
    className: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    declarationName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    declarationRelation: {
      type: String,
      trim: true,
      maxlength: 40,
      default: 'आत्मज',
    },
    declarationAgreed: {
      type: Boolean,
      default: false,
    },
    declarationDate: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },
    guardianSignature: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    status: {
      type: String,
      enum: ['applied', 'admitted', 'left', 'archived'],
      default: 'applied',
    },
  },
  { timestamps: true },
)

studentSchema.index({ createdAt: -1 })
studentSchema.index({ status: 1, createdAt: -1 })
studentSchema.index({ registrationNumber: 1 }, { unique: true, sparse: true })
studentSchema.index({ name: 1 })
studentSchema.index({ guardianPhone: 1 })

export const Student = mongoose.model('Student', studentSchema)
