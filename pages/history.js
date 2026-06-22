import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

const MODEL_OPTIONS = [
  { value: 'best', label: 'Best Model' },
  { value: '8', label: 'Model 8' },
  { value: '12', label: 'Model 12' },
  { value: '2', label: 'Model 2' },
  { value: '6', label: 'Model 6' },
  { value: '4', label: 'Model 4' },
  { value: '5', label: 'Model 5' },
]

const MLB_TEAM_IDS = {
  ARI: 109, AZ: 109, ATL: 144, BAL: 110, BOS: 111, CHC: 112, CIN: 113,
  CLE: 114, COL: 115, CWS: 145, CHW: 145, DET: 116, HOU: 117, KC: 118,
  KCR: 118, LAA: 108, LAD: 119, MIA: 146, MIL: 158, MIN: 142, NYM: 121,
  NYY: 147, ATH: 133, OAK: 133, PHI: 143, PIT: 134, SD: 135, SDP: 135,
  SEA: 136, SF: 137, SFG: 137, STL: 138, TB: 139, TBR: 139, TEX: 140,
  TOR: 141, WSH: 120, WSN: 120,
}

function teamLogoUrl(team) {
  const teamId = MLB_TEAM_IDS[String(team || '').toUpperCase()]
  return teamId ? `https://www.mlbstatic.com/team-logos/${teamId}.svg` : ''
}

function firstValue(source, keys) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && String(source[key]).trim() !== '') return source[key]
  }
  return ''
}

