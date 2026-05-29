import Head from 'next/head'
import { useState, useRef } from 'react'

export default function Admin() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [file, setFile] = useState(null)
  const [fileLabel, setFileLabel] = useState(null)
  const [status, setStatus] = useState(null) // null | 'uploading' | 'success' | 'error'
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  const s = {
    page: { minHeight: '100vh', background: '#0A0A08', color: '#F2EDE3', fontFamily: 'DM Mono, monospace', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' },
    box: { width: '100%', maxWidth: 520, border: '1px solid rgba(242,237,227,0.1)', padding: '2.5rem' },
    label: { fontSize: '0.6rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5A5448', display: 'block', marginBottom: '0.5rem' },
    input: { width: '100%', background: '#111', border: '1px solid #222', color: '#F2EDE3', fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', padding: '0.75rem 1rem', outline: 'none', marginBottom: '1rem' },
    btn: (color) => ({ width: '100%', background: color || '#C8180A', border: 'none', color: '#F2EDE3', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.85rem', cursor: 'pointer' }),
    dropzone: (hasFile) => ({ border: `1px dashed ${hasFile ? '#22C55E' : '#2a2a2a'}`, background: hasFile ? '#0e1a0e' : '#0e0e0e', padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1rem', transition: 'all 0.2s' }),
  }

  function handleLogin() {
    if (password.trim()) {
      setAuthed(true)
      setAuthError(false)
    } else {
      setAuthError(true)
    }
  }

  function handleFileDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer?.files[0] || e.target.files[0]
    if (!f) return
    setFile(f)
    setFileLabel(f.name)
    setStatus(null)
    setResult(null)
  }

 function parseCSV(text) {
  const lines = text.split('\n').map(l => l.replace(/\r$/, ''))

  function parseProb(value) {
    const cleaned = String(value || '').replace('%', '').trim()
    const num = Number.parseFloat(cleaned)
    if (Number.isNaN(num)) return 0
    return num <= 1 ? num * 100 : num
  }

  function trustFromProb(prob) {
    if (prob >= 80) return 'Strong'
    if (prob >= 70) return 'Playable'
    if (prob >= 60) return 'Thin'
    return 'Pass'
  }

  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('Pitcher,Opponent,')) {
      headerIdx = i
      break
    }
  }

  if (headerIdx === -1) return []

  const headers = lines[headerIdx].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const plays = []

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) break

    const vals = []
    let cur = ''
    let inQ = false

    for (let j = 0; j < line.length; j++) {
      if (line[j] === '"') {
        inQ = !inQ
      } else if (line[j] === ',' && !inQ) {
        vals.push(cur.trim())
        cur = ''
      } else {
        cur += line[j]
      }
    }

    vals.push(cur.trim())

    const row = {}
    headers.forEach((h, idx) => {
      row[h] = vals[idx] || ''
    })

    if (!row['Pitcher']) break
    if (!row['Model 1 Best Bet']) continue

    const model1Prob = parseProb(row['Model 1 Best Prob'])
    const trust = trustFromProb(model1Prob)

    plays.push({
      Pitcher: row['Pitcher'].split('.')[0],
      Opponent: row['Opponent'],
      'Game Time': row['Game Time'] || '',
      Side: row['Side'] || '',
      Trust: trust,
      'Best Bet': row['Model 1 Best Bet'],
      'Conservative Bet': row['Model 2 Best Bet'] || '',
      'Best Prob': row['Model 1 Best Prob'],
      'Conservative Prob': row['Model 2 Prob'] || '',
      'Best Edge': row['Model 1 Best Edge'] || '',
      'Model K': row['Model 1 K'] || '',
      'K Edge': row['Model 1 K Edge'] || '',
      'Individual BvP K%': row['Individual BvP K%'] || '',
      'Individual BvP PA': row['Individual BvP PA'] || '',
      'Individual BvP Standouts': row['Individual BvP Standouts'] || '',
      'Opp K Rank': row['Opp K Rank'] || '',
      'Recent Last 2 K/G': row['K/G'] || '',
      'Bullpen Data': row['Bullpen Data'] || '',
      'Kalshi Lines': row['Projected Kalshi Lines'] || '',
    })
  }

  return plays
}
  async function handleUpload() {
    if (!file) return
    setStatus('uploading')
    try {
      const text = await file.text()
      const plays = parseCSV(text)

      const res = await fetch('/api/picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': password,
        },
        body: JSON.stringify({ plays }),
      })
      const data = await res.json()

      if (data.success) {
        setStatus('success')
        setResult({ count: data.count })
      } else if (res.status === 401) {
        setStatus('error')
        setResult({ message: 'Wrong password — check your ADMIN_KEY in Vercel' })
        setAuthed(false)
      } else {
        setStatus('error')
        setResult({ message: data.error || 'Unknown error' })
      }
    } catch (err) {
      setStatus('error')
      setResult({ message: err.message })
    }
  }

  if (!authed) return (
    <>
      <Head><title>Admin — GooliuzBoozler</title><meta name="robots" content="noindex" /></Head>
      <div style={s.page}>
        <div style={s.box}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.25em', color: '#C8180A', marginBottom: '1.5rem' }}>// GOOLIUZBOOZLER ADMIN</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.04em', marginBottom: '2rem' }}>Daily Board Upload</div>
          <span style={s.label}>Admin Password</span>
          <input
            style={s.input}
            type="password"
            placeholder="Enter your ADMIN_KEY"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            autoFocus
          />
          {authError && <div style={{ fontSize: '0.65rem', color: '#EF4444', marginBottom: '0.75rem' }}>Enter your password to continue</div>}
          <button style={s.btn()} onClick={handleLogin}>Enter →</button>
        </div>
      </div>
    </>
  )

  return (
    <>
      <Head><title>Admin — GooliuzBoozler</title><meta name="robots" content="noindex" /></Head>
      <div style={s.page}>
        <div style={s.box}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.25em', color: '#C8180A', marginBottom: '0.5rem' }}>// GOOLIUZBOOZLER ADMIN</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>Upload Today's Board</div>
          <div style={{ fontSize: '0.65rem', color: '#5A5448', marginBottom: '2rem', lineHeight: 1.6 }}>
            Export your Numbers sheet → File → Export To → CSV<br />
            Drop the CSV below to update the live picks board instantly.
          </div>

          {/* Drop zone */}
          <div
            style={s.dropzone(!!fileLabel)}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={handleFileDrop}
          >
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileDrop} />
            {fileLabel ? (
              <div>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✓</div>
                <div style={{ fontSize: '0.75rem', color: '#22C55E', letterSpacing: '0.08em' }}>{fileLabel}</div>
                <div style={{ fontSize: '0.6rem', color: '#3a5a3a', marginTop: '0.3rem' }}>Click to replace</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.3 }}>📂</div>
                <div style={{ fontSize: '0.7rem', color: '#5A5448', letterSpacing: '0.1em' }}>Drop CSV here or click to browse</div>
                <div style={{ fontSize: '0.6rem', color: '#333', marginTop: '0.4rem' }}>May19_Filterable_Board-Table_1.csv</div>
              </div>
            )}
          </div>

          {/* Status messages */}
          {status === 'success' && (
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', padding: '1rem', marginBottom: '1rem', fontSize: '0.72rem', color: '#22C55E', lineHeight: 1.6 }}>
              ✓ Board updated — {result?.count} plays live on gooliuzboozler.com/picks
            </div>
          )}
          {status === 'error' && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '1rem', marginBottom: '1rem', fontSize: '0.72rem', color: '#EF4444', lineHeight: 1.6 }}>
              ✗ {result?.message}
            </div>
          )}

          <button
            style={{ ...s.btn(status === 'uploading' ? '#333' : fileLabel ? '#C8180A' : '#2a2a2a'), cursor: fileLabel && status !== 'uploading' ? 'pointer' : 'not-allowed' }}
            onClick={handleUpload}
            disabled={!fileLabel || status === 'uploading'}
          >
            {status === 'uploading' ? '◌  Uploading...' : status === 'success' ? '✓  Upload Another' : '▲  Publish Board'}
          </button>

          {status === 'success' && (
            <a href="/picks" target="_blank" style={{ display: 'block', textAlign: 'center', marginTop: '0.75rem', fontSize: '0.65rem', color: '#5A5448', letterSpacing: '0.1em', textDecoration: 'none' }}>
              View live board → gooliuzboozler.com/picks
            </a>
          )}

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(242,237,227,0.06)', fontSize: '0.6rem', color: '#3a3a3a', lineHeight: 1.8 }}>
            Pass plays are automatically excluded.<br />
            Strong → Playable → Thin order is preserved.<br />
            Board goes live immediately on upload.
          </div>
        </div>
      </div>
    </>
  )
}
