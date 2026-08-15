import mongoose from 'mongoose'

const globalForMongoose = globalThis

if (!globalForMongoose.__viklangMongoose) {
  globalForMongoose.__viklangMongoose = { conn: null, promise: null }
}

const cached = globalForMongoose.__viklangMongoose

export async function connectDB(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error(
      'MONGODB_URI is missing. Set it in server/.env locally or in Vercel Environment Variables.',
    )
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn
  }

  if (!cached.promise) {
    mongoose.set('strictQuery', true)

    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        maxPoolSize: 10,
      })
      .then((connection) => {
        console.log('MongoDB connected')
        return connection
      })
  }

  try {
    cached.conn = await cached.promise
    return cached.conn
  } catch (error) {
    cached.promise = null
    cached.conn = null

    const message = String(error?.message || error)
    if (
      message.includes('whitelist') ||
      message.includes('IP that isn') ||
      message.includes('SSL') ||
      message.includes('TLS') ||
      error?.name === 'MongoServerSelectionError'
    ) {
      console.error('\nMongoDB Atlas connection failed.')
      console.error('Most common fix: whitelist IPs in Atlas.')
      console.error('1) Open: https://cloud.mongodb.com/v2#/security/network/whitelist')
      console.error('2) For Vercel, allow access from anywhere: 0.0.0.0/0')
      console.error('3) For local testing, also add your current IP')
      console.error('4) Wait 1–2 minutes, then retry\n')
    } else {
      console.error('MongoDB connection failed:', message)
    }

    throw error
  }
}
