import mongoose from 'mongoose'

const enquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: ['new', 'read', 'archived'],
      default: 'new',
    },
  },
  { timestamps: true },
)

enquirySchema.index({ createdAt: -1 })
enquirySchema.index({ status: 1, createdAt: -1 })

export const Enquiry = mongoose.model('Enquiry', enquirySchema)
