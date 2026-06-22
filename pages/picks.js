import Head from 'next/head'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const TRUST_STYLES = {
  Strong:   { bg: 'rgba(34,197,94,0.12)',  color: '#22C55E', border: 'rgba(34,197,94,0.3)'  },
  Playable: { bg: 'rgba(234,179,8,0.1)',   color: '#EAB308', border: 'rgba(234,179,8,0.3)'  },
  Thin:     { bg: 'rgba(249,115,22,0.1)',  color: '#F97316', border: 'rgba(249,115,22,0.3)' },
  Likely:   { bg: 'rgba(34,197,94,0.12)',  color: '#22C55E', border: 'rgba(34,197,94,0.3)'  },
  Pass:     { bg: 'rgba(239,68,68,0.08)',  color: '#EF4444', border: 'rgba(239,68,68,0.2)'  },
}

const PLAN_LABELS = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  season: 'Season Pass',
}

const PRICES = {
  weekly:  { id: 'price_1TYwNoIzVbZI7suaeiqXo9Ws', amount: '$9.99', period: 'Weekly access' },
  monthly: { id: 'price_1TYwOlIzVbZI7suaEGEbXxia', amount: '$24.99', period: 'Monthly access' },
  season:  { id: 'price_1TYwPfIzVbZI7suaxHy2ScZ3', amount: '$149', period: 'Full season pass' },
}

const MLB_TEAM_IDS = {
  ARI: 109, AZ: 109, ATL: 144, BAL: 110, BOS: 111, CHC: 112, CIN: 113,
  CLE: 114, COL: 115, CWS: 145, CHW: 145, DET: 116, HOU: 117, KC: 118,
  KCR: 118, LAA: 108, LAD: 119, MIA: 146, MIL: 158, MIN: 142, NYM: 121,
  NYY: 147, ATH: 133, OAK: 133, PHI: 143, PIT: 134, SD: 135, SDP: 135,
  SEA: 136, SF: 137, SFG: 137, STL: 138, TB: 139, TBR: 139, TEX: 140,
  TOR: 141, WSH: 120, WSN: 120,
}

const MODEL_OPTIONS = [
  { value: 'best', label: 'Best Model' },
  { value: '8', label: 'Model 8' },
  { value: '12', label: 'Model 12' },
  { value: '2', label: 'Model 2' },
  { value: '6', label: 'Model 6' },
  { value: '4', label: 'Model 4' },
  { value: '5', label: 'Model 5' },
]

const SORT_OPTIONS = [
  { value: 'probability', label: 'Probability' },
  { value: 'startTime', label: 'Start Time' },
]

function teamLogoUrl(team) {
  const teamId = MLB_TEAM_IDS[String(team || '').toUpperCase()]
  return teamId ? `https://www.mlbstatic.com/team-logos/${teamId}.svg` : ''
}

function parseProbability(value) {
  const raw = String(value || '').replace('%', '').trim()
  const num = Number.parseFloat(raw)
  if (!Number.isFinite(num)) return 0
  return num <= 1 ? num * 100 : num
}

function parseProbabilityDecimal(value) {
  const raw = String(value || '').replace('%', '').trim()
  const num = Number.parseFloat(raw)
  if (!Number.isFinite(num)) return null
  return num > 1 ? num / 100 : num
}

function parseGameStartMinutes(gameTime) {
  const raw = String(gameTime || '').trim()
  const match = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i)
  if (!match) return Number.POSITIVE_INFINITY

  let hours = Number.parseInt(match[1], 10)
  const minutes = Number.parseInt(match[2] || '0', 10)
  const meridiem = match[3].toUpperCase()
  if (meridiem === 'AM' && hours === 12) hours = 0
  if (meridiem === 'PM' && hours !== 12) hours += 12
  return hours * 60 + minutes
}

function formatRoundedNumber(value, { signed = false } = {}) {
  const raw = String(value ?? '').trim()
  if (!raw || raw === '—' || raw === '-') return '-'

  const hasPercent = raw.includes('%')
  const num = Number.parseFloat(raw.replace(/[%,$]/g, '').replace(/,/g, ''))
  if (!Number.isFinite(num)) return raw

  const rounded = Number(num.toFixed(2))
  let formatted = rounded.toFixed(2)

  if (Math.abs(rounded) < 1 && rounded !== 0) {
    formatted = formatted.replace(/^(-?)0\./, '$1.')
  } else {
    formatted = formatted.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
  }

  if (signed && rounded > 0) formatted = `+${formatted}`
  return `${formatted}${hasPercent ? '%' : ''}`
}

function formatProbability(value) {
  const prob = parseProbability(value)
  return prob ? `${prob.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}%` : '-'
}

function formatEdge(value) {
  return formatRoundedNumber(value, { signed: true })
}

function parseDecimalOdds(value, bet, lines) {
  const explicit = String(value || '').trim()
  const raw = explicit || oddsFromMarket(bet, lines)
  const num = Number.parseFloat(String(raw || '').replace(/[$,]/g, ''))
  return Number.isFinite(num) && num > 0 ? num : 0
}

function normalizeResult(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw || /^(no\s*pick|pass|void|push|pending|n\/a|na)$/i.test(raw)) return ''
  if (/^(hit|win|won|cash|cashed|true|w)$/i.test(raw)) return 'Hit'
  if (/^(miss|loss|lost|lose|false|l)$/i.test(raw)) return 'Miss'
  return ''
}

function bestBetRecord(plays) {
  return (plays || []).reduce((record, play) => {
    const read = getPreferredModelRead(play, 'best')
    const result = inferDisplayedBetResult(play, read, true)
    addRecordResult(record, result, read, play)
    return record
  }, { hits: 0, misses: 0, stake: 0, profit: 0 })
}

