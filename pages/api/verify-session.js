import Stripe from 'stripe'
import { Redis } from '@upstash/redis'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const redis = Redis.fromEnv()

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { session_id } = req.body
    if (!session_id) return res.status(400).json({ valid: false })

    try {
      const session = await stripe.checkout.sessions.retrieve(session_id)
      const paid = session.payment_status === 'paid' || session.status === 'complete'
      
      if (paid && session.customer_details?.email) {
        const email = session.customer_details.email.toLowerCase()
        // Store email as member with expiry info
        const memberData = {
          email,
          joinedAt: new Date().toISOString(),
          sessionId: session_id,
          plan: session.mode === 'payment' ? 'season' : 'subscription',
        }
        await redis.set(`member:${email}`, JSON.stringify(memberData))
        return res.status(200).json({ valid: true, email })
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
      const data = await redis.get(`member:${email.toLowerCase()}`)
      if (data) {
        return res.status(200).json({ valid: true, email: email.toLowerCase() })
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
