import mongoose from 'mongoose'

const globalForMongoose = globalThis

if (!globalForMongoose.__viklangMongoose) {
  globalForMongoose.__viklangMongoose = { conn: null, promise: null }
}

const cached = globalForMongoose.__viklangMongoose

export function normalizeMongoUri(uri = process.env.MONGODB_URI) {
  if (!uri) return ''
  return String(uri).trim().replace(/^['"]+|['"]+$/g, '')
}

export function describeMongoUri(uri = normalizeMongoUri()) {
  const value = normalizeMongoUri(uri)
  return {
    hasUri: Boolean(value),
    protocol: value.startsWith('mongodb+srv://')
      ? 'mongodb+srv'
      : value.startsWith('mongodb://')
        ? 'mongodb'
        : value
          ? 'unknown'
          : 'missing',
    hasDatabaseName: /mongodb(\+srv)?:\/\/[^/]+\/[^/?]+/.test(value),
  }
}

export function mongoErrorCode(error, uri = normalizeMongoUri()) {
  if (!uri) return 'missing_uri'

  const message = String(error?.message || error)
  const name = String(error?.name || '')

  if (message.includes('MONGODB_URI is missing')) return 'missing_uri'
  if (message.includes('Authentication failed') || message.includes('auth')) return 'auth_failed'
  if (message.includes('querySrv') || message.includes('ENOTFOUND') || message.includes('EAI_AGAIN')) {
    return 'dns_failed'
  }
  if (message.includes('whitelist') || message.includes('IP that isn')) return 'ip_blocked'
  if (message.includes('SSL') || message.includes('TLS') || message.includes('certificate')) return 'tls_failed'
  if (name === 'MongoServerSelectionError' || message.includes('timed out') || message.includes('timeout')) {
    return 'timeout'
  }

  return 'connect_failed'
}

export function mongoErrorMessage(code) {
  switch (code) {
    case 'missing_uri':
      return 'MONGODB_URI is not set on this server. Add it in Vercel Environment Variables and redeploy.'
    case 'auth_failed':
      return 'MongoDB authentication failed. Check the username and password in MONGODB_URI.'
    case 'dns_failed':
      return 'MongoDB DNS lookup failed. On Vercel, mongodb+srv:// usually works better than a seed-list URI.'
    case 'ip_blocked':
      return 'MongoDB Atlas blocked this IP. Allow 0.0.0.0/0 in Network Access.'
    case 'tls_failed':
      return 'MongoDB TLS handshake failed. Use the Atlas URI with tls/ssl enabled.'
    case 'timeout':
      return 'MongoDB connection timed out. Check MONGODB_URI, Atlas status, and that the URI has no extra quotes.'
    default:
      return 'Database unavailable. Check MONGODB_URI in Vercel and redeploy after changing it.'
  }
}

export async function connectDB(uri = process.env.MONGODB_URI) {
  const mongoUri = normalizeMongoUri(uri)

  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing. Set it in server/.env locally or in Vercel Environment Variables.')
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn
  }

  if (!cached.promise) {
    mongoose.set('strictQuery', true)

    cached.promise = mongoose
      .connect(mongoUri, {
        family: 4,
        tls: mongoUri.includes('mongodb.net'),
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        maxPoolSize: 1,
        minPoolSize: 0,
        bufferCommands: false,
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

    const code = mongoErrorCode(error, mongoUri)
    const safeMessage = String(error?.message || error).replace(mongoUri, '[MONGODB_URI]')
    console.error(`MongoDB connection failed [${code}]:`, safeMessage)

    error.dbCode = code
    throw error
  }
}