function formatRecordWinPct(record) {
  const hits = Number(record?.hits || 0)
  const misses = Number(record?.misses || 0)
  const total = hits + misses
  if (!total) return '0%'
  return `${((hits / total) * 100).toFixed(1).replace(/\.0$/, '')}%`
}

function addRecordResult(record, result, read, play) {
  if (result !== 'Hit' && result !== 'Miss') return

  const odds = parseDecimalOdds(read?.odds, read?.bet, play?.['Kalshi Lines'])
  record.stake += 1
  if (result === 'Hit') {
    record.hits += 1
    record.profit += odds > 0 ? odds - 1 : 0
  } else {
    record.misses += 1
    record.profit -= 1
  }
}

function formatRecordRoi(record) {
  const stake = Number(record?.stake || 0)
  const profit = Number(record?.profit || 0)
  if (!stake) return ''

  const roi = (profit / stake) * 100
  const formatted = Math.abs(roi)
    .toFixed(1)
    .replace(/\.0$/, '')
  return `ROI ${roi >= 0 ? '+' : '-'}${formatted}%`
}

function inferDisplayedBetResult(play, read, allowStoredResult = false) {
  const betMatch = String(read?.bet || '').match(/\b(Yes|No)\s+(\d+)\+/i)
  const actualKs = Number.parseFloat(String(play['Live Ks'] || play['Actual Ks'] || '').replace(/[^0-9.-]/g, ''))
  const liveStatus = String(play['Live Status'] || '').toLowerCase()
  const terminal = /starter out|final|completed|game over/.test(liveStatus) || Boolean(normalizeResult(play.Result))

  if (betMatch && Number.isFinite(actualKs)) {
    const side = betMatch[1].toLowerCase()
    const threshold = Number.parseInt(betMatch[2], 10)

    if (side === 'yes') {
      if (actualKs >= threshold) return 'Hit'
      if (terminal) return 'Miss'
    } else if (side === 'no') {
      if (actualKs >= threshold) return 'Miss'
      if (terminal) return 'Hit'
    }
  }

  return allowStoredResult ? normalizeResult(play.Result) : ''
}

function selectedModelRecord(plays, preferredModel = 'best') {
  return (plays || []).reduce((record, play) => {
    const read = getPreferredModelRead(play, preferredModel)
    const result = inferDisplayedBetResult(play, read, preferredModel === 'best')
    addRecordResult(record, result, read, play)
    return record
  }, { hits: 0, misses: 0, stake: 0, profit: 0 })
}

function LiveResultBadge({ play, read, allowStoredResult = false }) {
  const result = inferDisplayedBetResult(play, read, allowStoredResult)
  const liveStatus = String(play['Live Status'] || '').trim()
  const liveKs = String(play['Live Ks'] || play['Actual Ks'] || '').trim()

  if (result) {
    return <span className={`result-badge ${result === 'Hit' ? 'hit' : 'miss'}`}>{result === 'Hit' ? '✓' : '✕'}</span>
  }

  if (liveStatus || liveKs) {
    return <span className="result-badge live">Live</span>
  }

  return <span className="result-badge pending">Pending</span>
}

function oppKRankColor(value) {
  const rank = Number.parseInt(String(value || '').replace(/[^0-9-]/g, ''), 10)
  if (!Number.isFinite(rank)) return '#F2EDE3'
  if (rank <= 10) return '#EF4444'
  if (rank <= 20) return '#EAB308'
  return '#22C55E'
}

function firstValue(source, keys) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && String(source[key]).trim() !== '') {
      return source[key]
    }
  }
  return ''
}

function impliedEdgeFromMarket(probability, bet, lines) {
  const prob = parseProbabilityDecimal(probability)
  const betMatch = String(bet || '').match(/\b(Yes|No)\s+(\d+)\+/i)
  if (prob === null || !betMatch || !lines) return ''

  const side = betMatch[1].toLowerCase()
  const threshold = betMatch[2]
  const escapedThreshold = threshold.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const lineRegex = new RegExp(`${escapedThreshold}\\+:\\s*Yes\\s*\\$([0-9.]+)\\s*/\\s*No\\s*\\$([0-9.]+)`, 'i')
  const lineMatch = String(lines).match(lineRegex)
  if (!lineMatch) return ''

  const yesOdds = Number.parseFloat(lineMatch[1])
  const noOdds = Number.parseFloat(lineMatch[2])
  const odds = side === 'yes' ? yesOdds : noOdds
  if (!Number.isFinite(odds) || odds <= 0) return ''

  return prob - (1 / odds)
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

  const yesOdds = Number.parseFloat(lineMatch[1])
  const noOdds = Number.parseFloat(lineMatch[2])
  const odds = side === 'yes' ? yesOdds : noOdds
  if (!Number.isFinite(odds) || odds <= 0) return ''

  return `$${odds.toFixed(2).replace(/\.00$/, '')}`
}

function formatOdds(value, bet, lines) {
  const explicit = String(value || '').trim()
  if (explicit) {
    const num = Number.parseFloat(explicit.replace(/[$,]/g, ''))
    return Number.isFinite(num) ? `$${num.toFixed(2).replace(/\.00$/, '')}` : explicit
  }
  return oddsFromMarket(bet, lines)
}

function trustFromProbability(value) {
  const prob = parseProbability(value)
  if (prob >= 80) return 'Strong'
  if (prob >= 70) return 'Playable'
  if (prob >= 60) return 'Thin'
  return 'Pass'
}

