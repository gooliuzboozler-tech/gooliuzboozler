import Head from 'next/head'
import { useEffect, useState } from 'react'

const PRICES = {
  weekly:  { id: 'price_1TYwNoIzVbZI7suaeiqXo9Ws', amount: '$9.99', period: 'per week — billed weekly' },
  monthly: { id: 'price_1TYwOlIzVbZI7suaEGEbXxia', amount: '$24.99', period: 'per month — billed monthly' },
  season:  { id: 'price_1TYwPfIzVbZI7suaxHy2ScZ3', amount: '$149', period: 'full 2026 season — one time' },
}

const MLB_TEAM_IDS = {
  ARI: 109, AZ: 109, ATL: 144, BAL: 110, BOS: 111, CHC: 112, CIN: 113,
  CLE: 114, COL: 115, CWS: 145, CHW: 145, DET: 116, HOU: 117, KC: 118,
  KCR: 118, LAA: 108, LAD: 119, MIA: 146, MIL: 158, MIN: 142, NYM: 121,
  NYY: 147, ATH: 133, OAK: 133, PHI: 143, PIT: 134, SD: 135, SDP: 135,
  SEA: 136, SF: 137, SFG: 137, STL: 138, TB: 139, TBR: 139, TEX: 140,
  TOR: 141, WSH: 120, WSN: 120,
}

const BACKTEST_STAT_SETS = [
  {
    key: 'best',
    title: 'Best Bets',
    subtitle: 'Highest probability pick per pitcher with payout above $1.16',
    stats: [
      ['394-125', 'Record', 'g'],
      ['75.92%', 'Win Rate', 'g'],
      ['82.57%', 'ROI', ''],
      ['519', 'Tracked Plays', ''],
    ],
    bars: [
      ['Avg Probability', '72.01%', '72.01%'],
      ['Avg Edge', '+16.64', '83%'],
      ['Avg K Edge', '+1.33', '66.5%'],
    ],
  },
  {
    key: 'model8',
    title: 'Model 8',
    subtitle: 'Model 2 cushion filter with top-100 career strikeout Yes tilt',
    stats: [
      ['304-33', 'Record', 'g'],
      ['90.21%', 'Win Rate', 'g'],
      ['TBD', 'ROI', ''],
      ['337', 'Tracked Plays', ''],
    ],
    bars: [
      ['Avg Probability', '71.26%', '71.26%'],
      ['Avg Edge', '+15.97', '79.85%'],
      ['Avg K Edge', '+1.31', '65.5%'],
    ],
  },
  {
    key: 'model2',
    title: 'Model 2',
    subtitle: 'Alternate line read used for monthly and season-pass boards',
    stats: [
      ['354-97', 'Record', 'g'],
      ['78.49%', 'Win Rate', 'g'],
      ['82.01%', 'ROI', ''],
      ['451', 'Tracked Plays', ''],
    ],
    bars: [
      ['Avg Probability', '70.89%', '70.89%'],
      ['Avg Edge', '+15.36', '76.8%'],
      ['Avg K Edge', '+1.21', '60.5%'],
    ],
  },
  {
    key: 'model6',
    title: 'Model 6',
    subtitle: 'Newest model angle for cross-checking the best available line',
    stats: [
      ['TBD', 'Record', ''],
      ['TBD', 'Win Rate', ''],
      ['TBD', 'ROI', ''],
      ['TBD', 'Tracked Plays', ''],
    ],
    bars: [
      ['Avg Probability', 'TBD', '0%'],
      ['Avg Edge', 'TBD', '0%'],
      ['Avg K Edge', 'TBD', '0%'],
    ],
  },
  {
    key: 'model4',
    title: 'Model 4',
    subtitle: 'High-confidence filter focused on 90%+ probability spots',
    stats: [
      ['120-10', 'Record', 'g'],
      ['92.31%', 'Win Rate', 'g'],
      ['78.02%', 'ROI', ''],
      ['130', 'Tracked Plays', ''],
    ],
    bars: [
      ['Avg Probability', '66.07%', '66.07%'],
      ['Avg Edge', '+9.43', '47.15%'],
      ['Avg K Edge', '+1.66', '83%'],
    ],
  },
  {
    key: 'model5',
    title: 'Model 5',
    subtitle: 'Ensemble read built from agreement across model inputs',
    stats: [
      ['117-13', 'Record', 'g'],
      ['90.00%', 'Win Rate', 'g'],
      ['80.08%', 'ROI', ''],
      ['130', 'Tracked Plays', ''],
    ],
    bars: [
      ['Avg Probability', '69.27%', '69.27%'],
      ['Avg Edge', '+13.17', '65.85%'],
      ['Avg K Edge', '+1.69', '84.5%'],
    ],
  },
]

