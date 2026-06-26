const WEBSITE_MODEL_NUMBERS = [13, 8, 12, 2, 6, 4, 5]
const MIN_WEBSITE_BET_PAYOUT = 1.10
const MODEL12_MIN_DISPLAY_PAYOUT = 1.02
const MAX_WEBSITE_BEST_BET_PAYOUT = Number.POSITIVE_INFINITY
const MODEL8_SOURCE_MODEL_NUMBER = 1
const MODEL8_PROBABILITY_BOOST = 16
const MODEL8_PROBABILITY_CAP = 97

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
  const raw = String(rawPitcher || '')
    .replace(/^[✅❌✕✓✗\s]+/, '')
    .replace(/^[^A-Za-z0-9]+/, '')
    .trim()
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
  const explicit = String(value || '').trim()
  const raw = explicit || oddsFromMarket(bet, lines)
  const num = Number.parseFloat(String(raw || '').replace(/[$,]/g, ''))
  return Number.isFinite(num) ? num : 0
}

function getModel(row, modelNumber) {
  const sourceModelNumber = modelNumber === 8 ? MODEL8_SOURCE_MODEL_NUMBER : modelNumber
  const prefix = `Model ${sourceModelNumber}`
  const rawBet = firstValue(row, [
    `${prefix} Best Bet`,
    `${prefix} Bet`,
  ])
  const rawProb = firstValue(row, [
    `${prefix} Best Prob`,
    `${prefix} Prob`,
    `${prefix} Probability`,
  ])
  const explicitOdds = firstValue(row, [`${prefix} Odds`, `${prefix} Best Odds`])
  const marketOdds = oddsFromMarket(rawBet, row['Projected Kalshi Lines'])
  const odds = explicitOdds || marketOdds
  const oddsNumber = parseOddsNumber(odds, rawBet, row['Projected Kalshi Lines'])
  const normalizedBet = String(rawBet || '').trim().toLowerCase()
  const minDisplayPayout = modelNumber === 12 || modelNumber === 13 ? MODEL12_MIN_DISPLAY_PAYOUT : MIN_WEBSITE_BET_PAYOUT
  const meetsPayoutFloor = oddsNumber >= minDisplayPayout
  const bet = normalizedBet && normalizedBet !== 'pass' && meetsPayoutFloor ? rawBet : 'Pass'
  const boostedProbability = boostedModelProbability(modelNumber, bet, rawProb)
  const rawEdge = firstValue(row, [`${prefix} Best Edge`, `${prefix} Edge`, `${prefix} K Edge`, `${prefix} Best K Edge`])
  const boostedEdge = modelNumber === 8 && oddsNumber > 0 && boostedProbability.probabilityNumber > 0
    ? formatProbabilityNumber((boostedProbability.probabilityNumber / 100) - (1 / oddsNumber))
    : rawEdge

  return {
    number: modelNumber,
    bet,
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

function isBestBetEligible(model) {
  return model.oddsNumber >= MIN_WEBSITE_BET_PAYOUT && model.oddsNumber <= MAX_WEBSITE_BEST_BET_PAYOUT
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
      const eligibleModels = usableModels.filter(isBestBetEligible)
      const bestModel = eligibleModels
        .sort((a, b) => b.probabilityNumber - a.probabilityNumber)[0]
      const pitcher = parsePitcher(row['Pitcher'])
      const actualKs = firstValue(row, ['Actual K', 'Actual Ks', 'Actual Strikeouts', 'Strikeouts', 'Final K', 'Final Ks', 'SO', 'K Result'])
      const boardSection = firstValue(row, ['Board Section', 'Section'])
      const sectionLabel = `${sourceSection || ''} ${boardSection || ''}`.toLowerCase()
      const resultSection = /(yesterday|result|final|completed|graded)/i.test(sectionLabel)
      const fallbackBet = firstValue(row, ['Website Best Bet', 'Best Bet', 'Bet'])
      const fallbackProb = firstValue(row, ['Website Best Prob', 'Best Prob', 'Bet Prob'])
      const fallbackOdds = firstValue(row, ['Website Best Payout', 'Best Odds', 'Bet Payout'])
      const fallbackModelLabel = firstValue(row, ['Website Pick Source', 'Bet Model', 'Best Model']) || 'No Pick'
      const selected = bestModel || (fallbackBet ? {
        number: Number.parseInt(String(fallbackModelLabel || '').replace(/\D/g, ''), 10) || '',
        bet: fallbackBet,
        prob: fallbackProb,
        edge: firstValue(row, ['Website Best Edge', 'Best Edge', 'Bet Edge']),
        odds: fallbackOdds,
        k: firstValue(row, ['Bet Wizard K', 'Website Wizard K', 'Model K']),
        kEdge: firstValue(row, ['Website Best K Edge', 'Bet K Edge', 'K Edge']),
      } : null)

      if (!selected) continue

      const explicitResult = firstValue(row, [
        'Best Bet Result',
        selected.number ? `Model ${selected.number} Result` : '',
        'Result',
        'Outcome',
        'Hit/Miss',
        'Hit?',
      ])
      const inferredResult = explicitResult || inferBetResult(selected.bet, actualKs)

      plays.push({
        Pitcher: pitcher.name,
        'Pitcher Team': pitcher.team,
        Opponent: row['Opponent'] || '',
        'Game Time': row['Game Time'] || '',
        'Pick Date': row['Pick Date'] || row['Date'] || '',
        Side: row['Side'] || '',
        Trust: selected.bet ? trustFromProbability(selected.prob) : 'No Pick',
        'Best Model': selected.number ? `Model ${selected.number}` : fallbackModelLabel,
        'Best Bet': selected.bet,
        'Model 13 Bet': modelByNumber[13]?.bet || '',
        'Model 8 Bet': modelByNumber[8]?.bet || '',
        'Model 12 Bet': modelByNumber[12]?.bet || '',
        'Model 2 Bet': modelByNumber[2]?.bet || '',
        'Model 6 Bet': modelByNumber[6]?.bet || '',
        'Model 4 Bet': modelByNumber[4]?.bet || '',
        'Model 5 Bet': modelByNumber[5]?.bet || '',
        'Parlay Pick': row['Best Parlay Pick'] || row['Parlay Pick'] || row['Parlay Bets'] || '',
        'Best Prob': selected.prob,
        'Model 13 Prob': modelByNumber[13]?.prob || '',
        'Model 8 Prob': modelByNumber[8]?.prob || '',
        'Model 12 Prob': modelByNumber[12]?.prob || '',
        'Model 2 Prob': modelByNumber[2]?.prob || '',
        'Model 6 Prob': modelByNumber[6]?.prob || '',
        'Model 4 Prob': modelByNumber[4]?.prob || '',
        'Model 5 Prob': modelByNumber[5]?.prob || '',
        'Best Edge': selected.edge,
        'Model 13 Edge': modelByNumber[13]?.edge || '',
        'Model 8 Edge': modelByNumber[8]?.edge || '',
        'Model 12 Edge': modelByNumber[12]?.edge || '',
        'Model 2 Edge': modelByNumber[2]?.edge || '',
        'Model 6 Edge': modelByNumber[6]?.edge || '',
        'Model 4 Edge': modelByNumber[4]?.edge || '',
        'Model 5 Edge': modelByNumber[5]?.edge || '',
        'Best Odds': selected.odds || row['Best Odds'] || '',
        'Model 13 Odds': modelByNumber[13]?.odds || '',
        'Model 8 Odds': modelByNumber[8]?.odds || '',
        'Model 12 Odds': modelByNumber[12]?.odds || '',
        'Model 2 Odds': modelByNumber[2]?.odds || '',
        'Model 6 Odds': modelByNumber[6]?.odds || '',
        'Model 4 Odds': modelByNumber[4]?.odds || '',
        'Model 5 Odds': modelByNumber[5]?.odds || '',
        'Model 13 K': modelByNumber[13]?.k || '',
        'Model 13 K Edge': modelByNumber[13]?.kEdge || '',
        'Model 8 K': modelByNumber[8]?.k || '',
        'Model 8 K Edge': modelByNumber[8]?.kEdge || '',
        'Model 12 K': modelByNumber[12]?.k || '',
        'Model 12 K Edge': modelByNumber[12]?.kEdge || '',
        'Model 2 K': modelByNumber[2]?.k || '',
        'Model 2 K Edge': modelByNumber[2]?.kEdge || '',
        'Model 6 K': modelByNumber[6]?.k || '',
        'Model 6 K Edge': modelByNumber[6]?.kEdge || '',
        'Model 4 K': modelByNumber[4]?.k || '',
        'Model 4 K Edge': modelByNumber[4]?.kEdge || '',
        'Model 5 K': modelByNumber[5]?.k || '',
        'Model 5 K Edge': modelByNumber[5]?.kEdge || '',
        'Model K': selected.k || modelByNumber[8]?.k || '',
        'K Edge': selected.kEdge || modelByNumber[8]?.kEdge || '',
        'Parlay Backtest Selected Model': row['Parlay Backtest Selected Model'] || '',
        'Parlay Full Plays': row['Parlay Full Plays'] || '',
        'Parlay Full Record': row['Parlay Full Record'] || '',
        'Parlay Full Win Rate': row['Parlay Full Win Rate'] || '',
        'Parlay Full ROI': row['Parlay Full ROI'] || '',
        'Parlay Full Profit': row['Parlay Full Profit'] || '',
        'Parlay Full Avg Prob': row['Parlay Full Avg Prob'] || '',
        'Parlay Full Avg K Gap': row['Parlay Full Avg K Gap'] || '',
        'Model 13 Backtest Record': row['Model 13 Backtest Record'] || '',
        'Model 13 Backtest Win Rate': row['Model 13 Backtest Win Rate'] || '',
        'Model 13 Backtest Plays': row['Model 13 Backtest Plays'] || '',
        'Model 13 Backtest ROI': row['Model 13 Backtest ROI'] || '',
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
        'K/G': row['K/G'] || '',
        'Recent Last 2 K/G': row['K/G'] || '',
        'Last 5 Ks': row['Last 5 Ks'] || row['Last 5 Strikeouts'] || row['Recent Last 5 Ks'] || '',
        'Bullpen Data': row['Bullpen Data'] || '',
        'Kalshi Lines': row['Projected Kalshi Lines'] || '',
        'Actual Ks': actualKs,
        Result: inferredResult,
        '_Source Section': sourceSection,
        'Board Section': boardSection,
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
    const section = `${play['_Source Section'] || ''} ${play['Board Section'] || ''}`.toLowerCase()
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
