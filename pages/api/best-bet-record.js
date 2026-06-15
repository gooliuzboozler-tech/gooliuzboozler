import { Redis } from '@upstash/redis'
import liveMlb from '../../lib/liveMlb'
import historyArchive from '../../lib/historyArchive'

const redis = Redis.fromEnv()
const { enrichPlaysWithLiveMlb } = liveMlb
const { cleanDate } = historyArchive

function normalizeResult(value) {
  const raw = String(value || '').toLowerCase()
  if (['hit', 'win', 'won', 'cash', 'cashed', 'true', 'yes', 'w'].some(v => raw.includes(v))) return 'Hit'
  if (['miss', 'loss', 'lost', 'false', 'no', 'l'].some(v => raw.includes(v))) return 'Miss'
  return ''
}

function playDate(play) {
  return cleanDate(play?.['Pick Date'] || play?.Date)
}

function addRecord(record, plays) {
  ;(plays || []).forEach(play => {
    const result = normalizeResult(play.Result)
    if (result === 'Hit') record.hits += 1
    if (result === 'Miss') record.misses += 1
  })
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const record = { hits: 0, misses: 0 }
    const todayPayload = await redis.get('picks:today').catch(() => null)
    const todayPlays = todayPayload?.plays || []
    const currentDates = new Set(todayPlays.map(playDate).filter(Boolean))

    const dates = await redis.get('picks:history:dates').catch(() => null)
    const availableDates = Array.isArray(dates) ? dates.map(cleanDate).filter(Boolean) : []

    for (const date of availableDates) {
      if (currentDates.has(date)) continue
      const payload = await redis.get(`picks:history:${date}`).catch(() => null)
      addRecord(record, payload?.plays || [])
    }

    const enrichedToday = await enrichPlaysWithLiveMlb(todayPlays)
    addRecord(record, enrichedToday)

    return res.status(200).json({
      ...record,
      plays: record.hits + record.misses,
      availableDates,
      currentDates: [...currentDates],
    })
  } catch (err) {
    return res.status(200).json({ hits: 0, misses: 0, plays: 0, error: err.message })
  }
}