const MODEL_BACKTEST_FALLBACKS = {
  8: { record: '304-33', winRate: '0.9021', roi: '', plays: '337' },
  2: { record: '394-132', winRate: '0.749', roi: '0.338', plays: '526' },
  6: { record: '634-96', winRate: '0.8685', roi: '0.737', plays: '730' },
  4: { record: '185-32', winRate: '0.8525', roi: '0.3604', plays: '217' },
  5: { record: '160-17', winRate: '0.904', roi: '0.4552', plays: '177' },
}

function backtestBarClass(label) {
  if (label === 'Avg Edge') return ' purple'
  if (label === 'Avg K Edge') return ' red'
  return ''
}

function teamLogoUrl(team) {
  const teamId = MLB_TEAM_IDS[String(team || '').toUpperCase()]
  return teamId ? `https://www.mlbstatic.com/team-logos/${teamId}.svg` : ''
}

function PriceCard({ tier, price, featured, features, loading, onSubscribe }) {
  return (
    <div className={`price-card${featured ? ' featured' : ''}`}>
      <div className="price-tier">{tier}</div>
      <div className="price-amt"><sup>$</sup>{price.amount.replace('$','')}</div>
      <div className="price-period">{price.period}</div>
      <ul className="price-features">
        {features.map((f, i) => (
          <li key={i} className={f.yes ? 'y' : 'n'}>{f.text}</li>
        ))}
      </ul>
      <button
        className={`btn-subscribe${featured ? ' solid' : ''}`}
        onClick={() => onSubscribe(price.id)}
        disabled={loading === price.id}
      >
        {loading === price.id ? 'Redirecting...' : `Get ${tier} Access`}
      </button>
    </div>
  )
}

function parseProbability(value) {
  const raw = String(value || '').replace('%', '').trim()
  const num = Number.parseFloat(raw)
  if (!Number.isFinite(num)) return null
  return num <= 1 ? num * 100 : num
}

function parseNumber(value) {
  const num = Number.parseFloat(String(value ?? '').replace(/[%,$]/g, '').replace(/,/g, '').trim())
  return Number.isFinite(num) ? num : null
}

function formatPercentLike(value) {
  const num = parseNumber(value)
  if (num === null) return ''
  const pct = num <= 1 ? num * 100 : num
  return `${pct.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}%`
}

function backtestValue(value, fallback) {
  const raw = String(value ?? '').trim()
  if (!raw || raw.toLowerCase() === 'tbd') return fallback || ''
  return raw
}

function getModelBacktestsFromPlays(plays) {
  const source = (plays || []).find(play => play['Model 8 Backtest Record'] || play['Model 6 Backtest Record'] || play['Model 5 Backtest Record']) || {}
  const out = {}
  ;[8, 2, 6, 4, 5].forEach(modelNumber => {
    const fallback = MODEL_BACKTEST_FALLBACKS[modelNumber] || {}
    const record = backtestValue(source[`Model ${modelNumber} Backtest Record`], fallback.record)
    const winRate = formatPercentLike(backtestValue(source[`Model ${modelNumber} Backtest Win Rate`], fallback.winRate))
    const roi = formatPercentLike(backtestValue(source[`Model ${modelNumber} Backtest ROI`], fallback.roi))
    const plays = backtestValue(source[`Model ${modelNumber} Backtest Plays`], fallback.plays)
    if (record || winRate || roi || plays) {
      out[`model${modelNumber}`] = { record, winRate, roi, plays }
    }
  })
  return out
}