function probabilityColor(value) {
  const trust = trustFromProbability(value)
  return (TRUST_STYLES[trust] || TRUST_STYLES.Pass).color
}

function betSideColor(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (raw.startsWith('yes')) return '#22C55E'
  if (raw.startsWith('no')) return '#EF4444'
  return '#F2EDE3'
}

function getPreferredModelRead(play, preferredModel = 'best') {
  if (preferredModel === 'best') {
    return {
      modelLabel: play['Best Model'] || 'Best Model',
      bet: play['Best Bet'] || '',
      prob: play['Best Prob'] || '',
      edge: play['Best Edge'] || '',
      odds: play['Best Odds'] || '',
      modelK: play['Model K'] || '',
      kEdge: play['K Edge'] || '',
    }
  }

  const modelNumber = Number.parseInt(preferredModel, 10)
  if (!Number.isFinite(modelNumber)) return getPreferredModelRead(play, 'best')

  const bet = firstValue(play, [`Model ${modelNumber} Bet`, `Model ${modelNumber} Best Bet`])
  const prob = firstValue(play, [`Model ${modelNumber} Prob`, `Model ${modelNumber} Best Prob`])
  const edge = firstValue(play, [`Model ${modelNumber} Edge`, `Model ${modelNumber} Best Edge`, `Model ${modelNumber} K Edge`])
  const odds = firstValue(play, [`Model ${modelNumber} Odds`, `Model ${modelNumber} Best Odds`])

  return {
    modelLabel: `Model ${modelNumber}`,
    bet,
    prob,
    edge,
    odds,
    modelK: firstValue(play, [`Model ${modelNumber} K`, `Model ${modelNumber} Model K`, 'Model K']),
    kEdge: firstValue(play, [`Model ${modelNumber} K Edge`, `Model ${modelNumber} Best K Edge`, 'K Edge']),
  }
}

function usablePreferredRead(play, preferredModel = 'best') {
  const read = getPreferredModelRead(play, preferredModel)
  const bet = String(read.bet || '').trim().toLowerCase()
  return bet && bet !== 'pass' && parseProbability(read.prob) > 0
}

function getPlayTrust(play, preferredModel = 'best') {
  return trustFromProbability(getPreferredModelRead(play, preferredModel).prob)
}

function planHasModel2(plan) {
  return plan === 'monthly' || plan === 'season'
}

function planHasModel3(plan) {
  return plan === 'monthly' || plan === 'season'
}

function planHasAllModels(plan) {
  return plan === 'monthly' || plan === 'season'
}

function planHasFullBoard(plan) {
  return plan === 'season'
}

function isCorePlay(play, preferredModel = 'best') {
  return ['Strong', 'Playable'].includes(getPlayTrust(play, preferredModel))
}

function filterByTrust(play, filter, preferredModel = 'best') {
  const trust = getPlayTrust(play, preferredModel)
  if (filter === 'Likely') return trust === 'Strong'
  return trust === filter
}

function TrustBadge({ trust }) {
  const style = TRUST_STYLES[trust] || TRUST_STYLES.Likely
  return (
    <span style={{
      fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.14em',
      textTransform: 'uppercase', padding: '0.2rem 0.55rem',
      background: style.bg, color: style.color, border: `1px solid ${style.border}`,
    }}>{trust}</span>
  )
}

