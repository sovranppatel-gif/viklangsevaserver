import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['master-admin', 'admin'],
      default: 'admin',
    },
    name: {
      type: String,
      default: 'Master Admin',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
)

adminSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

adminSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password)
}

adminSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    email: this.email,
    role: this.role,
    name: this.name,
  }
}

export const Admin = mongoose.model('Admin', adminSchema)
