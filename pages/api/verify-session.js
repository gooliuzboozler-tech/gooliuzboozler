import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  const { session_id } = req.query
  if (!session_id) return res.status(400).json({ valid: false })

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id)
    const valid = session.payment_status === 'paid' || session.status === 'complete'
    res.status(200).json({ valid })
  } catch (err) {
    res.status(200).json({ valid: false })
  }
}