function PickCard({ play, plan, preferredModel = 'best' }) {
  const [expanded, setExpanded] = useState(false)
  const preferredRead = getPreferredModelRead(play, preferredModel)
  const trust = trustFromProbability(preferredRead.prob)
  const ts = TRUST_STYLES[trust] || TRUST_STYLES.Likely
  const bestModelLabel = preferredRead.modelLabel || 'Best Model'
  const legacyModel2Bet = play[['Conserv', 'ative Bet'].join('')] || ''
  const legacyModel2Prob = play[['Conserv', 'ative Prob'].join('')] || ''
  const legacyModel2Edge = play[['Conserv', 'ative Edge'].join('')] || ''
  const modelStyles = {
    8: { bg: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E' },
    12: { bg: 'rgba(20,184,166,0.07)', border: '1px solid rgba(45,212,191,0.24)', color: '#2DD4BF' },
    2: { bg: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.2)', color: '#EAB308' },
    6: { bg: 'rgba(126,34,206,0.08)', border: '1px solid rgba(168,85,247,0.24)', color: '#C084FC' },
    4: { bg: 'rgba(14,165,233,0.07)', border: '1px solid rgba(56,189,248,0.24)', color: '#38BDF8' },
    5: { bg: 'rgba(236,72,153,0.07)', border: '1px solid rgba(244,114,182,0.24)', color: '#F472B6' },
  }
  const modelRows = [8, 12, 2, 6, 4, 5].map(modelNumber => {
    const fallbackBest = play['Best Model'] === `Model ${modelNumber}`
    const selected = preferredModel === String(modelNumber)
    const bet = firstValue(play, [
      `Model ${modelNumber} Bet`,
      modelNumber === 8 ? 'Best Bet' : '',
      modelNumber === 2 ? legacyModel2Bet : '',
    ])
    const prob = firstValue(play, [
      `Model ${modelNumber} Prob`,
      modelNumber === 8 ? 'Best Prob' : '',
      modelNumber === 2 ? legacyModel2Prob : '',
    ])
    const edge = firstValue(play, [
      `Model ${modelNumber} Edge`,
      `Model ${modelNumber} Best Edge`,
      `Model ${modelNumber} K Edge`,
      modelNumber === 8 ? 'Best Edge' : '',
      modelNumber === 2 ? legacyModel2Edge : '',
    ]) || impliedEdgeFromMarket(prob, bet, play['Kalshi Lines'])
    const odds = formatOdds(firstValue(play, [
      `Model ${modelNumber} Odds`,
      `Model ${modelNumber} Best Odds`,
      fallbackBest ? 'Best Odds' : '',
    ]), bet, play['Kalshi Lines'])
    return { modelNumber, bet, prob, edge, odds, selected, style: modelStyles[modelNumber] }
  })
  const bestOdds = formatOdds(preferredRead.odds, preferredRead.bet, play['Kalshi Lines'])
  const parlayPick = play['Parlay Pick'] || ''
  const teamLogo = teamLogoUrl(play['Pitcher Team'])
  const liveKs = play['Live Ks'] || play['Actual Ks'] || ''
  const liveStatus = play['Live Status'] || ''
  const liveInning = play['Live Inning'] || ''
  const liveOuts = play['Live Outs'] || ''
  const livePitches = play['Live Pitches'] || ''
  const liveOutLabel = liveOuts !== '' ? `${liveOuts} out${String(liveOuts) === '1' ? '' : 's'}` : ''
  const liveResult = inferDisplayedBetResult(play, preferredRead, preferredModel === 'best')
  const liveColor = liveResult === 'Hit' ? '#22C55E' : liveResult === 'Miss' ? '#EF4444' : liveStatus === 'Pitching Live' ? '#EAB308' : '#F2EDE3'
  const showAllModels = planHasAllModels(plan)
  const visibleModels = showAllModels ? modelRows : modelRows.filter(model => model.modelNumber === Number(String(play['Best Model'] || '').replace(/\D/g, '')) || model.bet === play['Best Bet']).slice(0, 1)
  const modelCardCount = visibleModels.length || 1

  return (
    <div className={`pick-card live-pick-card ${liveResult.toLowerCase() || ''}`} style={{ borderColor: expanded ? ts.border : 'rgba(242,237,227,0.07)' }}>
      <div onClick={() => setExpanded(!expanded)} className="pick-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', color: '#F2EDE3', letterSpacing: '0.04em' }}>
            {teamLogo && (
              <img
                src={teamLogo}
                alt={`${play['Pitcher Team']} logo`}
                style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }}
              />
            )}
            <span>{play.Pitcher}</span>
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>vs {play.Opponent} {play['Game Time'] ? `· ${play['Game Time']}` : ''}</div>
        </div>
        <div>
          <LiveResultBadge play={play} read={preferredRead} allowStoredResult={preferredModel === 'best'} />
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 4 }}>{liveStatus || trust}</div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.75rem', color: betSideColor(preferredRead.bet) }}>{preferredRead.bet}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>
            {bestModelLabel}{bestOdds ? ` · ${bestOdds}` : ''}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: probabilityColor(preferredRead.prob) }}>{formatProbability(preferredRead.prob)}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>Prob</div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#22C55E' }}>{formatEdge(preferredRead.kEdge)}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>K Edge</div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#EAB308' }}>{formatRoundedNumber(preferredRead.modelK)}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>K Wizard Proj.</div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: liveColor }}>{liveKs ? formatRoundedNumber(liveKs) : '-'}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>Live Ks</div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.72rem', color: liveInning ? '#F2EDE3' : '#5A5448', whiteSpace: 'nowrap' }}>
            {liveInning ? `${liveInning}${liveOutLabel ? ` · ${liveOutLabel}` : ''}` : '-'}
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>
            {livePitches ? `${formatRoundedNumber(livePitches)} pitches` : 'Pitches'}
          </div>
        </div>
        <div className="pick-toggle">{expanded ? '▲' : '▼'}</div>
      </div>

      {expanded && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(242,237,227,0.05)' }}>
          <div className="model-cards" style={{ '--model-card-count': modelCardCount }}>
            {visibleModels.map(model => (
              <div key={model.modelNumber} style={{ background: model.style.bg, border: model.style.border, padding: '0.85rem' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: model.style.color, letterSpacing: '0.15em', marginBottom: '0.4rem' }}>
                  MODEL {model.modelNumber}{model.selected ? ' · SELECTED' : play['Best Model'] === `Model ${model.modelNumber}` ? ' · BEST' : ''}
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', color: betSideColor(model.bet) }}>{model.bet || '—'}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.68rem', color: '#BFB090', marginTop: 4 }}>
                  <span style={{ color: probabilityColor(model.prob) }}>{formatProbability(model.prob)} prob</span>{model.odds ? ` · ${model.odds} odds` : ''}{model.edge ? ` · ${formatEdge(model.edge)} edge` : ''}
                </div>
              </div>
            ))}
          </div>

          {showAllModels && parlayPick && parlayPick.toLowerCase() !== 'pass' && (
            <div style={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.22)', padding: '0.85rem', marginBottom: '0.75rem' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: '#EAB308', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>BEST PARLAY PICK</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', color: '#F2EDE3' }}>{parlayPick}</div>
            </div>
          )}

          {showAllModels && (
            <>
              <div className="pick-stats-grid">
                {[['Model K', play['Model K']], ['K Edge', play['K Edge']], ['Opp K Rank', play['Opp K Rank']], ['K/G', play['Recent Last 2 K/G']], ['Last 5 Ks', play['Last 5 Ks']]].map(([label, val]) => (
                  <div key={label} style={{ background: 'rgba(242,237,227,0.03)', padding: '0.6rem 0.75rem' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: '#5A5448', letterSpacing: '0.12em', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: label === 'Opp K Rank' ? oppKRankColor(val) : '#F2EDE3' }}>{label === 'Last 5 Ks' ? (val || '-') : formatRoundedNumber(val)}</div>
                  </div>
                ))}
              </div>

              {play['Individual BvP Standouts'] && play['Individual BvP Standouts'] !== '—' && play['Individual BvP Standouts'] !== 'No direct MLB hitter-vs-pitcher plate appearances found for active opposing hitters' && (
                <div style={{ background: 'rgba(242,237,227,0.02)', border: '1px solid rgba(242,237,227,0.06)', padding: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: '#5A5448', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>BVP STANDOUTS</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.72rem', color: '#BFB090', lineHeight: 1.6 }}>{play['Individual BvP Standouts']}</div>
                </div>
              )}

              {play['Kalshi Lines'] && (
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.65rem', color: '#5A5448', lineHeight: 1.8 }}>
                  <span style={{ color: '#F97316' }}>Lines: </span>{play['Kalshi Lines']}
                </div>
              )}

              {play['Bullpen Data'] && play['Bullpen Data'] !== 'none' && (
                <div style={{ marginTop: '0.5rem', fontFamily: 'DM Mono, monospace', fontSize: '0.65rem', color: '#5A5448' }}>
                  <span style={{ color: '#F97316' }}>⚡ Bullpen: </span>{play['Bullpen Data']}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function getFreePick(plays) {
  return [...plays]
    .filter(play => play.Pitcher && play['Best Bet'] && play['Best Bet'] !== 'Pass')
    .sort((a, b) => parseProbability(b['Best Prob']) - parseProbability(a['Best Prob']))[0] || null
}

function PublicFreePick({ pick, lastUpdated, onUnlock }) {
  if (!pick) {
    return (
      <div style={{ background: 'rgba(7,7,7,0.94)', border: '1px solid rgba(242,237,227,0.16)', borderLeft: '3px solid #EAB308', padding: '2rem', boxShadow: '0 24px 80px rgba(0,0,0,0.55)', marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.2em', color: '#EAB308', textTransform: 'uppercase', marginBottom: '1rem' }}>// Public Free Pick</div>
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.5rem', letterSpacing: '0.04em' }}>No free pick posted yet.</div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', color: '#BFB090', marginTop: '0.5rem', lineHeight: 1.7 }}>Check back after today's board is uploaded.</p>
      </div>
    )
  }

  const teamLogo = teamLogoUrl(pick['Pitcher Team'])
  const odds = formatOdds(pick['Best Odds'], pick['Best Bet'], pick['Kalshi Lines'])

  return (
    <div style={{ background: 'rgba(7,7,7,0.94)', border: '1px solid rgba(242,237,227,0.16)', borderLeft: '3px solid #EAB308', padding: '2rem', boxShadow: '0 24px 80px rgba(0,0,0,0.55)', marginBottom: '1.5rem' }}>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.2em', color: '#EAB308', textTransform: 'uppercase', marginBottom: '1rem' }}>// Public Free Pick</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {teamLogo && <img src={teamLogo} alt={`${pick['Pitcher Team']} logo`} style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }} />}
            <div className="free-pick-gold-name" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(2.5rem, 6vw, 4.75rem)', lineHeight: 0.95, letterSpacing: '0.04em' }}>{pick.Pitcher}</div>
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.72rem', color: '#5A5448', letterSpacing: '0.08em', marginTop: '0.35rem' }}>
            vs {pick.Opponent}{pick['Game Time'] ? ` - ${pick['Game Time']}` : ''}
          </div>
        </div>
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '4rem', color: probabilityColor(pick['Best Prob']), lineHeight: 0.9 }}>{formatProbability(pick['Best Prob'])}</div>
      </div>
      <div style={{ marginTop: '1.5rem', fontFamily: 'DM Mono, monospace', fontSize: '1rem', color: '#F2EDE3', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.22)', padding: '1rem' }}>
        <span style={{ color: betSideColor(pick['Best Bet']) }}>{pick['Best Bet']}</span>{pick['Best Model'] ? <span style={{ color: '#BFB090' }}> · {pick['Best Model']}</span> : ''}{odds ? <span style={{ color: '#EAB308' }}> · {odds} odds</span> : ''}
      </div>
      <div className="public-free-pick-grid">
        {[
          ['Trust', trustFromProbability(pick['Best Prob'])],
          ['Odds', odds || '-'],
          ['K Edge', formatEdge(pick['K Edge'])],
          ['Model K', formatRoundedNumber(pick['Model K'])],
        ].map(([label, value]) => (
          <div key={label} style={{ background: 'rgba(10,10,10,0.96)', padding: '0.85rem', fontFamily: 'DM Mono, monospace', fontSize: '0.78rem', color: '#F2EDE3' }}>
            <span style={{ display: 'block', fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5A5448', marginBottom: '0.35rem' }}>{label}</span>
            {value}
          </div>
        ))}
      </div>
      {lastUpdated && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.08em', color: '#5A5448', marginTop: '1rem' }}>Updated: {lastUpdated}</div>}
      <button onClick={onUnlock} style={{ width: '100%', marginTop: '1.25rem', background: '#C8180A', border: 'none', color: '#F2EDE3', fontFamily: 'DM Mono, monospace', fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '1rem', cursor: 'pointer' }}>
        Cheat the system with me
      </button>
    </div>
  )
}

function MembershipChoices({ loading, onSubscribe }) {
  return (
    <div style={{ background: 'rgba(7,7,7,0.96)', border: '1px solid rgba(242,237,227,0.16)', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 24px 80px rgba(0,0,0,0.55)' }}>
      <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>Pick Your Access</div>
      <p style={{ fontFamily: 'DM Sans, sans-serif', color: '#BFB090', lineHeight: 1.7, marginBottom: '1.25rem' }}>Choose a membership and checkout opens in Stripe.</p>
      <div className="membership-choice-grid">
        {Object.entries(PRICES).map(([plan, price]) => (
          <button key={plan} onClick={() => onSubscribe(price.id)} disabled={loading === price.id} style={{ background: plan === 'monthly' ? '#C8180A' : 'rgba(242,237,227,0.04)', border: plan === 'monthly' ? '1px solid #C8180A' : '1px solid rgba(242,237,227,0.14)', color: '#F2EDE3', padding: '1rem', cursor: loading === price.id ? 'not-allowed' : 'pointer', textAlign: 'left' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: plan === 'season' ? '#EAB308' : '#BFB090', marginBottom: '0.55rem' }}>{PLAN_LABELS[plan]}</div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.4rem', lineHeight: 1 }}>{price.amount}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.62rem', color: '#5A5448', letterSpacing: '0.06em' }}>{loading === price.id ? 'Redirecting...' : price.period}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function BlurredPickPreview({ plays }) {
  const preview = plays.slice(0, 5)
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ filter: 'blur(6px)', opacity: 0.42, pointerEvents: 'none' }}>
        {preview.map((play, i) => (
          <PickCard key={i} play={play} plan="season" />
        ))}
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#BFB090', background: 'rgba(5,5,5,0.92)', border: '1px solid rgba(242,237,227,0.14)', padding: '0.8rem 1.2rem' }}>Members unlock the full board</div>
      </div>
    </div>
  )
}

function PublicPicksPreview({ plays, lastUpdated, loading, onSubscribe, onLoginClick }) {
  const [showPlans, setShowPlans] = useState(false)
  const freePick = getFreePick(plays)
  const blurredPlays = plays.filter(play => play !== freePick)
  const todayRecord = bestBetRecord(plays)
  const todayRoi = formatRecordRoi(todayRecord)
  return (
    <>
      <Head><title>Free Pick — GooliuzBoozler</title></Head>
      <nav className="picks-nav">
        <Link href="/" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem', letterSpacing: '0.14em', color: '#F2EDE3' }}>
          GOOLIUZ<span style={{ color: '#C8180A' }}>BOOZLER</span>
        </Link>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/yesterday" className="nav-link neon-purple">
            Yesterday Results
          </Link>
          <button onClick={onLoginClick} style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: 'transparent', color: '#F2EDE3', border: '1px solid rgba(242,237,227,0.22)', padding: '0.65rem 1.5rem', cursor: 'pointer' }}>
            Member Login
          </button>
          <Link href="/#pricing" className="nav-cta">
            Get Access
          </Link>
        </div>
      </nav>
      <div className="picks-shell">
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#EAB308', marginBottom: '0.5rem' }}>// Free Pick</div>
          <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '3.5rem', letterSpacing: '0.04em', lineHeight: 1 }}>Today&apos;s Public Play</h1>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#22C55E', marginTop: '0.6rem' }}>
            Today&apos;s Best Bet Record: {todayRecord.hits}-{todayRecord.misses} ({formatRecordWinPct(todayRecord)}){todayRoi ? ` · ${todayRoi}` : ''}
          </div>
        </div>
        <PublicFreePick pick={freePick} lastUpdated={lastUpdated} onUnlock={() => setShowPlans(true)} />
        {showPlans && <MembershipChoices loading={loading} onSubscribe={onSubscribe} />}
        <div className="pick-header-row">
          <span>Pitcher</span><span>Status</span><span>Best Bet</span><span>Prob</span><span>K Edge</span><span>K Wizard Proj.</span><span>Live Ks</span><span>Game</span><span></span>
        </div>
        <BlurredPickPreview plays={blurredPlays} />
      </div>
    </>
  )
}

function LoginGate({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)

  async function handleCheck() {
    if (!email.trim() || !password.trim()) return

    setChecking(true)
    setError(null)

    try {
      const res = await fetch('/api/member-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const data = await res.json()

      if (data.valid) {
        localStorage.setItem('gb_email', data.email)
        localStorage.setItem('gb_plan', data.plan || 'weekly')
        onLogin(data.email, data.plan || 'weekly')
      } else {
        setError(data.error || 'Could not unlock picks.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <>
      <Head><title>Members Board — GooliuzBoozler</title></Head>
      <nav className="picks-nav">
        <Link href="/" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem', letterSpacing: '0.14em', color: '#F2EDE3' }}>
          GOOLIUZ<span style={{ color: '#C8180A' }}>BOOZLER</span>
        </Link>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/yesterday" className="nav-link neon-purple">Yesterday Results</Link>
          <Link href="/#pricing" className="nav-cta">
            Subscribe
          </Link>
        </div>
      </nav>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0A0A08' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.5rem', letterSpacing: '0.04em', marginBottom: '0.5rem', textAlign: 'center' }}>
            MEMBER <span style={{ color: '#C8180A' }}>ACCESS</span>
          </div>

          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.65rem', color: '#5A5448', textAlign: 'center', marginBottom: '2rem', lineHeight: 1.7, letterSpacing: '0.05em' }}>
            Enter your subscriber email and password.<br />
            First time here? Pick a password now.
          </p>

          <input
            style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', color: '#F2EDE3', fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', padding: '0.85rem 1rem', outline: 'none', marginBottom: '0.75rem', boxSizing: 'border-box' }}
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
          />

          <input
            style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', color: '#F2EDE3', fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', padding: '0.85rem 1rem', outline: 'none', marginBottom: '0.75rem', boxSizing: 'border-box' }}
            type="password"
            placeholder="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCheck()}
          />

          {error && (
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.65rem', color: '#EF4444', marginBottom: '0.75rem', lineHeight: 1.6 }}>
              {error}
            </div>
          )}

          <button
            style={{ width: '100%', background: checking ? '#333' : '#C8180A', border: 'none', color: '#F2EDE3', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.9rem', cursor: checking ? 'not-allowed' : 'pointer' }}
            onClick={handleCheck}
            disabled={checking || !email.trim() || !password.trim()}
          >
            {checking ? 'Checking...' : 'Access My Picks'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#3a3a3a', letterSpacing: '0.08em' }}>
            Not a member? <Link href="/#pricing" style={{ color: '#C8180A' }}>Subscribe from $9.99/week</Link>
          </div>
        </div>
      </div>
    </>
  )
}

export default function Picks() {
  const [status, setStatus] = useState('loading')
  const [plays, setPlays] = useState([])
  const [filter, setFilter] = useState('All')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [memberEmail, setMemberEmail] = useState(null)
  const [memberPlan, setMemberPlan] = useState('weekly')
  const [checkoutLoading, setCheckoutLoading] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [preferredModel, setPreferredModel] = useState('best')
  const [sortMode, setSortMode] = useState('probability')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    const storedEmail = localStorage.getItem('gb_email')

    if (sessionId) {
      // Just paid — verify session and store email
      fetch('/api/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.valid && data.email) {
            localStorage.setItem('gb_email', data.email)
            localStorage.setItem('gb_plan', data.plan || 'weekly')
            setMemberEmail(data.email)
            setMemberPlan(data.plan || 'weekly')
            setStatus('authorized')
            window.history.replaceState({}, '', '/picks')
          } else {
            setStatus('unauthorized')
          }
        })
        .catch(() => setStatus('unauthorized'))
    } else if (storedEmail) {
      // Returning member — verify email still active
      fetch(`/api/verify-session?email=${encodeURIComponent(storedEmail)}`)
        .then(r => r.json())
        .then(data => {
          if (data.valid) {
            setMemberEmail(storedEmail)
            setMemberPlan(data.plan || localStorage.getItem('gb_plan') || 'weekly')
            localStorage.setItem('gb_plan', data.plan || localStorage.getItem('gb_plan') || 'weekly')
            setStatus('authorized')
          } else {
            localStorage.removeItem('gb_email')
            localStorage.removeItem('gb_plan')
            setStatus('unauthorized')
          }
        })
        .catch(() => {
          // If check fails, let them in anyway if they have stored email
          setMemberEmail(storedEmail)
          setMemberPlan(localStorage.getItem('gb_plan') || 'weekly')
          setStatus('authorized')
        })
    } else {
      setStatus('unauthorized')
    }

    let cancelled = false
    const loadPicks = () => {
      fetch(`/api/picks?live=${Date.now()}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
          if (cancelled) return
          setPlays(data.plays || [])
          setLastUpdated(data.lastUpdated || null)
        })
        .catch(() => {})
    }

    loadPicks()
    const liveRefresh = window.setInterval(loadPicks, 60000)
    return () => {
      cancelled = true
      window.clearInterval(liveRefresh)
    }
  }, [])

  useEffect(() => {
    if (!planHasFullBoard(memberPlan) && filter === 'Thin') {
      setFilter('All')
    }
  }, [memberPlan, filter])

  const modelQualifiedPlays = preferredModel === 'best' ? plays : plays.filter(play => usablePreferredRead(play, preferredModel))
  const visiblePlays = planHasFullBoard(memberPlan) ? modelQualifiedPlays : modelQualifiedPlays.filter(play => isCorePlay(play, preferredModel))
  const tabs = planHasFullBoard(memberPlan) ? ['All', 'Likely', 'Playable', 'Thin'] : ['All', 'Likely', 'Playable']
  const sortedVisiblePlays = [...visiblePlays].sort((a, b) => {
    if (sortMode === 'startTime') {
      const timeDiff = parseGameStartMinutes(a['Game Time']) - parseGameStartMinutes(b['Game Time'])
      if (timeDiff !== 0) return timeDiff
    }
    return parseProbability(getPreferredModelRead(b, preferredModel).prob) - parseProbability(getPreferredModelRead(a, preferredModel).prob)
  })
  const filtered = filter === 'All' ? sortedVisiblePlays : sortedVisiblePlays.filter(p => filterByTrust(p, filter, preferredModel))
  const todayRecord = selectedModelRecord(plays, preferredModel)
  const todayRoi = formatRecordRoi(todayRecord)
  const counts = {
    Strong: visiblePlays.filter(p => getPlayTrust(p, preferredModel) === 'Strong').length,
    Playable: visiblePlays.filter(p => getPlayTrust(p, preferredModel) === 'Playable').length,
    Thin: visiblePlays.filter(p => getPlayTrust(p, preferredModel) === 'Thin').length,
  }
  const selectedModelLabel = MODEL_OPTIONS.find(option => option.value === preferredModel)?.label || 'Best Model'
  const recordLabel = preferredModel === 'best' ? "Today's Best Bet Record" : `Today's ${selectedModelLabel} Record`

  async function handleSubscribe(priceId) {
    setCheckoutLoading(priceId)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else throw new Error(data.error)
    } catch {
      alert('Something went wrong. Please try again.')
      setCheckoutLoading(null)
    }
  }

  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A08' }}>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: '#5A5448', letterSpacing: '0.2em' }}>LOADING...</div>
    </div>
  )

  if (status === 'unauthorized' && showLogin) {
    return <LoginGate onLogin={(email, plan) => { setMemberEmail(email); setMemberPlan(plan || 'weekly'); setStatus('authorized') }} />
  }

  if (status === 'unauthorized') return (
    <PublicPicksPreview
      plays={plays}
      lastUpdated={lastUpdated}
      loading={checkoutLoading}
      onSubscribe={handleSubscribe}
      onLoginClick={() => setShowLogin(true)}
    />
  )

  return (
    <>
      <Head>
        <title>Today's Board — GooliuzBoozler</title>
        <meta name="robots" content="noindex" />
      </Head>
      <nav className="picks-nav member">
        <Link href="/" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem', letterSpacing: '0.14em', color: '#F2EDE3' }}>
          GOOLIUZ<span style={{ color: '#C8180A' }}>BOOZLER</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/yesterday" className="nav-link neon-purple">Yesterday Results</Link>
          {memberPlan === 'season' && <Link href="/history" className="nav-link neon-gold">History</Link>}
          {memberEmail && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', letterSpacing: '0.08em' }}>{memberEmail}</span>}
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.62rem', letterSpacing: '0.15em', color: '#EAB308', border: '1px solid rgba(234,179,8,0.3)', padding: '0.3rem 0.7rem' }}>{PLAN_LABELS[memberPlan] || 'Weekly'}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.62rem', letterSpacing: '0.15em', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)', padding: '0.3rem 0.7rem' }}>● MEMBER</div>
          <button onClick={() => { localStorage.removeItem('gb_email'); localStorage.removeItem('gb_plan'); window.location.reload() }} style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.08em' }}>Sign out</button>
        </div>
      </nav>

      <div className="picks-shell">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C8180A', marginBottom: '0.5rem' }}>// Today's Board</div>
            <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '3rem', letterSpacing: '0.04em', lineHeight: 1 }}>Pitcher K Model</h1>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#22C55E', marginTop: '0.5rem' }}>
              {recordLabel}: {todayRecord.hits}-{todayRecord.misses} ({formatRecordWinPct(todayRecord)}){todayRoi ? ` · ${todayRoi}` : ''}
            </div>
            {lastUpdated && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: '0.4rem', letterSpacing: '0.1em' }}>Updated: {lastUpdated}</div>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              ['Likely/Strong', counts.Strong, '#22C55E'],
              ['Playable', counts.Playable, '#EAB308'],
              ...(planHasFullBoard(memberPlan) ? [['Thin', counts.Thin, '#F97316']] : []),
            ].map(([label, count, color]) => (
              <div key={label} style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.1em', padding: '0.35rem 0.75rem', background: 'rgba(242,237,227,0.04)', border: '1px solid rgba(242,237,227,0.08)', color }}>{count} {label}</div>
            ))}
          </div>
        </div>

        <div className="filter-tabs">
          {tabs.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.55rem 1.25rem', border: 'none', cursor: 'pointer', background: filter === f ? '#C8180A' : 'transparent', color: filter === f ? '#F2EDE3' : '#5A5448', transition: 'all 0.15s' }}>
              {f} {f === 'All' ? `(${visiblePlays.length})` : f === 'Likely' ? `(${counts.Strong})` : f === 'Playable' ? `(${counts.Playable})` : `(${counts.Thin})`}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', background: 'rgba(242,237,227,0.025)', border: '1px solid rgba(242,237,227,0.08)', padding: '0.85rem 1rem' }}>
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.56rem', color: '#5A5448', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Preferred Model View</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.72rem', color: '#BFB090', letterSpacing: '0.06em' }}>
              Showing {visiblePlays.length} {selectedModelLabel} play{visiblePlays.length === 1 ? '' : 's'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {MODEL_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { setPreferredModel(option.value); setFilter('All') }}
                  style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '0.62rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding: '0.5rem 0.75rem',
                    border: preferredModel === option.value ? '1px solid #EAB308' : '1px solid rgba(242,237,227,0.12)',
                    background: preferredModel === option.value ? 'rgba(234,179,8,0.12)' : 'rgba(10,10,10,0.7)',
                    color: preferredModel === option.value ? '#EAB308' : '#BFB090',
                    cursor: 'pointer',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderLeft: '1px solid rgba(242,237,227,0.1)', paddingLeft: '0.7rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.56rem', color: '#5A5448', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Sort</span>
              {SORT_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSortMode(option.value)}
                  style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '0.62rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding: '0.5rem 0.75rem',
                    border: sortMode === option.value ? '1px solid #22C55E' : '1px solid rgba(242,237,227,0.12)',
                    background: sortMode === option.value ? 'rgba(34,197,94,0.1)' : 'rgba(10,10,10,0.7)',
                    color: sortMode === option.value ? '#22C55E' : '#BFB090',
                    cursor: 'pointer',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pick-header-row">
          <span>Pitcher</span><span>Status</span><span>{preferredModel === 'best' ? 'Best Bet' : `${selectedModelLabel} Bet`}</span><span>Prob</span><span>K Edge</span><span>K Wizard Proj.</span><span>Live Ks</span><span>Game</span><span></span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: '#5A5448', letterSpacing: '0.15em' }}>
            NO PLAYS POSTED YET — CHECK BACK BEFORE FIRST PITCH
          </div>
        ) : (
          filtered.map((play, i) => <PickCard key={i} play={play} plan={memberPlan} preferredModel={preferredModel} />)
        )}

        <div style={{ marginTop: '2rem', fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: 'rgba(90,84,72,0.5)', lineHeight: 1.7, borderTop: '1px solid rgba(242,237,227,0.04)', paddingTop: '1.5rem' }}>
          For Yes bets, only accept the listed line or lower. For No bets, only accept the listed line or higher. Model projections are for informational purposes only. Bet responsibly and only where legal.
        </div>
      </div>
    </>
  )
}
