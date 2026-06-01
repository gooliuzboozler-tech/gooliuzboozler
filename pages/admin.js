import Head from 'next/head'
import { useState, useRef } from 'react'

export default function Admin() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [file, setFile] = useState(null)
  const [fileLabel, setFileLabel] = useState(null)
  const [status, setStatus] = useState(null)
  const [result, setResult] = useState(null)
  const [uploadMode, setUploadMode] = useState('today')
  const fileRef = useRef(null)

  const s = {
    page: { minHeight: '100vh', background: '#0A0A08', color: '#F2EDE3', fontFamily: 'DM Mono, monospace', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' },
    box: { width: '100%', maxWidth: 520, border: '1px solid rgba(242,237,227,0.1)', padding: '2.5rem' },
    label: { fontSize: '0.6rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#5A5448', display: 'block', marginBottom: '0.5rem' },
    input: { width: '100%', background: '#111', border: '1px solid #222', color: '#F2EDE3', fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', padding: '0.75rem 1rem', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box' },
    btn: (color) => ({ width: '100%', background: color || '#C8180A', border: 'none', color: '#F2EDE3', fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.85rem', cursor: 'pointer' }),
    dropzone: (hasFile) => ({ border: `1px dashed ${hasFile ? '#22C55E' : '#2a2a2a'}`, background: hasFile ? '#0e1a0e' : '#0e0e0e', padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1rem', transition: 'all 0.2s' }),
  }

  function handleLogin() {
    if (password.trim()) { setAuthed(true); setAuthError(false) }
    else setAuthError(true)
  }

  function handleFileDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer?.files[0] || e.target.files[0]
    if (!f) return
    setFile(f); setFileLabel(f.name); setStatus(null); setResult(null)
  }

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
    const [namePart, metaPart = ''] = raw.split('.')
    const teamMatch = metaPart.match(/^([A-Z]{2,3})/)
    return {
      name: namePart || raw,
      team: teamMatch ? teamMatch[1] : '',
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
      modelNumber === 3 ? 'Model 3' : '',
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

  function parseCSV(text) {
    const lines = text.split('\n').map(l => l.replace(/\r$/, ''))

    // Find the filterable board section header
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
      if (!line.trim() || line.startsWith(',,,')) break

      const vals = []
      let cur = '', inQ = false
      for (let j = 0; j < line.length; j++) {
        if (line[j] === '"') { inQ = !inQ }
        else if (line[j] === ',' && !inQ) { vals.push(cur.trim()); cur = '' }
        else { cur += line[j] }
      }
      vals.push(cur.trim())

      const row = {}
      headers.forEach((h, idx) => { row[h] = vals[idx] || '' })

      if (!row['Pitcher']) break

      const models = [1, 2, 3, 4, 5].map(modelNumber => getModel(row, modelNumber))
      const usableModels = models.filter(isUsableModel)
      const bestModel = usableModels
        .filter(model => model.oddsNumber > 1.29)
        .sort((a, b) => b.probabilityNumber - a.probabilityNumber)[0] || usableModels
        .sort((a, b) => b.probabilityNumber - a.probabilityNumber)[0]
      const pitcher = parsePitcher(row['Pitcher'])
      if (!bestModel) continue
      const actualKs = firstValue(row, ['Actual K', 'Actual Ks', 'Actual Strikeouts', 'Strikeouts', 'Final K', 'Final Ks', 'SO', 'K Result'])
      const explicitResult = firstValue(row, ['Result', 'Outcome', 'Hit/Miss', 'Hit?', 'Model 1 Result', 'Best Bet Result'])
      const inferredResult = explicitResult || inferBetResult(bestModel.bet, actualKs)

      plays.push({
        Pitcher: pitcher.name,
        'Pitcher Team': pitcher.team,
        Opponent: row['Opponent'] || '',
        'Game Time': row['Game Time'] || '',
        Side: row['Side'] || '',
        Trust: trustFromProbability(bestModel.prob),
        'Best Model': `Model ${bestModel.number}`,
        'Best Bet': bestModel.bet,
        'Model 1 Bet': models[0].bet,
        'Model 2 Bet': models[1].bet,
        'Model 3 Bet': models[2].bet,
        'Model 4 Bet': models[3].bet,
        'Model 5 Bet': models[4].bet,
        'Parlay Pick': row['Best Parlay Pick'] || row['Parlay Pick'] || row['Parlay Bets'] || '',
        'Best Prob': bestModel.prob,
        'Model 1 Prob': models[0].prob,
        'Model 2 Prob': models[1].prob,
        'Model 3 Prob': models[2].prob,
        'Model 4 Prob': models[3].prob,
        'Model 5 Prob': models[4].prob,
        'Best Edge': bestModel.edge,
        'Model 1 Edge': models[0].edge,
        'Model 2 Edge': models[1].edge,
        'Model 3 Edge': models[2].edge,
        'Model 4 Edge': models[3].edge,
        'Model 5 Edge': models[4].edge,
        'Best Odds': bestModel.odds || row['Best Odds'] || '',
        'Model 1 Odds': models[0].odds,
        'Model 2 Odds': models[1].odds,
        'Model 3 Odds': models[2].odds,
        'Model 4 Odds': models[3].odds,
        'Model 5 Odds': models[4].odds,
        'Model K': bestModel.k || models[0].k,
        'K Edge': bestModel.kEdge || models[0].kEdge,
        'Individual BvP K%': row['Individual BvP K%'] || '',
        'Individual BvP PA': row['Individual BvP PA'] || '',
        'Individual BvP Standouts': row['Individual BvP Standouts'] || '',
        'Opp K Rank': row['Opp K Rank'] || '',
        'Recent Last 2 K/G': row['K/G'] || '',
        'Bullpen Data': row['Bullpen Data'] || '',
        'Kalshi Lines': row['Projected Kalshi Lines'] || '',
        'Actual Ks': actualKs,
        Result: inferredResult,
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

      if (plays.length === 0) {
        setStatus('error')
        setResult({ message: 'No plays found. Make sure you exported the Filterable Board tab as CSV.' })
        return
      }

      const res = await fetch(uploadMode === 'yesterday' ? '/api/yesterday-picks' : '/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': password },
        body: JSON.stringify({ plays }),
      })
      const data = await res.json()

      if (data.success) {
        setStatus('success')
        setResult({ count: data.count })
      } else if (res.status === 401) {
        setStatus('error')
        setResult({ message: 'Wrong password.' })
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
          <input style={s.input} type="password" placeholder="Enter your ADMIN_KEY" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoFocus />
          {authError && <div style={{ fontSize: '0.65rem', color: '#EF4444', marginBottom: '0.75rem' }}>Enter your password</div>}
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
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
            {uploadMode === 'yesterday' ? "Upload Yesterday's Results" : "Upload Today's Board"}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#5A5448', marginBottom: '2rem', lineHeight: 1.6 }}>
            In Numbers: File → Export To → CSV → choose the <strong style={{color:'#888'}}>Filterable Board</strong> sheet.<br />
            {uploadMode === 'yesterday' ? 'For results, include an Actual K / Result column if you have one. The site can infer hit or miss from Actual K.' : 'Drop the CSV below to publish instantly.'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#222', marginBottom: '1rem' }}>
            {[
              ['today', "Today's Board"],
              ['yesterday', "Yesterday's Results"],
            ].map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => { setUploadMode(mode); setStatus(null); setResult(null) }}
                style={{
                  background: uploadMode === mode ? '#C8180A' : '#0e0e0e',
                  border: 'none',
                  color: '#F2EDE3',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: '0.62rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '0.7rem',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={s.dropzone(!!fileLabel)} onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={handleFileDrop}>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileDrop} />
            {fileLabel ? (
              <div><div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✓</div><div style={{ fontSize: '0.75rem', color: '#22C55E' }}>{fileLabel}</div><div style={{ fontSize: '0.6rem', color: '#3a5a3a', marginTop: '0.3rem' }}>Click to replace</div></div>
            ) : (
              <div><div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.3 }}>📂</div><div style={{ fontSize: '0.7rem', color: '#5A5448' }}>Drop CSV or click to browse</div></div>
            )}
          </div>

          {status === 'success' && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', padding: '1rem', marginBottom: '1rem', fontSize: '0.72rem', color: '#22C55E', lineHeight: 1.6 }}>✓ {uploadMode === 'yesterday' ? 'Yesterday results' : 'Board'} updated — {result?.count} plays live</div>}
          {status === 'error' && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '1rem', marginBottom: '1rem', fontSize: '0.72rem', color: '#EF4444', lineHeight: 1.6 }}>✗ {result?.message}</div>}

          <button style={{ ...s.btn(status === 'uploading' ? '#333' : fileLabel ? '#C8180A' : '#2a2a2a'), cursor: fileLabel && status !== 'uploading' ? 'pointer' : 'not-allowed' }} onClick={handleUpload} disabled={!fileLabel || status === 'uploading'}>
            {status === 'uploading' ? '◌  Uploading...' : status === 'success' ? '✓  Upload Another' : uploadMode === 'yesterday' ? '▲  Publish Results' : '▲  Publish Board'}
          </button>

          {status === 'success' && <a href={uploadMode === 'yesterday' ? '/yesterday' : '/picks'} target="_blank" style={{ display: 'block', textAlign: 'center', marginTop: '0.75rem', fontSize: '0.65rem', color: '#5A5448', letterSpacing: '0.1em', textDecoration: 'none' }}>View live page →</a>}
        </div>
      </div>
    </>
  )
}
