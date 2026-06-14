import { Redis } from '@upstash/redis'
import historyArchive from '../../lib/historyArchive'

const redis = Redis.fromEnv()
const { archivePlaysByDate } = historyArchive

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const data = await redis.get('picks:yesterday')
      if (!data) return res.status(200).json({ plays: [], lastUpdated: null })
      return res.status(200).json(data)
    } catch {
      return res.status(200).json({ plays: [], lastUpdated: null })
    }
  }

  if (req.method === 'POST') {
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
      await redis.set('picks:yesterday', payload)
      await archivePlaysByDate(redis, payload.plays, payload.lastUpdated)
      return res.status(200).json({ success: true, count: payload.plays.length })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
