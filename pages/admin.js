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
      const headers = lines[headerIdx].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
      const sourceSection = previousSectionName(headerIdx)

      for (let i = headerIdx + 1; i < lines.length; i++) {
        const line = lines[i]
        if (!line.trim() || line.startsWith(',,,')) break
        if (isBoardHeader(line)) break

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
        const explicitBestBet = firstValue(row, ['Best Bet', 'Best Pick', 'Best Model Bet'])
        const explicitBestModel = firstValue(row, ['Best Model', 'Best Bet Model'])
        const explicitBestModelNumber = Number.parseInt(String(explicitBestModel || '').replace(/\D/g, ''), 10)
        const explicitModel = usableModels.find(model => (
          model.number === explicitBestModelNumber ||
          (explicitBestBet && String(model.bet || '').trim() === String(explicitBestBet).trim())
        ))
        const bestModel = explicitModel || usableModels
          .filter(model => model.oddsNumber > 1.29)
          .sort((a, b) => b.probabilityNumber - a.probabilityNumber)[0] || usableModels
          .sort((a, b) => b.probabilityNumber - a.probabilityNumber)[0]
        const pitcher = parsePitcher(row['Pitcher'])
        if (!bestModel) continue
        const actualKs = firstValue(row, ['Actual K', 'Actual Ks', 'Actual Strikeouts', 'Strikeouts', 'Final K', 'Final Ks', 'SO', 'K Result'])
        const explicitResult = firstValue(row, [
          'Best Bet Result',
          `Model ${bestModel.number} Result`,
          'Result',
          'Outcome',
          'Hit/Miss',
          'Hit?',
        ])
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
          'Parlay Backtest Selected Model': row['Parlay Backtest Selected Model'] || '',
          'Parlay Full Plays': row['Parlay Full Plays'] || '',
          'Parlay Full Record': row['Parlay Full Record'] || '',
          'Parlay Full Win Rate': row['Parlay Full Win Rate'] || '',
          'Parlay Full ROI': row['Parlay Full ROI'] || '',
          'Parlay Full Profit': row['Parlay Full Profit'] || '',
          'Parlay Full Avg Prob': row['Parlay Full Avg Prob'] || '',
          'Parlay Full Avg K Gap': row['Parlay Full Avg K Gap'] || '',
          'Model 1 Backtest Record': row['Model 1 Backtest Record'] || '',
          'Model 1 Backtest Win Rate': row['Model 1 Backtest Win Rate'] || '',
          'Model 1 Backtest Plays': row['Model 1 Backtest Plays'] || '',
          'Model 1 Backtest ROI': row['Model 1 Backtest ROI'] || '',
          'Model 2 Backtest Record': row['Model 2 Backtest Record'] || '',
          'Model 2 Backtest Win Rate': row['Model 2 Backtest Win Rate'] || '',
          'Model 2 Backtest Plays': row['Model 2 Backtest Plays'] || '',
          'Model 2 Backtest ROI': row['Model 2 Backtest ROI'] || '',
          'Model 3 Backtest Record': row['Model 3 Backtest Record'] || '',
          'Model 3 Backtest Win Rate': row['Model 3 Backtest Win Rate'] || '',
          'Model 3 Backtest Plays': row['Model 3 Backtest Plays'] || '',
          'Model 3 Backtest ROI': row['Model 3 Backtest ROI'] || '',
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
          'Recent Last 2 K/G': row['K/G'] || '',
          'Bullpen Data': row['Bullpen Data'] || '',
          'Kalshi Lines': row['Projected Kalshi Lines'] || '',
          'Actual Ks': actualKs,
          Result: inferredResult,
          '_Source Section': sourceSection,
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
      const section = String(play['_Source Section'] || '').toLowerCase()
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

  async function handleUpload() {
    if (!file) return
    setStatus('uploading')
    try {
      const text = await file.text()
      const plays = parseCSV(text)
      const { today, yesterday } = splitAllInOnePlays(plays)

      if (plays.length === 0) {
        setStatus('error')
        setResult({ message: 'No plays found. Make sure the all-in-one CSV includes a Pitcher, Opponent header.' })
        return
      }

      const requests = []
      if (today.length) {
        requests.push(fetch('/api/picks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': password },
          body: JSON.stringify({ plays: today }),
        }).then(async res => ({ name: 'today', res, data: await res.json() })))
      }
      if (yesterday.length) {
        requests.push(fetch('/api/yesterday-picks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': password },
          body: JSON.stringify({ plays: yesterday }),
        }).then(async res => ({ name: 'yesterday', res, data: await res.json() })))
      }

      const responses = await Promise.all(requests)
      const failed = responses.find(({ res }) => !res.ok)

      if (!failed) {
        setStatus('success')
        setResult({ todayCount: today.length, yesterdayCount: yesterday.length })
      } else if (failed.res.status === 401) {
        setStatus('error')
        setResult({ message: 'Wrong password.' })
        setAuthed(false)
      } else {
        setStatus('error')
        setResult({ message: failed.data.error || `Could not update ${failed.name}` })
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
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>Upload All-In-One CSV</div>
          <div style={{ fontSize: '0.65rem', color: '#5A5448', marginBottom: '2rem', lineHeight: 1.6 }}>
            Drop the one CSV that includes today&apos;s board, model/backtest data, and yesterday&apos;s results.<br />
            Rows with Actual Ks or a Hit/Miss result publish to Yesterday&apos;s Picks. The rest publish to Today&apos;s Picks.
          </div>

          <div style={s.dropzone(!!fileLabel)} onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={handleFileDrop}>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileDrop} />
            {fileLabel ? (
              <div><div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✓</div><div style={{ fontSize: '0.75rem', color: '#22C55E' }}>{fileLabel}</div><div style={{ fontSize: '0.6rem', color: '#3a5a3a', marginTop: '0.3rem' }}>Click to replace</div></div>
            ) : (
              <div><div style={{ fontSize: '2rem', marginBottom: '0.5rem', opacity: 0.3 }}>📂</div><div style={{ fontSize: '0.7rem', color: '#5A5448' }}>Drop CSV or click to browse</div></div>
            )}
          </div>

          {status === 'success' && <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', padding: '1rem', marginBottom: '1rem', fontSize: '0.72rem', color: '#22C55E', lineHeight: 1.6 }}>✓ All-in-one CSV published — {result?.todayCount || 0} today plays and {result?.yesterdayCount || 0} yesterday results live</div>}
          {status === 'error' && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '1rem', marginBottom: '1rem', fontSize: '0.72rem', color: '#EF4444', lineHeight: 1.6 }}>✗ {result?.message}</div>}

          <button style={{ ...s.btn(status === 'uploading' ? '#333' : fileLabel ? '#C8180A' : '#2a2a2a'), cursor: fileLabel && status !== 'uploading' ? 'pointer' : 'not-allowed' }} onClick={handleUpload} disabled={!fileLabel || status === 'uploading'}>
            {status === 'uploading' ? '◌  Uploading...' : status === 'success' ? '✓  Upload Another' : '▲  Publish All-In-One CSV'}
          </button>

          {status === 'success' && (
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.75rem' }}>
              <a href="/picks" target="_blank" style={{ fontSize: '0.65rem', color: '#5A5448', letterSpacing: '0.1em', textDecoration: 'none' }}>View today →</a>
              <a href="/yesterday" target="_blank" style={{ fontSize: '0.65rem', color: '#5A5448', letterSpacing: '0.1em', textDecoration: 'none' }}>View yesterday →</a>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
