import { Redis } from '@upstash/redis'
import historyArchive from '../../lib/historyArchive'

const redis = Redis.fromEnv()
const { cleanDate } = historyArchive

function parseMember(data) {
  if (!data) return null
  if (typeof data === 'string') return JSON.parse(data)
  return data
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const email = String(req.query.email || '').trim().toLowerCase()
  if (!email) {
    return res.status(401).json({ error: 'Season Pass login required' })
  }

  try {
    const member = parseMember(await redis.get(`member:${email}`))
    if (member?.plan !== 'season') {
      return res.status(403).json({ error: 'Season Pass required' })
    }

    const dates = await redis.get('picks:history:dates').catch(() => null)
    const availableDates = Array.isArray(dates) ? dates.filter(cleanDate).sort() : []
    const requestedDate = cleanDate(req.query.date)
    const selectedDate = requestedDate || availableDates[availableDates.length - 1] || ''
    const payload = selectedDate ? await redis.get(`picks:history:${selectedDate}`).catch(() => null) : null

    return res.status(200).json({
      availableDates,
      selectedDate,
      plays: payload?.plays || [],
      lastUpdated: payload?.lastUpdated || null,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
