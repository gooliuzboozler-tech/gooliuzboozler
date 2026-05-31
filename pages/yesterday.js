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

function trustFromProbability(value) {
  const prob = parseProbability(value)
  if (prob >= 80) return 'Strong'
  if (prob >= 70) return 'Playable'
  if (prob >= 60) return 'Thin'
  return 'Pass'
}

function normalizeResult(value) {
  const raw = String(value || '').toLowerCase()
  if (['hit', 'win', 'won', 'cash', 'cashed', 'true', 'yes', 'w'].some(v => raw.includes(v))) return 'Hit'
  if (['miss', 'loss', 'lost', 'false', 'no', 'l'].some(v => raw.includes(v))) return 'Miss'
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

function ResultBadge({ result }) {
  const value = normalizeResult(result)
  if (!value) return <span className="result-badge pending">Pending</span>
  return <span className={`result-badge ${value === 'Hit' ? 'hit' : 'miss'}`}>{value === 'Hit' ? '✓ Hit' : '✕ Miss'}</span>
}

function ResultCard({ play }) {
  const teamLogo = teamLogoUrl(play['Pitcher Team'])
  const result = inferBetResult(play['Best Bet'], play['Actual Ks'], play.Result)
  const model2Result = inferBetResult(play['Model 2 Bet'], play['Actual Ks'])
  const model3Result = inferBetResult(play['Model 3 Bet'], play['Actual Ks'])
  const trust = trustFromProbability(play['Best Prob'])

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
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.75rem', color: result === 'Miss' ? '#EF4444' : '#22C55E' }}>{play['Best Bet']}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>Model 1</div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#F2EDE3' }}>{formatProbability(play['Best Prob'])}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>Prob</div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#EAB308' }}>{formatRoundedNumber(play['Actual Ks'])}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>Actual Ks</div>
        </div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.65rem', color: '#5A5448', textAlign: 'right' }}>{trust}</div>
      </div>

      <div className="result-detail-grid">
        <div>
          <span>Model 1 Edge</span>
          {formatEdge(play['Best Edge'])}
        </div>
        <div>
          <span>Model K</span>
          {formatRoundedNumber(play['Model K'])}
        </div>
        <div>
          <span>K Edge</span>
          {formatRoundedNumber(play['K Edge'])}
        </div>
        <div>
          <span>Opp K Rank</span>
          {formatRoundedNumber(play['Opp K Rank'])}
        </div>
      </div>

      {(play['Model 2 Bet'] || play['Model 3 Bet']) && (
        <div className="yesterday-model-grid">
          {play['Model 2 Bet'] && (
            <div>
              <span>Model 2</span>
              <strong>{play['Model 2 Bet']}</strong>
              <small>{formatProbability(play['Model 2 Prob'])} prob · {formatEdge(play['Model 2 Edge'])} edge</small>
              <ResultBadge result={model2Result} />
            </div>
          )}
          {play['Model 3 Bet'] && (
            <div>
              <span>Model 3</span>
              <strong>{play['Model 3 Bet']}</strong>
              <small>{formatProbability(play['Model 3 Prob'])} prob · {formatEdge(play['Model 3 Edge'])} edge</small>
              <ResultBadge result={model3Result} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Yesterday() {
  const [plays, setPlays] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/yesterday-picks')
      .then(r => r.json())
      .then(data => {
        setPlays(data.plays || [])
        setLastUpdated(data.lastUpdated || null)
      })
      .finally(() => setLoading(false))
  }, [])

  const hits = plays.filter(play => inferBetResult(play['Best Bet'], play['Actual Ks'], play.Result) === 'Hit').length
  const misses = plays.filter(play => inferBetResult(play['Best Bet'], play['Actual Ks'], play.Result) === 'Miss').length

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
          <Link href="/picks" className="nav-link neon-purple">Today&apos;s Picks</Link>
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
            <div className="result-summary hit">✓ {hits} Hit</div>
            <div className="result-summary miss">✕ {misses} Miss</div>
          </div>
        </div>

        <div className="pick-header-row">
          <span>Pitcher</span><span>Result</span><span>Bet</span><span>Prob</span><span>Actual</span><span>Tier</span>
        </div>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: '#5A5448', letterSpacing: '0.15em' }}>LOADING RESULTS...</div>
        ) : plays.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: '#5A5448', letterSpacing: '0.15em' }}>
            NO RESULTS POSTED YET
          </div>
        ) : (
          plays.map((play, i) => <ResultCard key={i} play={play} />)
        )}
      </div>
    </>
  )
}
