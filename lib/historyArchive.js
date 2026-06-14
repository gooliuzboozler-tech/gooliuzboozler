function cleanDate(value) {
  const raw = String(value || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : ''
}

function dateFromPlay(play) {
  return cleanDate(play?.['Pick Date'] || play?.Date)
}

function sortedDates(values) {
  return [...new Set((values || []).map(cleanDate).filter(Boolean))].sort()
}

async function addHistoryDates(redis, dates) {
  const existing = await redis.get('picks:history:dates').catch(() => null)
  const merged = sortedDates([...(Array.isArray(existing) ? existing : []), ...dates])
  await redis.set('picks:history:dates', merged)
  return merged
}

async function archiveHistoryPayload(redis, date, payload) {
  const clean = cleanDate(date)
  if (!clean || !payload?.plays?.length) return null

  const historyPayload = {
    plays: payload.plays,
    lastUpdated: payload.lastUpdated || null,
    date: clean,
  }

  await redis.set(`picks:history:${clean}`, historyPayload)
  await addHistoryDates(redis, [clean])
  return historyPayload
}

async function archivePlaysByDate(redis, plays, lastUpdated) {
  const byDate = new Map()

  ;(plays || []).forEach(play => {
    const date = dateFromPlay(play)
    if (!date) return
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date).push(play)
  })

  for (const [date, datePlays] of byDate.entries()) {
    await archiveHistoryPayload(redis, date, { plays: datePlays, lastUpdated })
  }

  return [...byDate.keys()].sort()
}

module.exports = {
  addHistoryDates,
  archiveHistoryPayload,
  archivePlaysByDate,
  cleanDate,
}
