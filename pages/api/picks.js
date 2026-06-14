import { Redis } from '@upstash/redis'
import liveMlb from '../../lib/liveMlb'
import historyArchive from '../../lib/historyArchive'

const redis = Redis.fromEnv()
const { enrichPlaysWithLiveMlb } = liveMlb
const { archivePlaysByDate } = historyArchive

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  if (req.method === 'GET') {
    try {
      const data = await redis.get('picks:today')
      if (!data) return res.status(200).json({ plays: [], lastUpdated: null })
      const plays = await enrichPlaysWithLiveMlb(data.plays || [])
      res.status(200).json({ ...data, plays })
    } catch (err) {
      res.status(200).json({ plays: [], lastUpdated: null })
    }
  } else if (req.method === 'POST') {
    if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    try {
      const payload = {
        plays: req.body.plays || [],
        lastUpdated: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
          dateStyle: 'full',
          timeStyle: 'short',
        }),
      }
      await redis.set('picks:today', payload)
      await archivePlaysByDate(redis, payload.plays, payload.lastUpdated)
      res.status(200).json({ success: true, count: payload.plays.length })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