function parseProbability(value) {
  const raw = String(value || '').replace('%', '').trim()
  const num = Number.parseFloat(raw)
  if (!Number.isFinite(num)) return 0
  return num <= 1 ? num * 100 : num
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
  if (Math.abs(rounded) < 1 && rounded !== 0) formatted = formatted.replace(/^(-?)0\./, '$1.')
  else formatted = formatted.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
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

function betSideColor(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (raw.startsWith('yes')) return '#22C55E'
  if (raw.startsWith('no')) return '#EF4444'
  return '#F2EDE3'
}

function probabilityColor(value) {
  const prob = parseProbability(value)
  if (prob >= 80) return '#22C55E'
  if (prob >= 70) return '#EAB308'
  if (prob >= 60) return '#F97316'
  return '#EF4444'
}

function oddsFromMarket(bet, lines) {
  const betMatch = String(bet || '').match(/\b(Yes|No)\s+(\d+)\+/i)
  if (!betMatch || !lines) return ''
  const side = betMatch[1].toLowerCase()
  const threshold = betMatch[2]
  const lineMatch = String(lines).match(new RegExp(`${threshold}\\+:\\s*Yes\\s*\\$?([0-9.]+)\\s*/\\s*No\\s*\\$?([0-9.]+)`, 'i'))
  if (!lineMatch) return ''
  return side === 'yes' ? lineMatch[1] : lineMatch[2]
}

function parseOdds(value, bet, lines) {
  const raw = String(value || '').trim() || oddsFromMarket(bet, lines)
  const num = Number.parseFloat(raw.replace(/[$,]/g, ''))
  return Number.isFinite(num) ? num : 0
}

function modelRead(play, modelNumber) {
  const bet = firstValue(play, [`Model ${modelNumber} Bet`, `Model ${modelNumber} Best Bet`])
  return {
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
    .filter(model => model.oddsNumber >= 1.10)
    .sort((a, b) => b.probabilityNumber - a.probabilityNumber)[0] || models
    .sort((a, b) => b.probabilityNumber - a.probabilityNumber)[0]

  return best || {
    label: play['Best Model'] || 'Best Model',
    bet: play['Best Bet'] || '',
    prob: play['Best Prob'] || '',
    edge: play['Best Edge'] || '',
    odds: play['Best Odds'] || '',
    modelK: play['Model K'] || '',
    kEdge: play['K Edge'] || '',
  }
}

function preferredRead(play, preferredModel = 'best') {
  return preferredModel === 'best' ? bestReadForPlay(play) : modelRead(play, Number.parseInt(preferredModel, 10))
}

function inferBetResult(bet, actualKs, explicitResult) {
  const normalized = normalizeResult(explicitResult)
  if (normalized) return normalized
  const actual = Number.parseFloat(String(actualKs || '').replace(/[^0-9.-]/g, ''))
  const match = String(bet || '').match(/\b(Yes|No)\s+(\d+)\+/i)
  if (!Number.isFinite(actual) || !match) return ''
  const side = match[1].toLowerCase()
  const threshold = Number.parseInt(match[2], 10)
  return side === 'yes' ? (actual >= threshold ? 'Hit' : 'Miss') : (actual < threshold ? 'Hit' : 'Miss')
}

function selectedModelRecord(plays, preferredModel = 'best') {
  return (plays || []).reduce((record, play) => {
    const read = preferredRead(play, preferredModel)
    const result = inferBetResult(read.bet, play['Actual Ks'], preferredModel === 'best' ? play.Result : '')
    if (result === 'Hit') record.hits += 1
    if (result === 'Miss') record.misses += 1
    return record
  }, { hits: 0, misses: 0 })
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function buildCalendarDays(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  const first = new Date(year, month - 1, 1)
  const total = new Date(year, month, 0).getDate()
  const days = Array.from({ length: first.getDay() }, () => '')
  for (let day = 1; day <= total; day++) days.push(`${monthKey}-${String(day).padStart(2, '0')}`)
  return days
}

function calendarResultClass(record) {
  const hits = Number(record?.hits || 0)
  const misses = Number(record?.misses || 0)
  const decisions = hits + misses
  if (!decisions) return ''
  if (hits > misses) return 'above-500'
  if (hits === misses) return 'at-500'
  return 'below-500'
}

function HistoryCalendar({ dates, dateRecords, selectedDate, onSelect }) {
  const available = useMemo(() => new Set(dates), [dates])
  const monthKeys = useMemo(() => [...new Set(dates.map(date => date.slice(0, 7)))].sort(), [dates])
  const selectedMonth = selectedDate ? selectedDate.slice(0, 7) : monthKeys[monthKeys.length - 1]
  const [monthKey, setMonthKey] = useState(selectedMonth || '')

  useEffect(() => {
    if (selectedMonth) setMonthKey(selectedMonth)
  }, [selectedMonth])

  if (!monthKey) return null

  const monthIndex = monthKeys.indexOf(monthKey)
  const days = buildCalendarDays(monthKey)

  return (
    <div style={{ border: '1px solid rgba(242,237,227,0.1)', background: 'rgba(242,237,227,0.025)', padding: '0.85rem', width: 'min(100%, 300px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
        <button type="button" disabled={monthIndex <= 0} onClick={() => setMonthKey(monthKeys[monthIndex - 1])} className="history-month-button">‹</button>
        <div style={{ fontFamily: 'DM Mono, monospace', color: '#EAB308', fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{monthLabel(monthKey)}</div>
        <button type="button" disabled={monthIndex >= monthKeys.length - 1} onClick={() => setMonthKey(monthKeys[monthIndex + 1])} className="history-month-button">›</button>
      </div>
      <div className="history-calendar-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => <span key={`${day}-${i}`}>{day}</span>)}
        {days.map((date, i) => {
          const enabled = available.has(date)
          const day = date ? Number(date.slice(-2)) : ''
          const resultClass = enabled ? calendarResultClass(dateRecords?.[date]) : ''
          return (
            <button
              key={`${date || 'blank'}-${i}`}
              type="button"
              disabled={!enabled}
              onClick={() => enabled && onSelect(date)}
              className={[resultClass, date === selectedDate ? 'selected' : ''].filter(Boolean).join(' ')}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ResultBadge({ result }) {
  const value = normalizeResult(result)
  if (!value) return <span className="result-badge pending">Pending</span>
  return <span className={`result-badge ${value === 'Hit' ? 'hit' : 'miss'}`}>{value === 'Hit' ? '✓ Hit' : '✕ Miss'}</span>
}

function HistoryCard({ play, preferredModel }) {
  const read = preferredRead(play, preferredModel)
  const result = inferBetResult(read.bet, play['Actual Ks'], preferredModel === 'best' ? play.Result : '')
  const teamLogo = teamLogoUrl(play['Pitcher Team'])

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
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.75rem', color: betSideColor(read.bet) }}>{read.bet || '-'}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>{read.label}</div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: probabilityColor(read.prob) }}>{formatProbability(read.prob)}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>Prob</div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#22C55E' }}>{formatEdge(read.kEdge || play['K Edge'])}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>K Edge</div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#EAB308' }}>{formatRoundedNumber(read.modelK || play['Model K'])}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>K Wizard Proj.</div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#EAB308' }}>{formatRoundedNumber(play['Actual Ks'])}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>Actual Ks</div>
        </div>
      </div>
    </div>
  )
}

export default function History() {
  const [memberEmail, setMemberEmail] = useState('')
  const [memberPlan, setMemberPlan] = useState('')
  const [availableDates, setAvailableDates] = useState([])
  const [dateRecords, setDateRecords] = useState({})
  const [selectedDate, setSelectedDate] = useState('')
  const [plays, setPlays] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [preferredModel, setPreferredModel] = useState('best')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const email = localStorage.getItem('gb_email') || ''
    const plan = localStorage.getItem('gb_plan') || ''
    setMemberEmail(email)
    setMemberPlan(plan)
    if (!email || plan !== 'season') {
      setLoading(false)
      return
    }
    loadHistory(email)
  }, [])

  async function loadHistory(email, date = '') {
    setLoading(true)
    setError('')
    try {
      const url = `/api/history-picks?email=${encodeURIComponent(email)}${date ? `&date=${encodeURIComponent(date)}` : ''}`
      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load history.')
      setAvailableDates(data.availableDates || [])
      setDateRecords(data.dateRecords || {})
      setSelectedDate(data.selectedDate || date || '')
      setPlays(data.plays || [])
      setLastUpdated(data.lastUpdated || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function selectDate(date) {
    setSelectedDate(date)
    loadHistory(memberEmail, date)
  }

  const visiblePlays = preferredModel === 'best' ? plays : plays.filter(play => usableModelRead(preferredRead(play, preferredModel)))
  const sortedPlays = [...visiblePlays].sort((a, b) => parseProbability(preferredRead(b, preferredModel).prob) - parseProbability(preferredRead(a, preferredModel).prob))
  const record = selectedModelRecord(plays, preferredModel)
  const selectedModelLabel = MODEL_OPTIONS.find(option => option.value === preferredModel)?.label || 'Best Model'
  const locked = !memberEmail || memberPlan !== 'season'

  return (
    <>
      <Head>
        <title>Season History — GooliuzBoozler</title>
        <meta name="robots" content="noindex" />
      </Head>
      <nav className="picks-nav member">
        <Link href="/" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem', letterSpacing: '0.14em', color: '#F2EDE3' }}>
          GOOLIUZ<span style={{ color: '#C8180A' }}>BOOZLER</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/picks" className="nav-link neon-green">Today&apos;s Picks</Link>
          <Link href="/yesterday" className="nav-link neon-purple">Yesterday Results</Link>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.62rem', letterSpacing: '0.15em', color: '#EAB308', border: '1px solid rgba(234,179,8,0.3)', padding: '0.3rem 0.7rem' }}>Season Pass</div>
        </div>
      </nav>

      <div className="picks-shell">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1.25rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#EAB308', marginBottom: '0.5rem' }}>// Season Archive</div>
            <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '3rem', letterSpacing: '0.04em', lineHeight: 1 }}>All-Time Access</h1>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#22C55E', marginTop: '0.5rem' }}>
              {selectedDate || 'No date selected'} · {record.hits}-{record.misses}
            </div>
            {lastUpdated && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: '0.4rem', letterSpacing: '0.1em' }}>Archived: {lastUpdated}</div>}
          </div>
          {!locked && <HistoryCalendar dates={availableDates} dateRecords={dateRecords} selectedDate={selectedDate} onSelect={selectDate} />}
        </div>

        {locked ? (
          <div style={{ border: '1px solid rgba(234,179,8,0.24)', background: 'rgba(234,179,8,0.06)', padding: '1.25rem', fontFamily: 'DM Mono, monospace', color: '#BFB090', lineHeight: 1.7 }}>
            Season Pass members unlock the date archive. <Link href="/picks" style={{ color: '#EAB308' }}>Log in from Today&apos;s Picks</Link>.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', background: 'rgba(242,237,227,0.025)', border: '1px solid rgba(242,237,227,0.08)', padding: '0.85rem 1rem' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5A5448' }}>
                {preferredModel === 'best' ? 'Best Bet' : selectedModelLabel}: {record.hits}-{record.misses}
              </div>
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
              <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: '#5A5448', letterSpacing: '0.15em' }}>LOADING HISTORY...</div>
            ) : error ? (
              <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: '#EF4444', letterSpacing: '0.12em' }}>{error}</div>
            ) : sortedPlays.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: '#5A5448', letterSpacing: '0.15em' }}>NO ARCHIVED PICKS FOR THIS DATE</div>
            ) : (
              sortedPlays.map((play, i) => <HistoryCard key={`${play.Pitcher}-${i}`} play={play} preferredModel={preferredModel} />)
            )}
          </>
        )}
      </div>
    </>
  )
}