function buildBacktestStatSets(plays) {
  const modelBacktests = getModelBacktestsFromPlays(plays)
  if (!Object.keys(modelBacktests).length) return BACKTEST_STAT_SETS
  return BACKTEST_STAT_SETS.map(set => {
    const modelStats = modelBacktests[set.key]
    if (!modelStats) return set
    return {
      ...set,
      stats: [
        [modelStats.record || 'TBD', 'Record', modelStats.record ? 'g' : ''],
        [modelStats.winRate || 'TBD', 'Win Rate', modelStats.winRate ? 'g' : ''],
        [modelStats.roi || 'TBD', 'ROI', ''],
        [String(modelStats.plays || 'TBD'), 'Tracked Plays', ''],
      ],
    }
  })
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
  if (prob === null) return '-'
  return `${prob.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}%`
}

function formatEdge(value) {
  return formatRoundedNumber(value, { signed: true })
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

  const odds = Number.parseFloat(side === 'yes' ? lineMatch[1] : lineMatch[2])
  return Number.isFinite(odds) && odds > 0 ? `$${odds.toFixed(2).replace(/\.00$/, '')}` : ''
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
  if (prob === null) return 'Top Pick'
  if (prob >= 80) return 'Strong'
  if (prob >= 70) return 'Playable'
  if (prob >= 60) return 'Thin'
  return 'Pass'
}

function probabilityColor(value) {
  const trust = trustFromProbability(value)
  if (trust === 'Strong') return '#22C55E'
  if (trust === 'Playable') return '#EAB308'
  if (trust === 'Thin') return '#F97316'
  if (trust === 'Pass') return '#EF4444'
  return '#F2EDE3'
}

function betSideColor(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (raw.startsWith('yes')) return '#22C55E'
  if (raw.startsWith('no')) return '#EF4444'
  return '#F2EDE3'
}

function FreePickCard({ pick, lastUpdated }) {
  if (!pick) {
    return (
      <div className="free-pick-card">
        <div className="free-pick-kicker">// Public Free Pick</div>
        <h3>Today&apos;s free pick posts after the board is uploaded.</h3>
        <p>Check back before first pitch, or get member access for the full daily board.</p>
        <a href="#pricing" className="free-pick-link">Get Full Access</a>
      </div>
    )
  }

  const teamLogo = teamLogoUrl(pick['Pitcher Team'])
  const odds = formatOdds(pick['Best Odds'], pick['Best Bet'], pick['Kalshi Lines'])

  return (
    <div className="free-pick-card">
      <div className="free-pick-kicker">// Public Free Pick</div>
      <div className="free-pick-topline">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {teamLogo && <img src={teamLogo} alt={`${pick['Pitcher Team']} logo`} style={{ width: 42, height: 42, objectFit: 'contain', flexShrink: 0 }} />}
            <h3 className="free-pick-gold-name">{pick.Pitcher}</h3>
          </div>
          <p>vs {pick.Opponent}{pick['Game Time'] ? ` - ${pick['Game Time']}` : ''}</p>
        </div>
        <div className="free-pick-prob" style={{ color: probabilityColor(pick['Best Prob']) }}>{formatProbability(pick['Best Prob'])}</div>
      </div>
      <div className="free-pick-bet">
        <span style={{ color: betSideColor(pick['Best Bet']) }}>{pick['Best Bet']}</span>{pick['Best Model'] ? <span style={{ color: '#BFB090' }}> · {pick['Best Model']}</span> : ''}{odds ? <span style={{ color: '#EAB308' }}> · {odds} odds</span> : ''}
      </div>
      <div className="free-pick-grid">
        <div><span>Trust</span>{trustFromProbability(pick['Best Prob'])}</div>
        <div><span>Odds</span>{odds || '-'}</div>
        <div><span>K Edge</span>{formatEdge(pick['K Edge'])}</div>
        <div><span>Model K</span>{formatRoundedNumber(pick['Model K'])}</div>
      </div>
      {lastUpdated && <div className="free-pick-updated">Updated: {lastUpdated}</div>}
      <a href="/picks" className="free-pick-link">Unlock Today&apos;s Full Board</a>
    </div>
  )
}

