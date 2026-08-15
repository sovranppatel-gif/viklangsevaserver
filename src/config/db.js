import mongoose from 'mongoose'

export async function connectDB(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Set it in server/.env')
  }

  mongoose.set('strictQuery', true)

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    })
    console.log('MongoDB connected')
  } catch (error) {
    const message = String(error?.message || error)
    if (
      message.includes('whitelist') ||
      message.includes('IP that isn') ||
      message.includes('SSL') ||
      message.includes('TLS') ||
      error?.name === 'MongoServerSelectionError'
    ) {
      console.error('\nMongoDB Atlas connection failed.')
      console.error('Most common fix: whitelist your current IP in Atlas.')
      console.error('1) Open: https://cloud.mongodb.com/v2#/security/network/whitelist')
      console.error('2) Click "Add IP Address" → "Add Current IP Address"')
      console.error('   (or Allow Access from Anywhere: 0.0.0.0/0 for local testing)')
      console.error('3) Wait 1–2 minutes, then restart: npm run dev\n')
    }
    throw error
  }
}
