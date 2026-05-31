import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

function parseProbability(value) {
  const raw = String(value || '').replace('%', '').trim()
  const num = Number.parseFloat(raw)
  if (!Number.isFinite(num)) return 0
  return num <= 1 ? num * 100 : num
}

function pickHighestProbability(plays) {
  return [...plays]
    .filter(play => play && play['Best Bet'])
    .sort((a, b) => parseProbability(b['Best Prob']) - parseProbability(a['Best Prob']))[0] || null
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const data = await redis.get('picks:today')
    const plays = Array.isArray(data?.plays) ? data.plays : []
    const freePick = pickHighestProbability(plays)

    return res.status(200).json({
      pick: freePick,
      lastUpdated: data?.lastUpdated || null,
    })
  } catch (err) {
    return res.status(200).json({ pick: null, lastUpdated: null })
  }
}
