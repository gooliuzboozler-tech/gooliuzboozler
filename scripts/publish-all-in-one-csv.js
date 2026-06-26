#!/usr/bin/env node

const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')

const WEBSITE_MODEL_NUMBERS = [8, 12, 2, 6, 4, 5]
const MIN_WEBSITE_BET_PAYOUT = 1.10
const MODEL8_SOURCE_MODEL_NUMBER = 1
const MODEL8_PROBABILITY_BOOST = 16
const MODEL8_PROBABILITY_CAP = 97

function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    const next = text[i + 1]

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(field)
      field = ''
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1
      row.push(field)
      if (row.some(value => String(value || '').trim() !== '')) rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }

  row.push(field)
  if (row.some(value => String(value || '').trim() !== '')) rows.push(row)
  return rows
}

function firstValue(source, keys) {
  for (const key of keys) {
    if (!key) continue
    const value = source[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return ''
}

function parsePitcher(rawPitcher) {
  const raw = String(rawPitcher || '')
    .replace(/^[✅❌✕✓✗\s]+/, '')
    .replace(/^[^A-Za-z0-9]+/, '')
    .trim()
  const pitcherMatch = raw.match(/^(.*?)(?:\.([A-Z]{2,3}-(?:RHP|LHP)))?$/)
  const namePart = pitcherMatch?.[1] || raw
  const metaPart = pitcherMatch?.[2] || ''
  const teamMatch = metaPart.match(/^([A-Z]{2,3})/)
  return {
    name: namePart || raw,
    team: teamMatch ? teamMatch[1] : '',
  }
}

function projectRootFromCsvPath(csvPath) {
  return path.resolve(path.dirname(csvPath), '..', '..')
}

async function seasonPitcherLogsForDate(projectRoot, dateKey) {
  const values = new Map()
  const logDir = path.join(projectRoot, 'data', `probable_game_logs_${dateKey}`)

  let entries = []
  try {
    entries = await fs.readdir(logDir)
  } catch {
    return values
  }

  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue

    try {
      const raw = await fs.readFile(path.join(logDir, entry), 'utf8')
      const data = JSON.parse(raw)
      const stats = Array.isArray(data.stats) ? data.stats : []
      const splits = Array.isArray(stats[0]?.splits) ? stats[0].splits : []
      if (!splits.length) continue

      const name = String(splits[0]?.player?.fullName || '').trim().toLowerCase()
      const starts = splits.filter(split => Number(split?.stat?.gamesStarted || 0) > 0)
      if (!name || !starts.length) continue

      const strikeouts = starts.map(split => Number(split?.stat?.strikeOuts || 0))
      const totalStrikeouts = strikeouts.reduce((sum, value) => sum + value, 0)
      const last5 = strikeouts.slice(-5)
      values.set(name, {
        kg: starts.length ? (Math.round((totalStrikeouts / starts.length) * 100) / 100).toString() : '',
        last5Kg: last5.length ? (Math.round((last5.reduce((sum, value) => sum + value, 0) / last5.length) * 100) / 100).toString() : '',
        last5Ks: last5.length ? last5.slice().reverse().join(', ') : '',
      })
    } catch {
      continue
    }
  }

  return values
}

async function buildPitcherLogLookup(csvPath, rows) {
  const projectRoot = projectRootFromCsvPath(csvPath)
  const dates = [...new Set(rows.map(row => String(row['Pick Date'] || '').trim()).filter(Boolean))]
  const lookup = new Map()

  for (const dateKey of dates) {
    lookup.set(dateKey, await seasonPitcherLogsForDate(projectRoot, dateKey))
  }

  return lookup
}

function parseProbabilityNumber(value) {
  const raw = String(value || '').replace('%', '').trim()
  const num = Number.parseFloat(raw)
  if (!Number.isFinite(num)) return 0
  return num <= 1 ? num * 100 : num
}

function formatProbabilityNumber(value) {
  if (!Number.isFinite(value)) return ''
  const rounded = Number(value.toFixed(6))
  return String(rounded).replace(/\.?0+$/, '')
}

function boostedModelProbability(modelNumber, bet, prob) {
  const probabilityNumber = parseProbabilityNumber(prob)
  if (!Number.isFinite(probabilityNumber) || probabilityNumber <= 0) return { prob, probabilityNumber: 0 }

  const normalizedBet = String(bet || '').trim().toLowerCase()
  if (modelNumber !== 8 || !normalizedBet || normalizedBet === 'pass') {
    return { prob, probabilityNumber }
  }

  const boosted = Math.min(MODEL8_PROBABILITY_CAP, probabilityNumber + MODEL8_PROBABILITY_BOOST)
  return {
    prob: formatProbabilityNumber(boosted / 100),
    probabilityNumber: boosted,
  }
}

function oddsFromMarket(bet, lines) {
  const betMatch = String(bet || '').match(/\b(Yes|No)\s+(\d+)\+/i)
  if (!betMatch || !lines) return ''

  const side = betMatch[1].toLowerCase()
  const threshold = betMatch[2]
  const escapedThreshold = threshold.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const lineRegex = new RegExp(`${escapedThreshold}\\+:\\s*Yes\\s*\\$?([0-9.]+)\\s*/\\s*No\\s*\\$?([0-9.]+)`, 'i')
  const lineMatch = String(lines).match(lineRegex)
  if (!lineMatch) return ''

  return side === 'yes' ? lineMatch[1] : lineMatch[2]
}

function parseOddsNumber(value, bet, lines) {
  const raw = String(value || '').trim() || oddsFromMarket(bet, lines)
  const num = Number.parseFloat(String(raw || '').replace(/[$,]/g, ''))
  return Number.isFinite(num) ? num : 0
}

function trustFromProbability(value) {
  const prob = parseProbabilityNumber(value)
  if (prob >= 80) return 'Strong'
  if (prob >= 70) return 'Playable'
  if (prob >= 60) return 'Thin'
  return 'Pass'
}

function inferBetResult(bet, actualKs) {
  const actual = Number.parseFloat(String(actualKs || '').replace(/[^0-9.-]/g, ''))
  const match = String(bet || '').match(/\b(Yes|No)\s+(\d+)\+/i)
  if (!Number.isFinite(actual) || !match) return ''

  const side = match[1].toLowerCase()
  const threshold = Number.parseInt(match[2], 10)
  if (!Number.isFinite(threshold)) return ''
  return side === 'yes'
    ? (actual >= threshold ? 'Hit' : 'Miss')
    : (actual < threshold ? 'Hit' : 'Miss')
}

function getModel(row, modelNumber) {
  const sourceModelNumber = modelNumber === 8 ? MODEL8_SOURCE_MODEL_NUMBER : modelNumber
  const prefix = `Model ${sourceModelNumber}`
  const bet = firstValue(row, [
    `${prefix} Best Bet`,
    `${prefix} Bet`,
  ])
  const prob = firstValue(row, [
    `${prefix} Best Prob`,
    `${prefix} Prob`,
    `${prefix} Probability`,
  ])
  const odds = firstValue(row, [
    `${prefix} Odds`,
    `${prefix} Best Odds`,
    `${prefix} Payout`,
  ])

  const oddsNumber = parseOddsNumber(odds, bet, row['Projected Kalshi Lines'])
  const normalizedBet = String(bet || '').trim().toLowerCase()
  const usableBet = normalizedBet && normalizedBet !== 'pass' && oddsNumber >= MIN_WEBSITE_BET_PAYOUT ? bet : 'Pass'
  const boostedProbability = boostedModelProbability(modelNumber, usableBet, prob)
  const rawEdge = firstValue(row, [`${prefix} Best Edge`, `${prefix} Edge`])
  const boostedEdge = modelNumber === 8 && oddsNumber > 0 && boostedProbability.probabilityNumber > 0
    ? formatProbabilityNumber((boostedProbability.probabilityNumber / 100) - (1 / oddsNumber))
    : rawEdge

  return {
    number: modelNumber,
    bet: usableBet,
    prob: boostedProbability.prob,
    edge: boostedEdge,
    odds,
    k: firstValue(row, [`${prefix} K`, `${prefix} Model K`]),
    kEdge: firstValue(row, [`${prefix} K Edge`, `${prefix} Best K Edge`]),
    probabilityNumber: boostedProbability.probabilityNumber,
    oddsNumber,
  }
}

function isUsableModel(model) {
  const bet = String(model.bet || '').trim().toLowerCase()
  return bet && bet !== 'pass' && model.probabilityNumber > 0
}

function selectedModel(row, models) {
  const explicit = firstValue(row, ['Bet Model', 'Best Model', 'Best Bet Model', 'Website Pick Source'])
  const explicitNumber = Number.parseInt(String(explicit || '').replace(/\D/g, ''), 10)
  const explicitModel = models.find(model => model.number === explicitNumber && isUsableModel(model))

  const usableModels = models.filter(isUsableModel)
  return usableModels
    .filter(model => model.oddsNumber >= MIN_WEBSITE_BET_PAYOUT)
    .sort((a, b) => b.probabilityNumber - a.probabilityNumber)[0] ||
    explicitModel ||
    usableModels.sort((a, b) => b.probabilityNumber - a.probabilityNumber)[0] ||
    null
}

function cleanMatchValue(value) {
  return String(value || '')
    .replace(/^[✅❌✕✓✗\s]+/, '')
    .replace(/^[^A-Za-z0-9]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function cleanTeamValue(value) {
  return String(value || '').replace(/[^A-Za-z]/g, '').trim().toUpperCase()
}

function buildRememberedBestLookup(previousTodayPlays) {
  const full = new Map()
  const pitcherTeam = new Map()
  const pitcherOnlyCandidates = new Map()
  const pitcherCounts = new Map()

  for (const play of previousTodayPlays) {
    const pitcher = cleanMatchValue(play.Pitcher)
    if (!pitcher || !play['Best Bet']) continue
    const team = cleanTeamValue(play['Pitcher Team'])
    const opponent = cleanTeamValue(play.Opponent)
    if (team && opponent) full.set(`${pitcher}|${team}|${opponent}`, play)
    if (team) pitcherTeam.set(`${pitcher}|${team}`, play)
    pitcherOnlyCandidates.set(pitcher, play)
    pitcherCounts.set(pitcher, (pitcherCounts.get(pitcher) || 0) + 1)
  }

  const pitcherOnly = new Map()
  for (const [pitcher, play] of pitcherOnlyCandidates.entries()) {
    if (pitcherCounts.get(pitcher) === 1) pitcherOnly.set(pitcher, play)
  }
  return { full, pitcherTeam, pitcherOnly }
}

function rememberedBest(play, lookup) {
  const pitcher = cleanMatchValue(play.Pitcher)
  const team = cleanTeamValue(play['Pitcher Team'])
  const opponent = cleanTeamValue(play.Opponent)
  return (team && opponent && lookup.full.get(`${pitcher}|${team}|${opponent}`)) ||
    (team && lookup.pitcherTeam.get(`${pitcher}|${team}`)) ||
    lookup.pitcherOnly.get(pitcher) ||
    null
}

function buildOutcomeLookup(yesterdayPlays) {
  return buildRememberedBestLookup(
    yesterdayPlays.filter(play => String(play['Actual Ks'] || '').trim() || String(play.Result || '').trim())
  )
}

function previousTodayDate(previousTodayPlays) {
  const dates = [...new Set((previousTodayPlays || [])
    .map(play => String(play['Pick Date'] || '').trim())
    .filter(Boolean))]
  return dates.length === 1 ? dates[0] : ''
}

function buildYesterdayFromPreviousToday(previousTodayPlays, yesterdayPlays) {
  if (!Array.isArray(previousTodayPlays) || previousTodayPlays.length === 0) return null

  const yesterdayDates = [...new Set((yesterdayPlays || [])
    .map(play => String(play['Pick Date'] || '').trim())
    .filter(Boolean))]
  const previousDate = previousTodayDate(previousTodayPlays)
  if (yesterdayDates.length === 1 && previousDate && previousDate !== yesterdayDates[0]) return null

  const outcomeLookup = buildOutcomeLookup(yesterdayPlays)
  return previousTodayPlays.map(previous => {
    const outcome = rememberedBest(previous, outcomeLookup)
    const actualKs = firstValue(outcome || {}, ['Actual Ks', 'Actual K', 'Final Ks', 'K Result']) ||
      firstValue(previous, ['Actual Ks', 'Actual K', 'Final Ks', 'K Result', 'Live Ks'])
    const next = {
      ...previous,
      'Actual Ks': actualKs,
      Result: inferBetResult(previous['Best Bet'], actualKs) || previous.Result || '',
      'Live Ks': firstValue(previous, ['Live Ks']) || actualKs,
      'Live Status': previous['Live Status'] || 'Final',
    }
    return next
  })
}

function rowToPlay(row, pitcherLogLookup = new Map()) {
  const pitcher = parsePitcher(row.Pitcher)
  const pickDate = String(row['Pick Date'] || '').trim()
  const logStats = pitcherLogLookup.get(pickDate)?.get(String(pitcher.name || '').trim().toLowerCase()) || null
  const models = WEBSITE_MODEL_NUMBERS.map(modelNumber => getModel(row, modelNumber))
  const modelByNumber = Object.fromEntries(models.map(model => [model.number, model]))
  const bestModel = selectedModel(row, models)
  const boardSection = String(row['Board Section'] || '').toLowerCase()
  const fallbackBet = firstValue(row, ['Website Best Bet', 'Best Bet', 'Bet'])
  const fallbackProb = firstValue(row, ['Website Best Prob', 'Best Prob', 'Bet Prob'])
  const fallbackOdds = firstValue(row, ['Website Best Payout', 'Best Odds', 'Bet Payout'])
  const fallbackEdge = firstValue(row, ['Website Best Edge', 'Best Edge', 'Bet Edge'])
  const fallbackK = firstValue(row, ['Bet Wizard K', 'Website Wizard K', 'Model K'])
  const fallbackKEdge = firstValue(row, ['Website Best K Edge', 'Bet K Edge', 'K Edge'])
  const bestBet = bestModel?.bet || fallbackBet || ''
  const bestProb = bestModel?.prob || fallbackProb || ''
  const bestOdds = bestModel?.odds || fallbackOdds || ''
  const bestEdge = bestModel?.edge || fallbackEdge
  const bestK = bestModel?.k || fallbackK
  const bestKEdge = bestModel?.kEdge || fallbackKEdge
  const fallbackModelLabel = firstValue(row, ['Website Pick Source', 'Bet Model', 'Best Model']) || 'No Pick'
  const selected = bestModel || (boardSection.includes('yesterday') ? {
    number: Number.parseInt(String(fallbackModelLabel || '').replace(/\D/g, ''), 10) || '',
    bet: bestBet,
    prob: bestProb,
    edge: bestEdge,
    odds: bestOdds,
    k: bestK,
    kEdge: bestKEdge,
  } : null)

  if (!selected) return null

  const actualKs = firstValue(row, ['Actual Ks', 'Actual K', 'Final Ks', 'K Result'])
  const explicitResult = firstValue(row, ['Result', 'Outcome', 'Best Bet Result'])
  const result = explicitResult || inferBetResult(bestBet, actualKs)

  return {
    Pitcher: pitcher.name,
    'Pitcher Team': pitcher.team,
    Opponent: row.Opponent || '',
    'Game Time': row['Game Time'] || '',
    Side: row.Side || '',
    Trust: row.Trust || (selected.bet ? trustFromProbability(bestProb) : 'No Pick'),
    'Best Model': selected.number ? `Model ${selected.number}` : fallbackModelLabel,
    'Best Bet': bestBet,
    'Model 8 Bet': modelByNumber[8]?.bet || '',
    'Model 12 Bet': modelByNumber[12]?.bet || '',
    'Model 2 Bet': modelByNumber[2]?.bet || '',
    'Model 6 Bet': modelByNumber[6]?.bet || '',
    'Model 4 Bet': modelByNumber[4]?.bet || '',
    'Model 5 Bet': modelByNumber[5]?.bet || '',
    'Parlay Pick': row['Best Parlay Pick'] || row['Parlay Pick'] || row['Parlay Bets'] || '',
    'Best Prob': bestProb,
    'Model 8 Prob': modelByNumber[8]?.prob || '',
    'Model 12 Prob': modelByNumber[12]?.prob || '',
    'Model 2 Prob': modelByNumber[2]?.prob || '',
    'Model 6 Prob': modelByNumber[6]?.prob || '',
    'Model 4 Prob': modelByNumber[4]?.prob || '',
    'Model 5 Prob': modelByNumber[5]?.prob || '',
    'Best Edge': bestEdge || selected.edge,
    'Model 8 Edge': modelByNumber[8]?.edge || '',
    'Model 12 Edge': modelByNumber[12]?.edge || '',
    'Model 2 Edge': modelByNumber[2]?.edge || '',
    'Model 6 Edge': modelByNumber[6]?.edge || '',
    'Model 4 Edge': modelByNumber[4]?.edge || '',
    'Model 5 Edge': modelByNumber[5]?.edge || '',
    'Best Odds': bestOdds,
    'Model 8 Odds': modelByNumber[8]?.odds || '',
    'Model 12 Odds': modelByNumber[12]?.odds || '',
    'Model 2 Odds': modelByNumber[2]?.odds || '',
    'Model 6 Odds': modelByNumber[6]?.odds || '',
    'Model 4 Odds': modelByNumber[4]?.odds || '',
    'Model 5 Odds': modelByNumber[5]?.odds || '',
    'Model 12 K': modelByNumber[12]?.k || '',
    'Model 12 K Edge': modelByNumber[12]?.kEdge || '',
    'Model K': bestK || selected.k,
    'K Edge': bestKEdge || selected.kEdge,
    'Parlay Backtest Selected Model': row['Parlay Backtest Selected Model'] || '',
    'Parlay Full Plays': row['Parlay Full Plays'] || '',
    'Parlay Full Record': row['Parlay Full Record'] || '',
    'Parlay Full Win Rate': row['Parlay Full Win Rate'] || '',
    'Parlay Full ROI': row['Parlay Full ROI'] || '',
    'Parlay Full Profit': row['Parlay Full Profit'] || '',
    'Parlay Full Avg Prob': row['Parlay Full Avg Prob'] || '',
    'Parlay Full Avg K Gap': row['Parlay Full Avg K Gap'] || '',
    'Model 8 Backtest Record': row['Model 8 Backtest Record'] || '',
    'Model 8 Backtest Win Rate': row['Model 8 Backtest Win Rate'] || '',
    'Model 8 Backtest Plays': row['Model 8 Backtest Plays'] || '',
    'Model 8 Backtest ROI': row['Model 8 Backtest ROI'] || '',
    'Model 12 Backtest Record': row['Model 12 Backtest Record'] || '',
    'Model 12 Backtest Win Rate': row['Model 12 Backtest Win Rate'] || '',
    'Model 12 Backtest Plays': row['Model 12 Backtest Plays'] || '',
    'Model 12 Backtest ROI': row['Model 12 Backtest ROI'] || '',
    'Model 2 Backtest Record': row['Model 2 Backtest Record'] || '',
    'Model 2 Backtest Win Rate': row['Model 2 Backtest Win Rate'] || '',
    'Model 2 Backtest Plays': row['Model 2 Backtest Plays'] || '',
    'Model 2 Backtest ROI': row['Model 2 Backtest ROI'] || '',
    'Model 6 Backtest Record': row['Model 6 Backtest Record'] || '',
    'Model 6 Backtest Win Rate': row['Model 6 Backtest Win Rate'] || '',
    'Model 6 Backtest Plays': row['Model 6 Backtest Plays'] || '',
    'Model 6 Backtest ROI': row['Model 6 Backtest ROI'] || '',
    'Model 4 Backtest Record': row['Model 4 Backtest Record'] || '',
    'Model 4 Backtest Win Rate': row['Model 4 Backtest Win Rate'] || '',
    'Model 4 Backtest Plays': row['Model 4 Backtest Plays'] || '',
    'Model 4 Backtest ROI': row['Model 4 Backtest ROI'] || '',
    'Model 5 Backtest Record': row['Model 5 Backtest Record'] || '',
    'Model 5 Backtest Win Rate': row['Model 5 Backtest Win Rate'] || '',
    'Model 5 Backtest Plays': row['Model 5 Backtest Plays'] || '',
    'Model 5 Backtest ROI': row['Model 5 Backtest ROI'] || '',
    'Individual BvP K%': row['Individual BvP K%'] || '',
    'Individual BvP PA': row['Individual BvP PA'] || '',
    'Individual BvP Standouts': row['Individual BvP Standouts'] || '',
    'Opp K Rank': row['Opp K Rank'] || '',
    'K/G': row['K/G'] || logStats?.kg || '',
    'Recent Last 2 K/G': row['K/G'] || logStats?.kg || '',
    'Last 5 K/G': row['Last 5 K/G'] || logStats?.last5Kg || '',
    'Last 5 Ks': row['Last 5 Ks'] || logStats?.last5Ks || '',
    'Bullpen Data': row['Bullpen Data'] || '',
    'Kalshi Lines': row['Projected Kalshi Lines'] || '',
    'Actual Ks': actualKs,
    Result: result,
    'Pick Date': row['Pick Date'] || '',
    'Board Section': row['Board Section'] || '',
  }
}

function rowsFromAllInOneCsv(text) {
  const parsed = parseCSV(text)
  const headerIndex = parsed.findIndex(row => /^Pitcher$/i.test(String(row[0] || '').trim()))
  if (headerIndex < 0) throw new Error('No Pitcher header found in CSV')

  const headers = parsed[headerIndex].map(header => String(header || '').trim())
  return parsed.slice(headerIndex + 1).map(values => {
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    return row
  }).filter(row => row.Pitcher)
}

async function fetchPreviousToday(siteUrl) {
  return fetchPlays(siteUrl, '/api/picks')
}

async function fetchExistingYesterday(siteUrl) {
  return fetchPlays(siteUrl, '/api/yesterday-picks')
}

async function fetchPlays(siteUrl, route) {
  try {
    const response = await fetch(`${siteUrl}${route}?live=${Date.now()}`)
    if (!response.ok) return []
    const data = await response.json()
    return data.plays || []
  } catch {
    return []
  }
}

function singlePickDate(plays) {
  const dates = [...new Set((plays || [])
    .map(play => String(play['Pick Date'] || '').trim())
    .filter(Boolean))]
  return dates.length === 1 ? dates[0] : ''
}

async function postPlays(siteUrl, adminKey, route, plays) {
  const response = await fetch(`${siteUrl}${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey,
    },
    body: JSON.stringify({ plays }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${route} failed: ${data.error || response.status}`)
  return data
}

async function main() {
  const csvPath = process.argv[2]
  const siteUrl = (process.env.SITE_URL || 'https://gooliuzboozler.com').replace(/\/$/, '')
  const adminKey = process.env.ADMIN_KEY || String(await fs.readFile(path.join(os.homedir(), '.codex', 'gooliuzboozler_admin_key'), 'utf8').catch(() => '')).trim()

  if (!csvPath) throw new Error('Usage: ADMIN_KEY=... node scripts/publish-all-in-one-csv.js /path/to/all-in-one.csv')
  if (!adminKey) throw new Error('ADMIN_KEY is required or ~/.codex/gooliuzboozler_admin_key must exist')

  const text = await fs.readFile(csvPath, 'utf8')
  const previousTodayPlays = await fetchPreviousToday(siteUrl)
  const existingYesterdayPlays = await fetchExistingYesterday(siteUrl)
  const rows = rowsFromAllInOneCsv(text)
  const pitcherLogLookup = await buildPitcherLogLookup(csvPath, rows)
  const plays = rows.map(row => rowToPlay(row, pitcherLogLookup)).filter(Boolean)
  const today = []
  const yesterday = []
  for (const play of plays) {
    const section = String(play['Board Section'] || '').toLowerCase()
    const completed = String(play['Actual Ks'] || '').trim() || /^(hit|miss|push|won|lost|win|loss|w|l)$/i.test(String(play.Result || '').trim())
    if (section.includes('yesterday') || completed) {
      yesterday.push(play)
    } else {
      today.push(play)
    }
  }

  const rememberedYesterday = buildYesterdayFromPreviousToday(previousTodayPlays, yesterday)
  const csvYesterdayDate = singlePickDate(yesterday)
  const existingYesterdayDate = singlePickDate(existingYesterdayPlays)
  const preservedExistingYesterday = !rememberedYesterday?.length &&
    existingYesterdayPlays.length &&
    csvYesterdayDate &&
    existingYesterdayDate === csvYesterdayDate
      ? existingYesterdayPlays
      : null
  const yesterdayToPublish = rememberedYesterday?.length ? rememberedYesterday : (preservedExistingYesterday || yesterday)

  const results = {}
  if (today.length) results.today = await postPlays(siteUrl, adminKey, '/api/picks', today)
  if (yesterdayToPublish.length) results.yesterday = await postPlays(siteUrl, adminKey, '/api/yesterday-picks', yesterdayToPublish)
  console.log(JSON.stringify({
    success: true,
    today: today.length,
    yesterday: yesterdayToPublish.length,
    previousToday: previousTodayPlays.length,
    existingYesterday: existingYesterdayPlays.length,
    usedPreviousTodayForYesterday: Boolean(rememberedYesterday?.length),
    usedExistingYesterday: Boolean(preservedExistingYesterday?.length),
    results,
  }, null, 2))
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
