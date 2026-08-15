import mongoose from 'mongoose'

const uploadedFileSchema = new mongoose.Schema(
  {
    folder: {
      type: String,
      required: true,
      trim: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    contentType: {
      type: String,
      default: 'application/octet-stream',
    },
    data: {
      type: Buffer,
      required: true,
    },
  },
  { timestamps: true },
)

uploadedFileSchema.index({ folder: 1, filename: 1 }, { unique: true })

export const UploadedFile = mongoose.model('UploadedFile', uploadedFileSchema)
