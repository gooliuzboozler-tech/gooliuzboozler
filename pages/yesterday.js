import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'

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

function oddsFromMarket(bet, lines) {
  const betMatch = String(bet || '').match(/\b(Yes|No)\s+(\d+)\+/i)
  if (!betMatch || !lines) return ''

  const side = betMatch[1].toLowerCase()
  const threshold = betMatch[2]
  const lineRegex = new RegExp(`${threshold}\\+:\\s*Yes\\s*\\$?([0-9.]+)\\s*/\\s*No\\s*\\$?([0-9.]+)`, 'i')
  const lineMatch = String(lines).match(lineRegex)
  if (!lineMatch) return ''

  return side === 'yes' ? lineMatch[1] : lineMatch[2]
}

function parseOdds(value, bet, lines) {
  const explicit = String(value || '').trim()
  const raw = explicit || oddsFromMarket(bet, lines)
  const num = Number.parseFloat(String(raw || '').replace(/[$,]/g, ''))
  return Number.isFinite(num) ? num : 0
}

function firstValue(source, keys) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && String(source[key]).trim() !== '') {
      return source[key]
    }
  }
  return ''
}

function modelRead(play, modelNumber) {
  const bet = firstValue(play, [`Model ${modelNumber} Bet`, `Model ${modelNumber} Best Bet`])
  return {
    modelNumber,
    label: `Model ${modelNumber}`,
    bet,
    prob: firstValue(play, [`Model ${modelNumber} Prob`, `Model ${modelNumber} Best Prob`]),
    edge: firstValue(play, [`Model ${modelNumber} Edge`, `Model ${modelNumber} Best Edge`, `Model ${modelNumber} K Edge`]),
    odds: firstValue(play, [`Model ${modelNumber} Odds`, `Model ${modelNumber} Best Odds`]),
    modelK: firstValue(play, [`Model ${modelNumber} K`, `Model ${modelNumber} Model K`, 'Model K']),
    kEdge: firstValue(play, [`Model ${modelNumber} K Edge`, `Model ${modelNumber} Best K Edge`, 'K Edge']),
    probabilityNumber: parseProbability(firstValue(play, [`Model ${modelNumber} Prob`, `Model ${modelNumber} Best Prob`])),
    oddsNumber: parseOdds(firstValue(play, [`Model ${modelNumber} Odds`, `Model ${modelNumber} Best Odds`]), bet, play['Kalshi Lines']),
  }
}

function usableModelRead(model) {
  const bet = String(model.bet || '').trim().toLowerCase()
  return bet && bet !== 'pass' && model.probabilityNumber > 0
}

function bestReadForPlay(play) {
  const models = [8, 12, 2, 6, 4, 5].map(modelNumber => modelRead(play, modelNumber)).filter(usableModelRead)
  const best = models
    .filter(model => model.oddsNumber > 1.16)
    .sort((a, b) => b.probabilityNumber - a.probabilityNumber)[0] || models
    .sort((a, b) => b.probabilityNumber - a.probabilityNumber)[0]

  if (!best) {
    return {
      label: play['Best Model'] || 'Best Model',
      bet: play['Best Bet'],
      prob: play['Best Prob'],
      edge: play['Best Edge'],
    }
  }

  return best
}

function getPreferredModelRead(play, preferredModel = 'best') {
  if (preferredModel === 'best') {
    const bestRead = bestReadForPlay(play)
    return {
      label: bestRead.label || play['Best Model'] || 'Best Model',
      bet: bestRead.bet || play['Best Bet'] || '',
      prob: bestRead.prob || play['Best Prob'] || '',
      edge: bestRead.edge || play['Best Edge'] || '',
      odds: bestRead.odds || play['Best Odds'] || '',
      modelK: bestRead.modelK || play['Model K'] || '',
      kEdge: bestRead.kEdge || play['K Edge'] || '',
    }
  }

  const modelNumber = Number.parseInt(preferredModel, 10)
  if (!Number.isFinite(modelNumber)) return getPreferredModelRead(play, 'best')
  return modelRead(play, modelNumber)
}

function usablePreferredRead(play, preferredModel = 'best') {
  const read = getPreferredModelRead(play, preferredModel)
  const bet = String(read.bet || '').trim().toLowerCase()
  return bet && bet !== 'pass' && parseProbability(read.prob) > 0
}

function formatProbability(value) {
  const prob = parseProbability(value)
  return prob ? `${prob.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}%` : '-'
}