export default function Home() {
  const [loading, setLoading] = useState(null)
  const [freePick, setFreePick] = useState(null)
  const [freePickUpdated, setFreePickUpdated] = useState(null)
  const [backtestStatIndex, setBacktestStatIndex] = useState(0)
  const [backtestStatSets, setBacktestStatSets] = useState(BACKTEST_STAT_SETS)
  const backtestStats = backtestStatSets[backtestStatIndex] || backtestStatSets[0]

  useEffect(() => {
    // Fade-up observer
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.1 }
    )
    document.querySelectorAll('.fade-up').forEach(el => obs.observe(el))

    // FAQ toggle
    document.querySelectorAll('.faq-q').forEach(q => {
      q.addEventListener('click', () => q.parentElement.classList.toggle('open'))
    })

    // Hero card visible
    setTimeout(() => {
      document.querySelector('.stat-card')?.classList.add('visible')
    }, 400)

    fetch('/api/free-pick')
      .then(res => res.json())
      .then(data => {
        setFreePick(data.pick || null)
        setFreePickUpdated(data.lastUpdated || null)
      })
      .catch(() => {})

    fetch('/api/picks')
      .then(res => res.json())
      .then(data => {
        const sets = buildBacktestStatSets(data.plays || [])
        setBacktestStatSets(sets)
        setBacktestStatIndex(index => Math.min(index, sets.length - 1))
      })
      .catch(() => {})

    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setBacktestStatIndex(i => (i + 1) % backtestStatSets.length)
    }, 10000)

    return () => clearInterval(id)
  }, [backtestStatSets.length])

  async function handleSubscribe(priceId) {
    setLoading(priceId)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else throw new Error(data.error)
    } catch (err) {
      alert('Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  return (
    <>
      <Head>
        <title>GooliuzBoozler — MLB Strikeout Projections</title>
        <meta name="description" content="Sharp MLB strikeout projections. 247-69 all-time, 78.16% win rate, 40.79% ROI. Members get access to today's picks board." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* NAV */}
<nav className="nav">
  <div>
    <span className="nav-logo">GOOLIUZ<em>BOOZLER</em></span>
    <span className="nav-tag">MLB K Props</span>
  </div>
  <div className="nav-actions">
    <a href="/picks" className="nav-link gold">Free Pick</a>
    <a href="/yesterday" className="nav-link neon-red">Yesterday&#39;s Picks</a>
    <a href="/picks" className="nav-link neon-purple">Today&#39;s Picks</a>
    <a href="#pricing" className="nav-cta">Get Access</a>
  </div>
</nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg-letter">K</div>
        <div>
          <div className="hero-eyebrow">2026 Season — Live Now</div>
          <h1>The <em>K</em> Board<br />Built to<br />Beat the Line.</h1>
          <p className="hero-sub">
            Sharp MLB strikeout projections powered by weighted Models 8, 2, 4, 5, and 6.
            Members get plan-based access to the picks board, with higher tiers unlocking
            all five model reads, parlay picks, K Edge, BvP context, market lines, and full-board data.
          </p>
          <div className="hero-actions">
            <a href="#pricing" className="btn-primary">Get Access Now</a>
            <a href="#free-pick" className="btn-ghost">Free Pick</a>
            <a href="#model" className="btn-ghost">See the Model</a>
          </div>
        </div>

        <div className="stat-card fade-up">
          <div className="stat-card-label">// All-Time Backtest — Weighted K Model</div>
          <div className="stat-cycle-head">
            <div>
              <div className="stat-cycle-title">{backtestStats.title}</div>
              <div className="stat-cycle-sub">{backtestStats.subtitle}</div>
            </div>
            <div className="stat-cycle-count">
              {String(backtestStatIndex + 1).padStart(2, '0')} / {String(backtestStatSets.length).padStart(2, '0')}
            </div>
          </div>
          <div key={backtestStats.key} className="stat-cycle-body">
            <div className="stat-grid">
              {backtestStats.stats.map(([value, label, tone]) => (
                <div key={label}>
                  <div className={`stat-val ${tone}`}>{value}</div>
                  <div className="stat-lbl">{label}</div>
                </div>
              ))}
            </div>
            {backtestStats.bars.map(([label, value, width], index) => (
              <div className="bar-row" key={label}>
                <div className="bar-meta"><span>{label}</span><span>{value}</span></div>
                <div className="bar-track">
                  <div className={`bar-fill${backtestBarClass(label)}`} style={{ width, animationDelay: `${index * 0.12}s` }}></div>
                </div>
              </div>
            ))}
          </div>
          <div className="stat-cycle-dots" aria-label="Choose backtest stat panel">
            {backtestStatSets.map((set, index) => (
              <button
                key={set.key}
                type="button"
                className={index === backtestStatIndex ? 'active' : ''}
                aria-label={`Show ${set.title} stats`}
                aria-pressed={index === backtestStatIndex}
                onClick={() => setBacktestStatIndex(index)}
              ></button>
            ))}
          </div>
        </div>
      </section>

      {/* FREE PICK */}
      <section id="free-pick" className="free-pick-section">
        <div>
          <div className="eyebrow">// Free Pick</div>
          <h2 className="section-title">Today&apos;s Top<br />Probability Play.</h2>
          <p className="section-sub">
            The public free pick is automatically pulled from the highest model probability
            on the current board. The rest of the card stays members-only.
          </p>
        </div>
        <FreePickCard pick={freePick} lastUpdated={freePickUpdated} />
      </section>

      {/* HOW IT WORKS */}
      <section id="model" style={{background:'rgba(242,237,227,0.015)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)'}}>
        <div className="eyebrow">// What Makes This Different</div>
        <h2 className="section-title">Built on Weighted Inputs.<br />Checked Against the Line.</h2>
        <p className="section-sub">
          Every board is built from Models 8, 2, 4, 5, and 6 projections, probability thresholds,
          K-edge scoring, market lines, BvP data, opponent strikeout profile, recent form,
          and bullpen context. No generic picks. Just the numbers that moved the board.
        </p>

        <div className="features-grid" style={{marginTop:'3.5rem'}}>
          {[
            [
              '01',
              'Best-Probability Tiers',
              'The highest probability across Models 8, 2, 4, 5, and 6 drives the trust grade on every play: 80%+ is Strong, 70-79% is Playable, 60-69% is Thin, and under 60% is Pass. Weekly and Monthly members see Strong and Playable plays; Season members see the full board.'
            ],
            [
              '02',
              'Five Model Reads',
              'Each pitcher is checked across five model outputs. The main Best Bet is whichever model posts the highest non-pass probability, while Monthly and Season members can compare every model read.'
            ],
            [
              '03',
              'Weighted Projection Inputs',
              'The projection blends pitcher baseline, recent K/G, opponent K rank, active-roster matchup, projected Kalshi lines, model K, K edge, probability edge, and model agreement. The final play is based on the full weighted profile.'
            ],
            [
              '04',
              'Active Roster BvP Context',
              'BvP is checked against active opposing hitters, not stale roster assumptions. Monthly and Season members get individual BvP K%, plate appearances, and standout matchup notes where the sample is useful.'
            ],
            [
              '05',
              'K Edge and Market Cushion',
              'K Edge measures the gap between the model strikeout projection and the available market threshold. Higher cushion means the model has more room before the line catches up.'
            ],
            [
              '06',
              'Bullpen and Game Context',
              'Higher-tier board access adds game-time context, opponent, side, bullpen data, recent pitcher form, and available lines so members can inspect the play context.'
            ],
          ].map(([num, title, desc]) => (
            <div key={num} className="feature fade-up">
              <div className="feat-num">{num}</div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing">
        <div className="eyebrow">// Pricing</div>
        <h2 className="section-title">Five Models.<br />Three Ways In.</h2>
        <p className="section-sub">
          Members get access to today&apos;s picks board before first pitch. Cancel anytime.
        </p>
        <div className="pricing-grid">
          <PriceCard
            tier="Weekly"
            price={PRICES.weekly}
            featured={false}
            loading={loading}
            onSubscribe={handleSubscribe}
            features={[
              { yes: true,  text: "Today's picks board access" },
              { yes: true,  text: 'Strong + Playable plays' },
              { yes: true,  text: 'Highest-probability best bet per pitcher' },
              { yes: false, text: 'All five model comparison plays' },
              { yes: false, text: 'Best parlay pick per pitcher' },
              { yes: false, text: 'BvP standout callouts' },
            ]}
          />
          <PriceCard
            tier="Monthly"
            price={PRICES.monthly}
            featured={true}
            loading={loading}
            onSubscribe={handleSubscribe}
            features={[
              { yes: true, text: "Today's picks board access" },
              { yes: true, text: 'Strong + Playable plays' },
              { yes: true, text: 'Models 8, 2, 4, 5, and 6 plays' },
              { yes: true, text: 'Best parlay pick per pitcher' },
              { yes: true, text: 'BvP standout callouts' },
              { yes: true, text: 'K Edge + model variable breakdown' },
              { yes: false, text: 'Full board access (all plays)' },
            ]}
          />
          <PriceCard
            tier="Season Pass"
            price={PRICES.season}
            featured={false}
            loading={loading}
            onSubscribe={handleSubscribe}
            features={[
              { yes: true, text: 'Everything in Monthly' },
              { yes: true, text: 'Full board — all posted plays daily' },
              { yes: true, text: 'Models 8, 2, 4, 5, and 6 across full board' },
              { yes: true, text: 'Best parlay pick per pitcher' },
              { yes: true, text: 'K Edge + model variable breakdown' },
              { yes: true, text: 'Thin plays + weighted-input data' },
              { yes: true, text: 'One-time payment, no renewal' },
            ]}
          />
        </div>
      </section>

      {/* FAQ */}
      <section style={{background:'rgba(242,237,227,0.015)', borderTop:'1px solid var(--border)'}}>
        <div className="eyebrow">// FAQ</div>
        <h2 className="section-title">Common Questions.</h2>
        <div className="faq-list">
          {[
            ['How do I access picks?', "Members log in to the Today's Picks board on the website. Weekly gets Strong and Playable best-probability plays. Monthly adds all five models, parlay picks, K Edge, BvP, and context. Season adds the full board, including Thin plays."],
            ['What are the five model reads?', 'Models 8, 2, 4, 5, and 6 blend recent K/G, opponent K rank, active-roster BvP, full game context, weather, wind, time of day, previous games bullpen data, and much more.'],
            ['What lines do the picks use?', 'Kalshi-style K thresholds. For Yes bets, only accept the listed line or lower. For No bets, only accept the listed line or higher. The board shows the target line.'],
            ['Do you guarantee profits?', 'No — and anyone who does is selling you something else. The model has a 78.16% win rate on a 247-69 active record. Edges lose sometimes. The backtest is real and available to inspect.'],
            ['Can I cancel anytime?', 'Yes. Cancel from your account or by emailing support. No cancellation fees, no questions asked. Weekly and monthly subscriptions stop at the end of the paid period.'],
            ['What does the Season Pass include?', 'Full 2026 season access — every posted play, including Thin plays, all five website model reads, best parlay picks, K Edge, BvP context, market lines, and weighted-input data. One payment, no recurring charges.'],
          ].map(([q, a]) => (
            <div key={q} className="faq-item">
              <div className="faq-q">{q}</div>
              <div className="faq-a">{a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-top">
          <div className="footer-logo">GOOLIUZ<em>BOOZLER</em></div>
          <div className="footer-links">
            <a href="#model">Model</a>
            <a href="#pricing">Pricing</a>
            <a href="mailto:support@gooliuzboozler.com">Support</a>
          </div>
        </div>
        <div className="footer-bottom">
          © 2026 GooliuzBoozler — All rights reserved<br />
          DISCLAIMER: This product is for informational and entertainment purposes only. Past model performance does not guarantee future results. Sports betting involves financial risk and may not be legal in your jurisdiction. Please gamble responsibly. This is not financial advice.
        </div>
      </footer>
    </>
  )
}
