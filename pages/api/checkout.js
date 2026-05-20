import Stripe from 'stripe'

const seasonPriceId = 'price_1TYwPfIzVbZI7suaxHy2ScZ3'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY

  if (!stripeSecretKey) {
    return res.status(500).json({ error: 'Stripe is not configured yet.' })
  }

  const { priceId } = req.body

  if (!priceId) {
    return res.status(400).json({ error: 'Missing priceId' })
  }

  const stripe = new Stripe(stripeSecretKey)
  const isOneTime = priceId === seasonPriceId

  try {
    const session = await stripe.checkout.sessions.create({
      mode: isOneTime ? 'payment' : 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      custom_text: {
        submit: {
          message: 'Daily picks delivered to your inbox before first pitch. Cancel anytime.',
        },
      },
    })

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe error:', err)
    res.status(500).json({ error: err.message })
  }
}
