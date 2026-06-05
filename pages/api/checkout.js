import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PLAN_BY_PRICE = {
  price_1TYwNoIzVbZI7suaeiqXo9Ws: 'weekly',
  price_1TYwOlIzVbZI7suaEGEbXxia: 'monthly',
  price_1TYwPfIzVbZI7suaxHy2ScZ3: 'season',
}

const PLAN_PRICE_TARGETS = {
  weekly: { unitAmount: 999, recurringInterval: 'week', name: 'GooliuzBoozler Weekly' },
  monthly: { unitAmount: 2499, recurringInterval: 'month', name: 'GooliuzBoozler Monthly' },
  season: { unitAmount: 14900, recurringInterval: null, name: 'GooliuzBoozler Season Pass' },
}

function planFromPriceId(priceId) {
  return PLAN_BY_PRICE[priceId] || 'weekly'
}

async function findActivePriceForPlan(plan) {
  const target = PLAN_PRICE_TARGETS[plan]
  if (!target) throw new Error(`Unknown checkout plan: ${plan}`)

  const prices = await stripe.prices.list({
    active: true,
    currency: 'usd',
    limit: 100,
  })

  const matches = prices.data
    .filter(price => {
      const interval = price.recurring?.interval || null
      return price.unit_amount === target.unitAmount && interval === target.recurringInterval
    })
    .sort((a, b) => b.created - a.created)

  if (!matches.length) {
    const created = await stripe.prices.create({
      currency: 'usd',
      unit_amount: target.unitAmount,
      recurring: target.recurringInterval ? { interval: target.recurringInterval } : undefined,
      product_data: {
        name: target.name,
      },
      metadata: { plan },
    })

    return created.id
  }

  return matches[0].id
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { priceId } = req.body

  if (!priceId) {
    return res.status(400).json({ error: 'Missing priceId' })
  }

  try {
    const plan = planFromPriceId(priceId)
    const checkoutPriceId = await findActivePriceForPlan(plan)
    const isOneTime = plan === 'season'
    const origin = req.headers.origin || `https://${req.headers.host}`
    const sessionParams = {
      mode: isOneTime ? 'payment' : 'subscription',
      line_items: [{ price: checkoutPriceId, quantity: 1 }],
      metadata: { plan },
      success_url: `${origin}/picks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=true`,
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
