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

function PickCard({ play }) {
  const [expanded, setExpanded] = useState(false)
  const trust = play.Trust || 'Likely'
  const ts = TRUST_STYLES[trust] || TRUST_STYLES.Likely

  return (
    <div style={{ background: '#0e0e0c', border: `1px solid ${expanded ? ts.border : 'rgba(242,237,227,0.07)'}`, marginBottom: 1, transition: 'border-color 0.2s' }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr 1fr 1fr', gap: '0.5rem', padding: '1rem 1.25rem', cursor: 'pointer', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', color: '#F2EDE3', letterSpacing: '0.04em' }}>{play.Pitcher}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>vs {play.Opponent} {play['Game Time'] ? `· ${play['Game Time']}` : ''}</div>
        </div>
        <TrustBadge trust={trust} />
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.75rem', color: ts.color }}>{play['Best Bet']}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>Best Bet</div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#F2EDE3' }}>{play['Best Prob']}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>Prob</div>
        </div>
        <div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#22C55E' }}>{play['Best Edge']}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: 2 }}>Edge</div>
        </div>
        <div style={{ textAlign: 'right', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: '#5A5448' }}>{expanded ? '▲' : '▼'}</div>
      </div>

      {expanded && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(242,237,227,0.05)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', padding: '0.85rem' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: '#22C55E', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>MODEL 1 BEST BET</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', color: '#F2EDE3' }}>{play['Best Bet']}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.68rem', color: '#BFB090', marginTop: 4 }}>{play['Best Prob']} prob · {play['Best Edge']} edge</div>
            </div>
            <div style={{ background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.2)', padding: '0.85rem' }}>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: '#EAB308', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>MODEL 2 BEST BET</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', color: '#F2EDE3' }}>{play['Conservative Bet'] || '—'}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.68rem', color: '#BFB090', marginTop: 4 }}>{play['Conservative Prob']} prob</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {[['Model K', play['Model K']], ['K Edge', play['K Edge']], ['Opp K Rank', play['Opp K Rank']], ['K/G', play['Recent Last 2 K/G']]].map(([label, val]) => (
              <div key={label} style={{ background: 'rgba(242,237,227,0.03)', padding: '0.6rem 0.75rem' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: '#5A5448', letterSpacing: '0.12em', marginBottom: 3 }}>{label}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#F2EDE3' }}>{val || '—'}</div>
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
        </div>
      )}
    </div>
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
        onLogin(data.email)
      } else {
        setError(data.error || 'Could not unlock picks.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  const navStyle = { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 2.5rem', background: 'rgba(10,10,8,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(242,237,227,0.08)' }

  return (
    <>
      <Head><title>Members Board — GooliuzBoozler</title></Head>
      <nav style={navStyle}>
        <Link href="/" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.5rem', letterSpacing: '0.14em', color: '#F2EDE3' }}>
          GOOLIUZ<span style={{ color: '#C8180A' }}>BOOZLER</span>
        </Link>
        <Link href="/#pricing" style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', background: '#C8180A', color: '#F2EDE3', padding: '0.65rem 1.5rem' }}>
          Subscribe
        </Link>
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
            Not a member? <Link href="/#pricing" style={{ color: '#C8180A' }}>Subscribe from $19/week</Link>
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
            setMemberEmail(data.email)
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
            setStatus('authorized')
          } else {
            localStorage.removeItem('gb_email')
            setStatus('unauthorized')
          }
        })
        .catch(() => {
          // If check fails, let them in anyway if they have stored email
          setMemberEmail(storedEmail)
          setStatus('authorized')
        })
    } else {
      setStatus('unauthorized')
    }

    // Load picks
    fetch('/api/picks')
      .then(r => r.json())
      .then(data => {
        setPlays(data.plays || [])
        setLastUpdated(data.lastUpdated || null)
      })
      .catch(() => {})
  }, [])

  const trustOrder = ['Strong', 'Likely', 'Playable', 'Thin']
  const filtered = filter === 'All' ? plays : plays.filter(p => p.Trust === filter)
  const counts = {
    Strong: plays.filter(p => p.Trust === 'Strong' || p.Trust === 'Likely').length,
    Playable: plays.filter(p => p.Trust === 'Playable').length,
    Thin: plays.filter(p => p.Trust === 'Thin').length,
  }

  const navStyle = { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 2.5rem', background: 'rgba(10,10,8,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(242,237,227,0.08)' }

  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A08' }}>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: '#5A5448', letterSpacing: '0.2em' }}>LOADING...</div>
    </div>
  )

  if (status === 'unauthorized') return <LoginGate onLogin={(email) => { setMemberEmail(email); setStatus('authorized') }} />

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {memberEmail && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', letterSpacing: '0.08em' }}>{memberEmail}</span>}
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.62rem', letterSpacing: '0.15em', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)', padding: '0.3rem 0.7rem' }}>● MEMBER</div>
          <button onClick={() => { localStorage.removeItem('gb_email'); window.location.reload() }} style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.08em' }}>Sign out</button>
        </div>
      </nav>

      <div style={{ paddingTop: '80px', minHeight: '100vh', padding: '80px 2.5rem 4rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C8180A', marginBottom: '0.5rem' }}>// Today's Board</div>
            <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '3rem', letterSpacing: '0.04em', lineHeight: 1 }}>Pitcher K DINER</h1>
            {lastUpdated && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#5A5448', marginTop: '0.4rem', letterSpacing: '0.1em' }}>Updated: {lastUpdated}</div>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[['Likely/Strong', counts.Strong, '#22C55E'], ['Playable', counts.Playable, '#EAB308'], ['Thin', counts.Thin, '#F97316']].map(([label, count, color]) => (
              <div key={label} style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.1em', padding: '0.35rem 0.75rem', background: 'rgba(242,237,227,0.04)', border: '1px solid rgba(242,237,227,0.08)', color }}>{count} {label}</div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 1, marginBottom: '1.5rem', background: 'rgba(242,237,227,0.04)', padding: 1 }}>
          {['All', 'Likely', 'Playable', 'Thin'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0.55rem 1.25rem', border: 'none', cursor: 'pointer', background: filter === f ? '#C8180A' : 'transparent', color: filter === f ? '#F2EDE3' : '#5A5448', transition: 'all 0.15s' }}>
              {f} {f === 'All' ? `(${plays.length})` : f === 'Likely' ? `(${counts.Strong})` : f === 'Playable' ? `(${counts.Playable})` : `(${counts.Thin})`}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0.5rem 1.25rem', fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#5A5448', borderBottom: '1px solid rgba(242,237,227,0.06)', marginBottom: 1 }}>
          <span>Pitcher</span><span>Trust</span><span>Best Bet</span><span>Prob</span><span>Edge</span><span></span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: '#5A5448', letterSpacing: '0.15em' }}>
            NO PLAYS POSTED YET — CHECK BACK BEFORE FIRST PITCH
          </div>
        ) : (
          filtered.map((play, i) => <PickCard key={i} play={play} />)
        )}

        <div style={{ marginTop: '2rem', fontFamily: 'DM Mono, monospace', fontSize: '0.58rem', color: 'rgba(90,84,72,0.5)', lineHeight: 1.7, borderTop: '1px solid rgba(242,237,227,0.04)', paddingTop: '1.5rem' }}>
          For Yes bets, only accept the listed line or lower. For No bets, only accept the listed line or higher. Model projections are for informational purposes only. Bet responsibly and only where legal.
        </div>
      </div>
    </>
  )
}
