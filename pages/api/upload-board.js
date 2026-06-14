import { Redis } from '@upstash/redis'
import boardCsv from '../../lib/boardCsv'
import historyArchive from '../../lib/historyArchive'

const redis = Redis.fromEnv()
const { applyRememberedBestBets, parseCSV, splitAllInOnePlays } = boardCsv
const { archivePlaysByDate } = historyArchive

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const csv = typeof req.body === 'string' ? req.body : req.body?.csv
    if (!csv) {
      return res.status(400).json({ error: 'Missing CSV body' })
    }

    const previousToday = await redis.get('picks:today').catch(() => null)
    const previousTodayPlays = previousToday?.plays || []
    const plays = parseCSV(csv)
    const { today, yesterday } = splitAllInOnePlays(plays)
    const rememberedYesterday = applyRememberedBestBets(yesterday, previousTodayPlays)
    const lastUpdated = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'full',
      timeStyle: 'short',
    })

    if (plays.length === 0) {
      return res.status(400).json({ error: 'No plays found. Make sure the all-in-one CSV includes a Pitcher, Opponent header.' })
    }

    if (today.length) {
      await redis.set('picks:today', { plays: today, lastUpdated })
      await archivePlaysByDate(redis, today, lastUpdated)
    }

    if (rememberedYesterday.plays.length) {
      await redis.set('picks:yesterday', { plays: rememberedYesterday.plays, lastUpdated })
      await archivePlaysByDate(redis, rememberedYesterday.plays, lastUpdated)
    }

    return res.status(200).json({
      success: true,
      totalCount: plays.length,
      todayCount: today.length,
      yesterdayCount: rememberedYesterday.plays.length,
      rememberedCount: rememberedYesterday.rememberedCount,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
