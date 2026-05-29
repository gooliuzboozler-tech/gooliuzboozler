import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const data = await redis.get('picks:today')
      if (!data) return res.status(200).json({ plays: [], lastUpdated: null })
      res.status(200).json(data)
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
      res.status(200).json({ success: true, count: payload.plays.length })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
