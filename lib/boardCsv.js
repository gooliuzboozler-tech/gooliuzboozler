const WEBSITE_MODEL_NUMBERS = [1, 2, 6, 4, 5, 8]
const BEST_BET_MIN_PAYOUT = 1.16

function trustFromProbability(value) {
  const raw = String(value || '').replace('%', '').trim()
  const num = Number.parseFloat(raw)
  if (!Number.isFinite(num)) return 'Pass'
  const prob = num <= 1 ? num * 100 : num
  if (prob >= 80) return 'Strong'
  if (prob >= 70) return 'Playable'
  if (prob >= 60) return 'Thin'
  return 'Pass'
}

function parsePitcher(rawPitcher) {
  const raw = String(rawPitcher || '').trim()
  const pitcherMatch = raw.match(/^(.+?)\.([A-Z]{2,3})(?:\b|[.\s-]|$)/)
  if (pitcherMatch) {
    return {
      name: pitcherMatch[1].trim(),
      team: pitcherMatch[2],
    }
  }

  return {
    name: raw,
    team: '',
  }
}

function firstValue(source, keys) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && String(source[key]).trim() !== '') {
      return source[key]
    }
  }
  return ''
}

function inferBetResult(bet, actualKs) {
  const actual = Number.parseFloat(String(actualKs || '').replace(/[^0-9.-]/g, ''))
  const match = String(bet || '').match(/\b(Yes|No)\s+(\d+)\+/i)
  if (!Number.isFinite(actual) || !match) return ''

  const side = match[1].toLowerCase()
  const threshold = Number.parseInt(match[2], 10)
  if (!Number.isFinite(threshold)) return ''

  const hit = side === 'yes' ? actual >= threshold : actual < threshold
  return hit ? 'Hit' : 'Miss'
}

function parseProbabilityNumber(value) {
  const raw = String(value || '').replace('%', '').trim()
  const num = Number.parseFloat(raw)
  if (!Number.isFinite(num)) return 0
  return num <= 1 ? num * 100 : num
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
  const explicit = String(value || '').trim()
  const raw = explicit || oddsFromMarket(bet, lines)
  const num = Number.parseFloat(String(raw || '').replace(/[$,]/g, ''))
  return Number.isFinite(num) ? num : 0
}

function getModel(row, modelNumber) {
  const prefix = `Model ${modelNumber}`
  const bet = firstValue(row, [
    `${prefix} Best Bet`,
    `${prefix} Bet`,
  ])
  const prob = firstValue(row, [
    `${prefix} Best Prob`,
    `${prefix} Prob`,
    `${prefix} Probability`,
  ])
  const odds = firstValue(row, [`${prefix} Odds`, `${prefix} Best Odds`])

  return {
    number: modelNumber,
    bet,
    prob,
    edge: firstValue(row, [`${prefix} Best Edge`, `${prefix} Edge`, `${prefix} K Edge`, `${prefix} Best K Edge`]),
    odds,
    k: firstValue(row, [`${prefix} K`, `${prefix} Model K`]),
    kEdge: firstValue(row, [`${prefix} K Edge`, `${prefix} Best K Edge`]),
    probabilityNumber: parseProbabilityNumber(prob),
    oddsNumber: parseOddsNumber(odds, bet, row['Projected Kalshi Lines']),
  }
}

function isUsableModel(model) {
  const bet = String(model.bet || '').trim().toLowerCase()
  return bet && bet !== 'pass' && model.probabilityNumber > 0
}

function parseCsvLine(line) {
  const vals = []
  let cur = ''
  let inQ = false

  for (let j = 0; j < line.length; j++) {
    const char = line[j]
    const next = line[j + 1]

    if (char === '"' && inQ && next === '"') {
      cur += '"'
      j += 1
    } else if (char === '"') {
      inQ = !inQ
    } else if (char === ',' && !inQ) {
      vals.push(cur.trim())
      cur = ''
    } else {
      cur += char
    }
  }

  vals.push(cur.trim())
  return vals
}

