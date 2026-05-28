import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const filePath = path.join(process.cwd(), 'data', 'picks.json')
      if (!fs.existsSync(filePath)) {
        return res.status(200).json({ plays: [], lastUpdated: null })
      }
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      res.status(200).json(data)
    } catch (err) {
      res.status(200).json({ plays: [], lastUpdated: null })
    }
  }

  else if (req.method === 'POST') {
    // Verify admin key
    const adminKey = req.headers['x-admin-key']
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    try {
      const dataDir = path.join(process.cwd(), 'data')
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir)
      const filePath = path.join(dataDir, 'picks.json')
      const payload = {
        plays: req.body.plays || [],
        lastUpdated: new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' }),
      }
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2))
      res.status(200).json({ success: true, count: payload.plays.length })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  }

  else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
