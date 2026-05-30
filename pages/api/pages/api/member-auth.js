import { Redis } from '@upstash/redis'
import crypto from 'crypto'

const redis = Redis.fromEnv()

function parseMember(data) {
  if (!data) return null
  if (typeof data === 'string') return JSON.parse(data)
  return data
}

function hashPassword(password, salt) {
  return crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ valid: false, error: 'Method not allowed' })
  }

  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')

  if (!email || !password) {
    return res.status(400).json({ valid: false, error: 'Email and password are required' })
  }

  if (password.length < 6) {
    return res.status(400).json({ valid: false, error: 'Password must be at least 6 characters' })
  }

  const key = `member:${email}`
  const member = parseMember(await redis.get(key))

  if (!member) {
    return res.status(401).json({ valid: false, error: 'No active membership found for that email' })
  }

  if (!member.passwordHash || !member.passwordSalt) {
    const passwordSalt = crypto.randomBytes(16).toString('hex')
    const passwordHash = hashPassword(password, passwordSalt)

    await redis.set(key, {
      ...member,
      email,
      passwordSalt,
      passwordHash,
      passwordCreatedAt: new Date().toISOString(),
    })

    return res.status(200).json({ valid: true, email, createdPassword: true })
  }

  const attemptedHash = hashPassword(password, member.passwordSalt)

  if (attemptedHash === member.passwordHash) {
    return res.status(200).json({ valid: true, email })
  }

  return res.status(401).json({ valid: false, error: 'Wrong password' })
}
