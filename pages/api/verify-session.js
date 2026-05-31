import Stripe from 'stripe'
import { Redis } from '@upstash/redis'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const redis = Redis.fromEnv()

const PLAN_BY_PRICE = {
  price_1TYwNoIzVbZI7suaeiqXo9Ws: 'weekly',
  price_1TYwOlIzVbZI7suaEGEbXxia: 'monthly',
  price_1TYwPfIzVbZI7suaxHy2ScZ3: 'season',
}

function parseMember(data) {
  if (!data) return null
  if (typeof data === 'string') return JSON.parse(data)
  return data
}

function planFromSession(session) {
  const metadataPlan = session.metadata?.plan || session.subscription?.metadata?.plan
  if (metadataPlan) return metadataPlan

  const priceId = session.line_items?.data?.[0]?.price?.id
  return PLAN_BY_PRICE[priceId] || (session.mode === 'payment' ? 'season' : 'weekly')
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
  if (req.method === 'POST') {
    const { session_id } = req.body
    if (!session_id) return res.status(400).json({ valid: false })

    try {
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['line_items', 'subscription'],
      })
      const paid = session.payment_status === 'paid' || session.status === 'complete'
      
      if (paid && session.customer_details?.email) {
        const email = session.customer_details.email.toLowerCase()
        const existingMember = parseMember(await redis.get(`member:${email}`))
        const plan = planFromSession(session)
        // Store email as member with expiry info
        const memberData = {
          ...existingMember,
          email,
          joinedAt: existingMember?.joinedAt || new Date().toISOString(),
          sessionId: session_id,
          plan,
          stripeCustomerId: session.customer || existingMember?.stripeCustomerId || null,
          stripeSubscriptionId: session.subscription?.id || session.subscription || existingMember?.stripeSubscriptionId || null,
          updatedAt: new Date().toISOString(),
        }
        await redis.set(`member:${email}`, memberData)
        return res.status(200).json({ valid: true, email, plan })
      }

      res.status(200).json({ valid: false })
    } catch (err) {
      console.error(err)
      res.status(200).json({ valid: false })
    }
  }

  else if (req.method === 'GET') {
    // Check if email is a member
    const { email } = req.query
    if (!email) return res.status(400).json({ valid: false })

    try {
      const data = parseMember(await redis.get(`member:${email.toLowerCase()}`))
      if (data) {
        const plan = await resolveMemberPlan(data)
        if (data.plan !== plan) {
          await redis.set(`member:${email.toLowerCase()}`, {
            ...data,
            plan,
            updatedAt: new Date().toISOString(),
          })
        }

        return res.status(200).json({
          valid: true,
          email: email.toLowerCase(),
          plan,
        })
      }
      res.status(200).json({ valid: false })
    } catch (err) {
      res.status(200).json({ valid: false })
    }
  }

  else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