function formatRoundedNumber(value, { signed = false } = {}) {
  const raw = String(value ?? '').trim()
  if (!raw || raw === '-' || raw === '—') return '-'
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

function formatEdge(value) {
  return formatRoundedNumber(value, { signed: true })
}

function normalizeResult(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw || /^(no\s*pick|pass|void|push|pending|n\/a|na)$/i.test(raw)) return ''
  if (/^(hit|win|won|cash|cashed|true|w)$/i.test(raw)) return 'Hit'
  if (/^(miss|loss|lost|lose|false|l)$/i.test(raw)) return 'Miss'
  return ''
}

function inferBetResult(bet, actualKs, explicitResult) {
  const normalized = normalizeResult(explicitResult)
  if (normalized) return normalized

  const actual = Number.parseFloat(String(actualKs || '').replace(/[^0-9.-]/g, ''))
  const match = String(bet || '').match(/\b(Yes|No)\s+(\d+)\+/i)
  if (!Number.isFinite(actual) || !match) return ''

  const side = match[1].toLowerCase()
  const threshold = Number.parseInt(match[2], 10)
  const hit = side === 'yes' ? actual >= threshold : actual < threshold
  return hit ? 'Hit' : 'Miss'
}

function addRecordResult(record, result, read, play) {
  if (result !== 'Hit' && result !== 'Miss') return

  const odds = parseOdds(read?.odds, read?.bet, play?.['Kalshi Lines'])
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

function selectedModelRecord(plays, preferredModel = 'best') {
  return (plays || []).reduce((record, play) => {
    const read = getPreferredModelRead(play, preferredModel)
    const result = inferBetResult(read.bet, play['Actual Ks'], preferredModel === 'best' ? play.Result : '')
    addRecordResult(record, result, read, play)
    return record
  }, { hits: 0, misses: 0, stake: 0, profit: 0 })
}

function ResultBadge({ result }) {
  const value = normalizeResult(result)
  if (!value) return <span className="result-badge pending">Pending</span>
  return <span className={`result-badge ${value === 'Hit' ? 'hit' : 'miss'}`}>{value === 'Hit' ? '✓ Hit' : '✕ Miss'}</span>
}

function ResultCard({ play, preferredModel = 'best' }) {
  const teamLogo = teamLogoUrl(play['Pitcher Team'])
  const bestRead = getPreferredModelRead(play, preferredModel)
  const result = inferBetResult(bestRead.bet, play['Actual Ks'], preferredModel === 'best' ? play.Result : '')
  const bestModelLabel = bestRead.label
  const modelOutcomes = [8, 12, 2, 6, 4, 5]
    .map(modelNumber => ({
      modelNumber,
      selected: preferredModel === String(modelNumber),
      ...modelRead(play, modelNumber),
      result: inferBetResult(modelRead(play, modelNumber).bet, play['Actual Ks']),
    }))
    .filter(model => model.bet && model.bet !== 'Pass')
  return (
    <div className={`pick-card result-card ${normalizeResult(result).toLowerCase() || 'pending'}`}>
      <div className="pick-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', color: '#F2EDE3', letterSpacing: '0.04em' }}>
            {teamLogo && <img src={teamLogo} alt={`${play['Pitcher Team']} logo`} style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />}
            <span>{play.Pitcher}</span>
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>vs {play.Opponent} {play['Game Time'] ? `· ${play['Game Time']}` : ''}</div>
        </div>
        <div><ResultBadge result={result} /></div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.75rem', color: result === 'Miss' ? '#EF4444' : '#22C55E' }}>{bestRead.bet}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>{bestModelLabel}</div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#F2EDE3' }}>{formatProbability(bestRead.prob)}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>Prob</div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#22C55E' }}>{formatEdge(bestRead.kEdge || play['K Edge'])}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>K Edge</div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#EAB308' }}>{formatRoundedNumber(bestRead.modelK || play['Model K'])}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>K Wizard Proj.</div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#EAB308' }}>{formatRoundedNumber(play['Actual Ks'])}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>Actual Ks</div>
        </div>
      </div>

      <div className="result-detail-grid">
        <div>
          <span>{bestModelLabel} Edge</span>
          {formatEdge(bestRead.edge)}
        </div>
        <div>
          <span>Model K</span>
          {formatRoundedNumber(bestRead.modelK || play['Model K'])}
        </div>
        <div>
          <span>K Edge</span>
          {formatRoundedNumber(bestRead.kEdge || play['K Edge'])}
        </div>
        <div>
          <span>Opp K Rank</span>
          {formatRoundedNumber(play['Opp K Rank'])}
        </div>
      </div>

      {modelOutcomes.length > 0 && (
        <div className="yesterday-model-grid">
          {modelOutcomes.map(model => (
            <div key={model.modelNumber} style={model.selected ? { borderColor: 'rgba(234,179,8,0.45)', background: 'rgba(234,179,8,0.08)' } : undefined}>
              <span>Model {model.modelNumber}</span>
              <strong>{model.bet}</strong>
              <small>{formatProbability(model.prob)} prob · {formatEdge(model.edge)} edge</small>
              <ResultBadge result={model.result} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Yesterday() {
  const [plays, setPlays] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loading, setLoading] = useState(true)
  const [preferredModel, setPreferredModel] = useState('best')

  useEffect(() => {
    fetch('/api/yesterday-picks')
      .then(r => r.json())
      .then(data => {
        setPlays(data.plays || [])
        setLastUpdated(data.lastUpdated || null)
      })
      .finally(() => setLoading(false))
  }, [])

  const modelQualifiedPlays = preferredModel === 'best' ? plays : plays.filter(play => usablePreferredRead(play, preferredModel))
  const sortedVisiblePlays = [...modelQualifiedPlays].sort((a, b) => parseProbability(getPreferredModelRead(b, preferredModel).prob) - parseProbability(getPreferredModelRead(a, preferredModel).prob))
  const yesterdayRecord = selectedModelRecord(plays, preferredModel)
  const yesterdayRoi = formatRecordRoi(yesterdayRecord)
  const selectedModelLabel = MODEL_OPTIONS.find(option => option.value === preferredModel)?.label || 'Best Model'
  const recordLabel = preferredModel === 'best' ? "Yesterday's Best Bet Record" : `Yesterday's ${selectedModelLabel} Record`

  return (
    <>
      <Head>
        <title>Yesterday&apos;s Picks — GooliuzBoozler</title>
        <meta name="description" content="Public results for yesterday's GooliuzBoozler MLB strikeout picks." />
      </Head>
      <nav className="picks-nav">
        <Link href="/" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem', letterSpacing: '0.14em', color: '#F2EDE3' }}>
          GOOLIUZ<span style={{ color: '#C8180A' }}>BOOZLER</span>
        </Link>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/picks" className="nav-link neon-green">Today&apos;s Picks</Link>
          <Link href="/#pricing" className="nav-cta">Get Access</Link>
        </div>
      </nav>

      <div className="picks-shell">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#EAB308', marginBottom: '0.5rem' }}>// Public Results</div>
            <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '3rem', letterSpacing: '0.04em', lineHeight: 1 }}>Yesterday&apos;s Picks</h1>
            {lastUpdated && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: '0.4rem', letterSpacing: '0.1em' }}>Updated: {lastUpdated}</div>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div className="result-summary hit">✓ {yesterdayRecord.hits} Hit</div>
            <div className="result-summary miss">✕ {yesterdayRecord.misses} Miss</div>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5A5448', marginBottom: '0.55rem' }}>{recordLabel}: {yesterdayRecord.hits}-{yesterdayRecord.misses}{yesterdayRoi ? ` · ${yesterdayRoi}` : ''}</div>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            {MODEL_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPreferredModel(option.value)}
                style={{
                  border: preferredModel === option.value ? '1px solid #EAB308' : '1px solid rgba(242,237,227,0.12)',
                  background: preferredModel === option.value ? 'rgba(234,179,8,0.12)' : 'rgba(10,10,10,0.7)',
                  color: preferredModel === option.value ? '#EAB308' : '#BFB090',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '0.66rem',
                  letterSpacing: '0.08em',
                  padding: '0.5rem 0.7rem',
                  cursor: 'pointer',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pick-header-row">
          <span>Pitcher</span><span>Result</span><span>{preferredModel === 'best' ? 'Bet' : `${selectedModelLabel} Bet`}</span><span>Prob</span><span>K Edge</span><span>K Wizard Proj.</span><span>Actual</span>
        </div>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: '#5A5448', letterSpacing: '0.15em' }}>LOADING RESULTS...</div>
        ) : sortedVisiblePlays.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: '#5A5448', letterSpacing: '0.15em' }}>
            NO RESULTS POSTED YET
          </div>
        ) : (
          sortedVisiblePlays.map((play, i) => <ResultCard key={i} play={play} preferredModel={preferredModel} />)
        )}
      </div>
    </>
  )
}
