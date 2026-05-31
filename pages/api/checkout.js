import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PLAN_BY_PRICE = {
  price_1TYwNoIzVbZI7suaeiqXo9Ws: 'weekly',
  price_1TYwOlIzVbZI7suaEGEbXxia: 'monthly',
  price_1TYwPfIzVbZI7suaxHy2ScZ3: 'season',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { priceId } = req.body

  if (!priceId) {
    return res.status(400).json({ error: 'Missing priceId' })
  }

  // Determine if one-time or recurring based on price ID
  const seasonPriceId = 'price_1TYwPfIzVbZI7suaxHy2ScZ3'
  const isOneTime = priceId === seasonPriceId
  const plan = PLAN_BY_PRICE[priceId] || 'weekly'

  try {
    const sessionParams = {
      mode: isOneTime ? 'payment' : 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { plan },
      success_url: `${req.headers.origin}/picks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      custom_text: {
        submit: {
          message: "Members get access to today's picks board before first pitch. Cancel anytime.",
        },
      },
    }

    if (!isOneTime) {
      sessionParams.subscription_data = {
        metadata: { plan },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe error:', err)
    res.status(500).json({ error: err.message })
  }
}
