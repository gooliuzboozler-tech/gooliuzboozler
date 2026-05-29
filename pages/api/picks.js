import Head from 'next/head'
import { useEffect, useState } from 'react'
import Link from 'next/link'

// Trust tier colors
const TRUST_STYLES = {
  Strong:   { bg: 'rgba(34,197,94,0.12)',  color: '#22C55E', border: 'rgba(34,197,94,0.3)'  },
  Playable: { bg: 'rgba(234,179,8,0.1)',   color: '#EAB308', border: 'rgba(234,179,8,0.3)'  },
  Thin:     { bg: 'rgba(249,115,22,0.1)',  color: '#F97316', border: 'rgba(249,115,22,0.3)' },
  Pass:     { bg: 'rgba(239,68,68,0.08)',  color: '#EF4444', border: 'rgba(239,68,68,0.2)'  },
}

function TrustBadge({ trust }) {
  const style = TRUST_STYLES[trust] || TRUST_STYLES.Thin
  return (
    <span style={{
      fontFamily: 'DM Mono, monospace',
      fontSize: '0.6rem',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      padding: '0.2rem 0.55rem',
      background: style.bg,
      color: style.color,
      border: `1px solid ${style.border}`,
    }}>{trust}</span>
  )
}

function PickCard({ play, index }) {
  const [expanded, setExpanded] = useState(false)
  const trust = play.Trust || 'Playable'
  const ts = TRUST_STYLES[trust] || TRUST_STYLES.Thin

  return (
    <div style={{
      background: '#0e0e0c',
      border: `1px solid ${expanded ? ts.border : 'rgba(242,237,227,0.07)'}`,
      marginBottom: 1,
      transition: 'border-color 0.2s',
    }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 2fr 1fr 1fr 1fr',
          gap: '0.5rem',
          padding: '1rem 1.25rem',
          cursor: 'pointer',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', color: '#F2EDE3', letterSpacing: '0.04em' }}>
            {play.Pitcher}
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>
            vs {play.Opponent}
          </div>
        </div>
        <TrustBadge trust={trust} />
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.75rem', color: ts.color }}>
            {play['Best Bet']}
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>
            Best Bet
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#F2EDE3' }}>
            {play['Best Prob']}
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>
            Prob
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#22C55E' }}>
            {play['Best Edge']}
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>
            Edge
          </div>
        </div>
        <div style={{ textAlign: 'right', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: '#5A5448' }}>
          {expanded ? '▲' : '▼'}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(242,237,227,0.05)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '1rem', marginBottom: '1rem' }}>
            {/* Best */}
            <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', padding: '0.85rem' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: '#22C55E', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>BEST BET</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', color: '#F2EDE3' }}>{play['Best Bet']}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.68rem', color: '#BFB090', marginTop: 4 }}>
                {play['Best Prob']} prob · {play['Best Edge']} edge
              </div>
            </div>
            {/* Conservative */}
            <div style={{ background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.2)', padding: '0.85rem' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: '#EAB308', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>CONSERVATIVE</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', color: '#F2EDE3' }}>{play['Conservative Bet']}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.68rem', color: '#BFB090', marginTop: 4 }}>
                {play['Conservative Prob']} prob · {play['Conservative Edge']} edge
              </div>
            </div>
            {/* Risky */}
            <div style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.2)', padding: '0.85rem' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: '#F97316', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>RISKY</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', color: '#F2EDE3' }}>{play['Risky Bet']}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.68rem', color: '#BFB090', marginTop: 4 }}>
                {play['Risky Prob']} prob · {play['Risky Edge']} edge
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem' }}>
            {[
              ['Model K', play['Model K']],
              ['K Edge', play['K Edge']],
              ['Opp K Rank', play['Opp K Rank']],
              ['Recent 2 K/G', play['Recent Last 2 K/G']],
            ].map(([label, val]) => (
              <div key={label} style={{ background: 'rgba(242,237,227,0.03)', padding: '0.6rem 0.75rem' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: '#5A5448', letterSpacing: '0.12em', marginBottom: 3 }}>{label}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#F2EDE3' }}>{val || '—'}</div>
              </div>
            ))}
          </div>

          {/* BvP */}
          {play['Individual BvP Standouts'] && play['Individual BvP Standouts'] !== '—' && (
            <div style={{ marginTop: '0.75rem', background: 'rgba(242,237,227,0.02)', border: '1px solid rgba(242,237,227,0.06)', padding: '0.75rem' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: '#5A5448', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>BVP STANDOUTS</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.72rem', color: '#BFB090', lineHeight: 1.6 }}>
                {play['Individual BvP Standouts']}
              </div>
            </div>
          )}

          {/* Bullpen */}
          {play['Bullpen Data'] && play['Bullpen Data'] !== '—' && (
            <div style={{ marginTop: '0.5rem', fontFamily: 'DM Mono, monospace', fontSize: '0.65rem', color: '#5A5448', lineHeight: 1.6 }}>
              <span style={{ color: '#F97316' }}>⚡ Bullpen: </span>{play['Bullpen Data']}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Picks() {
  const [status, setStatus] = useState('loading') // loading | authorized | unauthorized
  const [plays, setPlays] = useState([])
  const [filter, setFilter] = useState('All')
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    // Check for Stripe session in URL (just paid) or stored token
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    const stored = localStorage.getItem('gb_access')

    if (sessionId) {
      // Verify session with our API
      fetch(`/api/verify-session?session_id=${sessionId}`)
        .then(r => r.json())
        .then(data => {
          if (data.valid) {
            localStorage.setItem('gb_access', 'true')
            setStatus('authorized')
            window.history.replaceState({}, '', '/picks')
          } else {
            setStatus('unauthorized')
          }
        })
        .catch(() => setStatus('unauthorized'))
    } else if (stored === 'true') {
      setStatus('authorized')
    } else {
      setStatus('unauthorized')
    }

    // Load picks data
    fetch('/api/picks')
      .then(r => r.json())
      .then(data => {
        setPlays(data.plays || [])
        setLastUpdated(data.lastUpdated || null)
      })
      .catch(() => {})
  }, [])

  const filtered = filter === 'All' ? plays : plays.filter(p => p.Trust === filter)
  const counts = {
    Strong: plays.filter(p => p.Trust === 'Strong').length,
    Playable: plays.filter(p => p.Trust === 'Playable').length,
    Thin: plays.filter(p => p.Trust === 'Thin').length,
    Pass: plays.filter(p => p.Trust === 'Pass').length,
  }

  const navStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1.1rem 2.5rem',
    background: 'rgba(10,10,8,0.92)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid rgba(242,237,227,0.08)',
  }

  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A08' }}>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: '#5A5448', letterSpacing: '0.2em', animation: 'pulse 1.5s ease infinite' }}>
        LOADING...
      </div>
    </div>
  )

  if (status === 'unauthorized') return (
    <>
      <Head><title>Members Board — GooliuzBoozler</title></Head>
      <nav style={navStyle}>
        <Link href="/" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem', letterSpacing: '0.14em', color: '#F2EDE3' }}>
          GOOLIUZ<span style={{ color: '#C8180A' }}>BOOZLER</span>
        </Link>
        <Link href="/#pricing" style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: '#C8180A', color: '#F2EDE3', border: 'none', padding: '0.65rem 1.5rem', cursor: 'pointer' }}>
          Subscribe
        </Link>
      </nav>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', paddingTop: '80px' }}>
        {/* Blurred preview */}
        <div style={{ width: '100%', maxWidth: 800, marginBottom: '2.5rem', position: 'relative' }}>
          <div style={{ filter: 'blur(6px)', opacity: 0.4, pointerEvents: 'none' }}>
            {[
              ['Gerrit Cole', 'vs BOS', 'No 9+', '87%', '+0.37'],
              ['Spencer Strider', 'vs NYM', 'Yes 8+', '84%', '+0.34'],
              ['Zack Wheeler', 'vs ATL', 'No 7+', '82%', '+0.32'],
            ].map((row, i) => (
              <div key={i} style={{ background: '#0e0e0c', border: '1px solid rgba(242,237,227,0.07)', padding: '1rem 1.25rem', marginBottom: 1, display: 'flex', justifyContent: 'space-between', fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#F2EDE3' }}>
                <span>{row[0]}</span><span style={{ color: '#5A5448' }}>{row[1]}</span><span style={{ color: '#22C55E' }}>{row[2]}</span><span>{row[3]}</span><span style={{ color: '#22C55E' }}>{row[4]}</span>
              </div>
            ))}
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: '#5A5448', letterSpacing: '0.18em', background: '#0A0A08', padding: '0.5rem 1rem', border: '1px solid rgba(242,237,227,0.08)' }}>
              🔒 MEMBERS ONLY
            </div>
          </div>
        </div>

        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '3rem', letterSpacing: '0.04em', marginBottom: '1rem' }}>
          TODAY'S FULL BOARD IS <span style={{ color: '#C8180A' }}>LOCKED</span>
        </div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '1rem', color: '#BFB090', fontWeight: 300, maxWidth: 440, lineHeight: 1.7, marginBottom: '2rem' }}>
          Subscribe to access all Strong + Playable plays, BvP callouts, three bet options per pitcher, and the full K Edge breakdown.
        </p>
        <Link href="/#pricing" style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: '#C8180A', color: '#F2EDE3', padding: '1rem 2.5rem', cursor: 'pointer', display: 'inline-block' }}>
          Get Access — From $19/week
        </Link>
      </div>
    </>
  )

  return (
    <>
      <Head>
        <title>Today's Board — GooliuzBoozler</title>
        <meta name="robots" content="noindex" />
      </Head>
      <nav style={navStyle}>
        <Link href="/" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem', letterSpacing: '0.14em', color: '#F2EDE3' }}>
          GOOLIUZ<span style={{ color: '#C8180A' }}>BOOZLER</span>
        </Link>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.62rem', letterSpacing: '0.15em', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)', padding: '0.3rem 0.7rem' }}>
          ● MEMBERS ACCESS
        </div>
      </nav>

      <div style={{ paddingTop: '80px', minHeight: '100vh', padding: '80px 2.5rem 4rem', maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C8180A', marginBottom: '0.5rem' }}>
              // Today's Board
            </div>
            <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '3rem', letterSpacing: '0.04em', lineHeight: 1 }}>
              Pitcher K DINER
            </h1>
            {lastUpdated && (
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: '0.4rem', letterSpacing: '0.1em' }}>
                Updated: {lastUpdated}
              </div>
            )}
          </div>
          {/* Summary pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {Object.entries(counts).map(([trust, count]) => (
              <div key={trust} style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.1em', padding: '0.35rem 0.75rem', background: 'rgba(242,237,227,0.04)', border: '1px solid rgba(242,237,227,0.08)', color: TRUST_STYLES[trust]?.color || '#F2EDE3' }}>
                {count} {trust}
              </div>
            ))}
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 1, marginBottom: '1.5rem', background: 'rgba(242,237,227,0.04)', padding: 1 }}>
          {['All', 'Strong', 'Playable', 'Thin'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              fontFamily: 'DM Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.12em',
              textTransform: 'uppercase', padding: '0.55rem 1.25rem', border: 'none', cursor: 'pointer',
              background: filter === f ? '#C8180A' : 'transparent',
              color: filter === f ? '#F2EDE3' : '#5A5448',
              transition: 'all 0.15s',
            }}>{f} {f !== 'All' ? `(${counts[f]})` : `(${plays.length})`}</button>
          ))}
        </div>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0.5rem 1.25rem', fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#5A5448', borderBottom: '1px solid rgba(242,237,227,0.06)', marginBottom: 1 }}>
          <span>Pitcher</span><span>Trust</span><span>Best Bet</span><span>Prob</span><span>Edge</span><span></span>
        </div>

        {/* Picks */}
        {filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: '#5A5448', letterSpacing: '0.15em' }}>
            NO PLAYS POSTED YET — CHECK BACK BEFORE FIRST PITCH
          </div>
        ) : (
          filtered.map((play, i) => <PickCard key={i} play={play} index={i} />)
        )}

        <div style={{ marginTop: '2rem', fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: 'rgba(90,84,72,0.5)', lineHeight: 1.7, borderTop: '1px solid rgba(242,237,227,0.04)', paddingTop: '1.5rem' }}>
          For Yes bets, only accept the listed line or lower. For No bets, only accept the listed line or higher. Model projections are for informational purposes only. Bet responsibly and only where legal.
        </div>
      </div>
    </>
  )
}
