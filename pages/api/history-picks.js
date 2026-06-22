import { Redis } from '@upstash/redis'
import historyArchive from '../../lib/historyArchive'

const redis = Redis.fromEnv()
const { archiveHistoryPayload, cleanDate } = historyArchive

function parseMember(data) {
  if (!data) return null
  if (typeof data === 'string') return JSON.parse(data)
  return data
}

function normalizeResult(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw || /^(no\s*pick|pass|void|push|pending|n\/a|na)$/i.test(raw)) return ''
  if (/^(hit|win|won|cash|cashed|true|w)$/i.test(raw)) return 'Hit'
  if (/^(miss|loss|lost|lose|false|l)$/i.test(raw)) return 'Miss'
  return ''
}

function inferBetResult(bet, actualKs, explicitResult) {
  const normalized = normalizeResult(explicitResult)
  if (normalized) return normalized

  const actual = Number.parseFloat(String(actualKs || '').replace(/[^0-9.-]/g, ''))
  const match = String(bet || '').match(/\b(Yes|No)\s+(\d+)\+/i)
  if (!Number.isFinite(actual) || !match) return ''

  const side = match[1].toLowerCase()
  const threshold = Number.parseInt(match[2], 10)
  if (!Number.isFinite(threshold)) return ''

  return side === 'yes' ? (actual >= threshold ? 'Hit' : 'Miss') : (actual < threshold ? 'Hit' : 'Miss')
}

function historyRecordForPlays(plays) {
  return (plays || []).reduce((record, play) => {
    const result = inferBetResult(play['Best Bet'], play['Actual Ks'], play.Result)
    if (result === 'Hit') record.hits += 1
    if (result === 'Miss') record.misses += 1
    return record
  }, { hits: 0, misses: 0 })
}

async function buildDateRecords(dates) {
  const entries = await Promise.all((dates || []).map(async date => {
    const payload = await redis.get(`picks:history:${date}`).catch(() => null)
    return [date, historyRecordForPlays(payload?.plays || [])]
  }))
  return Object.fromEntries(entries)
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    try {
      const date = cleanDate(req.body?.date)
      const plays = Array.isArray(req.body?.plays) ? req.body.plays : []
      if (!date) return res.status(400).json({ error: 'Valid date is required' })
      if (!plays.length) return res.status(400).json({ error: 'At least one play is required' })

      const lastUpdated = req.body?.lastUpdated || new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        dateStyle: 'full',
        timeStyle: 'short',
      })

      await archiveHistoryPayload(redis, date, { plays, lastUpdated })
      return res.status(200).json({ success: true, date, count: plays.length })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

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
    const dateRecords = await buildDateRecords(availableDates)

    return res.status(200).json({
      availableDates,
      dateRecords,
      selectedDate,
      plays: payload?.plays || [],
      lastUpdated: payload?.lastUpdated || null,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
