import { Redis } from '@upstash/redis'
import crypto from 'crypto'
import Stripe from 'stripe'

const redis = Redis.fromEnv()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PLAN_BY_PRICE = {
  price_1TYwNoIzVbZI7suaeiqXo9Ws: 'weekly',
  price_1TYwOlIzVbZI7suaEGEbXxia: 'monthly',
  price_1TYwPfIzVbZI7suaxHy2ScZ3: 'season',
}

function planFromPrice(price) {
  if (!price) return ''
  if (price.unit_amount === 999 && price.recurring?.interval === 'week') return 'weekly'
  if (price.unit_amount === 2499 && price.recurring?.interval === 'month') return 'monthly'
  if (price.unit_amount === 14900 && !price.recurring) return 'season'
  return ''
}

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

function planFromSession(session) {
  const metadataPlan = session.metadata?.plan || session.subscription?.metadata?.plan
  if (metadataPlan) return metadataPlan

  const price = session.line_items?.data?.[0]?.price
  return PLAN_BY_PRICE[price?.id] || planFromPrice(price) || (session.mode === 'payment' ? 'season' : 'weekly')
}

function isKnownPlan(plan) {
  return ['weekly', 'monthly', 'season'].includes(plan)
}

async function resolveMemberPlan(member) {
  if (isKnownPlan(member?.plan)) return member.plan
  if (!member?.sessionId) return 'weekly'

  try {
    const session = await stripe.checkout.sessions.retrieve(member.sessionId, {
      expand: ['line_items', 'subscription'],
    })
    return planFromSession(session)
  } catch {
    return 'weekly'
  }
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

  const plan = await resolveMemberPlan(member)

  if (!member.passwordHash || !member.passwordSalt) {
    const passwordSalt = crypto.randomBytes(16).toString('hex')
    const passwordHash = hashPassword(password, passwordSalt)

    await redis.set(key, {
      ...member,
      email,
      plan,
      passwordSalt,
      passwordHash,
      passwordCreatedAt: new Date().toISOString(),
    })

    return res.status(200).json({
      valid: true,
      email,
      plan,
      createdPassword: true,
    })
  }

  const attemptedHash = hashPassword(password, member.passwordSalt)

  if (attemptedHash === member.passwordHash) {
    if (member.plan !== plan) {
      await redis.set(key, {
        ...member,
        plan,
        updatedAt: new Date().toISOString(),
      })
    }

    return res.status(200).json({ valid: true, email, plan })
  }

  return res.status(401).json({ valid: false, error: 'Wrong password' })
}