function parseCSV(text) {
  const lines = String(text || '').split('\n').map(l => l.replace(/\r$/, ''))
  const plays = []
  const isBoardHeader = (line) => /^"?Pitcher"?,\s*"?Opponent"?,/i.test(String(line || '').trim())

  function previousSectionName(headerIdx) {
    for (let i = headerIdx - 1; i >= 0; i--) {
      const line = String(lines[i] || '').trim()
      if (line && !line.startsWith(',') && !isBoardHeader(line)) return line.replace(/,+$/, '')
    }
    return ''
  }

  function parseSection(headerIdx) {
    const headers = parseCsvLine(lines[headerIdx]).map(h => h.trim().replace(/^"|"$/g, ''))
    const sourceSection = previousSectionName(headerIdx)

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim() || line.startsWith(',,,')) break
      if (isBoardHeader(line)) break

      const vals = parseCsvLine(line)
      const row = {}
      headers.forEach((h, idx) => { row[h] = vals[idx] || '' })

      if (!row['Pitcher']) break

      const models = WEBSITE_MODEL_NUMBERS.map(modelNumber => getModel(row, modelNumber))
      const modelByNumber = Object.fromEntries(models.map(model => [model.number, model]))
      const usableModels = models.filter(isUsableModel)
      const explicitBestModel = firstValue(row, ['Best Model', 'Best Bet Model'])
      const explicitBestModelNumber = Number.parseInt(String(explicitBestModel || '').replace(/\D/g, ''), 10)
      const explicitModel = usableModels.find(model => model.number === explicitBestModelNumber)
      const bestModel = explicitModel || usableModels
        .filter(model => model.oddsNumber > BEST_BET_MIN_PAYOUT)
        .sort((a, b) => b.probabilityNumber - a.probabilityNumber)[0] || usableModels
        .sort((a, b) => b.probabilityNumber - a.probabilityNumber)[0]
      const pitcher = parsePitcher(row['Pitcher'])
      if (!bestModel) continue

      const actualKs = firstValue(row, ['Actual K', 'Actual Ks', 'Actual Strikeouts', 'Strikeouts', 'Final K', 'Final Ks', 'SO', 'K Result'])
      const explicitResult = firstValue(row, [
        'Best Bet Result',
        `Model ${bestModel.number} Result`,
        'Result',
        'Outcome',
        'Hit/Miss',
        'Hit?',
      ])
      const inferredResult = explicitResult || inferBetResult(bestModel.bet, actualKs)

      plays.push({
        Pitcher: pitcher.name,
        'Pitcher Team': pitcher.team,
        Opponent: row['Opponent'] || '',
        'Game Time': row['Game Time'] || '',
        'Pick Date': row['Pick Date'] || row['Date'] || '',
        Side: row['Side'] || '',
        Trust: trustFromProbability(bestModel.prob),
        'Best Model': `Model ${bestModel.number}`,
        'Best Bet': bestModel.bet,
        'Model 1 Bet': modelByNumber[1]?.bet || '',
        'Model 2 Bet': modelByNumber[2]?.bet || '',
        'Model 6 Bet': modelByNumber[6]?.bet || '',
        'Model 4 Bet': modelByNumber[4]?.bet || '',
        'Model 5 Bet': modelByNumber[5]?.bet || '',
        'Model 8 Bet': modelByNumber[8]?.bet || '',
        'Parlay Pick': row['Best Parlay Pick'] || row['Parlay Pick'] || row['Parlay Bets'] || '',
        'Best Prob': bestModel.prob,
        'Model 1 Prob': modelByNumber[1]?.prob || '',
        'Model 2 Prob': modelByNumber[2]?.prob || '',
        'Model 6 Prob': modelByNumber[6]?.prob || '',
        'Model 4 Prob': modelByNumber[4]?.prob || '',
        'Model 5 Prob': modelByNumber[5]?.prob || '',
        'Model 8 Prob': modelByNumber[8]?.prob || '',
        'Best Edge': bestModel.edge,
        'Model 1 Edge': modelByNumber[1]?.edge || '',
        'Model 2 Edge': modelByNumber[2]?.edge || '',
        'Model 6 Edge': modelByNumber[6]?.edge || '',
        'Model 4 Edge': modelByNumber[4]?.edge || '',
        'Model 5 Edge': modelByNumber[5]?.edge || '',
        'Model 8 Edge': modelByNumber[8]?.edge || '',
        'Best Odds': bestModel.odds || row['Best Odds'] || '',
        'Model 1 Odds': modelByNumber[1]?.odds || '',
        'Model 2 Odds': modelByNumber[2]?.odds || '',
        'Model 6 Odds': modelByNumber[6]?.odds || '',
        'Model 4 Odds': modelByNumber[4]?.odds || '',
        'Model 5 Odds': modelByNumber[5]?.odds || '',
        'Model 8 Odds': modelByNumber[8]?.odds || '',
        'Model 8 K': modelByNumber[8]?.k || '',
        'Model 8 Career Factor': row['Model 8 Career Factor'] || '',
        'Career K/Start': row['Career K/Start'] || '',
        'Career K9': row['Career K9'] || '',
        'Career ERA': row['Career ERA'] || '',
        'Career WHIP': row['Career WHIP'] || '',
        'Career Starts': row['Career Starts'] || '',
        'Last 5 K/G': row['Last 5 K/G'] || '',
        'Model K': bestModel.k || modelByNumber[1]?.k || '',
        'K Edge': bestModel.kEdge || modelByNumber[1]?.kEdge || '',
        'Parlay Backtest Selected Model': row['Parlay Backtest Selected Model'] || '',
        'Parlay Full Plays': row['Parlay Full Plays'] || '',
        'Parlay Full Record': row['Parlay Full Record'] || '',
        'Parlay Full Win Rate': row['Parlay Full Win Rate'] || '',
        'Parlay Full ROI': row['Parlay Full ROI'] || '',
        'Parlay Full Profit': row['Parlay Full Profit'] || '',
        'Parlay Full Avg Prob': row['Parlay Full Avg Prob'] || '',
        'Parlay Full Avg K Gap': row['Parlay Full Avg K Gap'] || '',
        'Model 1 Backtest Record': row['Model 1 Backtest Record'] || '',
        'Model 1 Backtest Win Rate': row['Model 1 Backtest Win Rate'] || '',
        'Model 1 Backtest Plays': row['Model 1 Backtest Plays'] || '',
        'Model 1 Backtest ROI': row['Model 1 Backtest ROI'] || '',
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
        'Recent Last 2 K/G': row['K/G'] || '',
        'Bullpen Data': row['Bullpen Data'] || '',
        'Kalshi Lines': row['Projected Kalshi Lines'] || '',
        'Actual Ks': actualKs,
        Result: inferredResult,
        '_Source Section': sourceSection,
      })
    }
  }

  for (let i = 0; i < lines.length; i++) {
    if (isBoardHeader(lines[i])) parseSection(i)
  }

  return plays.sort((a, b) => parseProbabilityNumber(b['Best Prob']) - parseProbabilityNumber(a['Best Prob']))
}

function splitAllInOnePlays(plays) {
  const today = []
  const yesterday = []
  const completedResultPattern = /^(hit|miss|push|won|lost|win|loss|w|l)$/i

  plays.forEach(play => {
    const section = String(play['_Source Section'] || '').toLowerCase()
    const result = String(play.Result || '').trim()
    const actualKs = String(play['Actual Ks'] || '').trim()
    const isYesterdaySection = /(yesterday|result|final|completed|graded)/i.test(section)
    const isTodaySection = /(today|current|upcoming|live)/i.test(section)
    const isCompleted = isYesterdaySection || actualKs || completedResultPattern.test(result)

    if (isCompleted && !isTodaySection) {
      yesterday.push(play)
    } else {
      today.push(play)
    }
  })

  return { today, yesterday }
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

  previousTodayPlays.forEach(play => {
    const pitcher = cleanMatchValue(play.Pitcher)
    if (!pitcher || !play['Best Bet']) return

    const team = cleanTeamValue(play['Pitcher Team'])
    const opponent = cleanTeamValue(play.Opponent)
    if (team && opponent) full.set(`${pitcher}|${team}|${opponent}`, play)
    if (team) pitcherTeam.set(`${pitcher}|${team}`, play)
    pitcherOnlyCandidates.set(pitcher, play)
    pitcherCounts.set(pitcher, (pitcherCounts.get(pitcher) || 0) + 1)
  })

  const pitcherOnly = new Map()
  pitcherOnlyCandidates.forEach((play, pitcher) => {
    if (pitcherCounts.get(pitcher) === 1) pitcherOnly.set(pitcher, play)
  })

  return { full, pitcherTeam, pitcherOnly }
}

function findRememberedBestBet(play, lookup) {
  const pitcher = cleanMatchValue(play.Pitcher)
  if (!pitcher) return null

  const team = cleanTeamValue(play['Pitcher Team'])
  const opponent = cleanTeamValue(play.Opponent)
  return (team && opponent && lookup.full.get(`${pitcher}|${team}|${opponent}`)) ||
    (team && lookup.pitcherTeam.get(`${pitcher}|${team}`)) ||
    lookup.pitcherOnly.get(pitcher) ||
    null
}

function applyRememberedBestBets(yesterday, previousTodayPlays) {
  const lookup = buildRememberedBestLookup(previousTodayPlays)
  let rememberedCount = 0

  const plays = yesterday.map(play => {
    const remembered = findRememberedBestBet(play, lookup)
    if (!remembered) return play

    rememberedCount += 1
    const next = {
      ...play,
      Trust: remembered.Trust || play.Trust,
      'Best Model': remembered['Best Model'] || play['Best Model'],
      'Best Bet': remembered['Best Bet'] || play['Best Bet'],
      'Best Prob': remembered['Best Prob'] || play['Best Prob'],
      'Best Edge': remembered['Best Edge'] || play['Best Edge'],
      'Best Odds': remembered['Best Odds'] || play['Best Odds'],
      'Model K': remembered['Model K'] || play['Model K'],
      'K Edge': remembered['K Edge'] || play['K Edge'],
    }

    const rememberedResult = inferBetResult(next['Best Bet'], next['Actual Ks'])
    if (rememberedResult) next.Result = rememberedResult
    return next
  })

  return { plays, rememberedCount }
}

module.exports = {
  applyRememberedBestBets,
  parseCSV,
  splitAllInOnePlays,
}
