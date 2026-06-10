const MLB_SCHEDULE_URL = 'https://statsapi.mlb.com/api/v1/schedule'
const MLB_LIVE_FEED_URL = 'https://statsapi.mlb.com/api/v1.1/game'
const MLB_TEAM_ABBR_BY_ID = {
  108: 'LAA',
  109: 'ARI',
  110: 'BAL',
  111: 'BOS',
  112: 'CHC',
  113: 'CIN',
  114: 'CLE',
  115: 'COL',
  116: 'DET',
  117: 'HOU',
  118: 'KC',
  119: 'LAD',
  120: 'WSH',
  121: 'NYM',
  133: 'ATH',
  134: 'PIT',
  135: 'SD',
  136: 'SEA',
  137: 'SF',
  138: 'STL',
  139: 'TB',
  140: 'TEX',
  141: 'TOR',
  142: 'MIN',
  143: 'PHI',
  144: 'ATL',
  145: 'CWS',
  146: 'MIA',
  147: 'NYY',
  158: 'MIL',
}

const TEAM_ALIASES = {
  AZ: 'ARI',
  CHW: 'CWS',
  KCR: 'KC',
  OAK: 'ATH',
  SDP: 'SD',
  SFG: 'SF',
  TBR: 'TB',
  WSN: 'WSH',
  ARIZONADIAMONDBACKS: 'ARI',
  ATHLETICS: 'ATH',
  ATLANTABRAVES: 'ATL',
  BALTIMOREORIOLES: 'BAL',
  BOSTONREDSOX: 'BOS',
  CHICAGOCUBS: 'CHC',
  CHICAGOWHITESOX: 'CWS',
  CINCINNATIREDS: 'CIN',
  CLEVELANDGUARDIANS: 'CLE',
  COLORADOROCKIES: 'COL',
  DETROITTIGERS: 'DET',
  HOUSTONASTROS: 'HOU',
  KANSASCITYROYALS: 'KC',
  LOSANGELESANGELS: 'LAA',
  LOSANGELESDODGERS: 'LAD',
  MIAMIMARLINS: 'MIA',
  MILWAUKEEBREWERS: 'MIL',
  MINNESOTATWINS: 'MIN',
  NEWYORKMETS: 'NYM',
  NEWYORKYANKEES: 'NYY',
  PHILADELPHIAPHILLIES: 'PHI',
  PITTSBURGHPIRATES: 'PIT',
  SANDIEGOPADRES: 'SD',
  SANFRANCISCOGIANTS: 'SF',
  SEATTLEMARINERS: 'SEA',
  STLOUISCARDINALS: 'STL',
  TAMPABAYRAYS: 'TB',
  TEXASRANGERS: 'TEX',
  TORONTOBLUEJAYS: 'TOR',
  WASHINGTONNATIONALS: 'WSH',
}

function todayDateKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const value = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function nextDateKey(dateKey) {
  const [year, month, day] = String(dateKey || '').split('-').map(Number)
  if (!year || !month || !day) return ''
  const date = new Date(Date.UTC(year, month - 1, day + 1))
  return date.toISOString().slice(0, 10)
}

function candidateDateKeysFromPlays(plays) {
  const dates = plays
    .map(play => String(play?.['Pick Date'] || play?.Date || '').trim())
    .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort()

  if (dates.length) return [...new Set(dates)]

  const today = todayDateKey()
  return [today, nextDateKey(today)].filter(Boolean)
}

function cleanName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s.'-]/gi, ' ')
    .replace(/\b(jr|sr|ii|iii|iv)\b\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function cleanTeam(value) {
  const cleaned = String(value || '').replace(/[^a-z]/gi, '').trim().toUpperCase()
  return TEAM_ALIASES[cleaned] || cleaned
}

function numberFrom(value) {
  const num = Number.parseFloat(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(num) ? num : null
}

function parseBet(bet) {
  const match = String(bet || '').match(/\b(Yes|No)\s+(\d+)\+/i)
  if (!match) return null
  return {
    side: match[1].toLowerCase(),
    threshold: Number.parseInt(match[2], 10),
  }
}

function inferLiveResult(bet, strikeouts, pitcherDone, gameFinal) {
  const parsed = parseBet(bet)
  if (!parsed || strikeouts === null) return ''

  if (parsed.side === 'yes' && strikeouts >= parsed.threshold) return 'Hit'
  if (parsed.side === 'no' && strikeouts >= parsed.threshold) return 'Miss'

  if (!pitcherDone && !gameFinal) return ''

  const hit = parsed.side === 'yes'
    ? strikeouts >= parsed.threshold
    : strikeouts < parsed.threshold
  return hit ? 'Hit' : 'Miss'
}

async function getJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`MLB request failed: ${response.status}`)
  return response.json()
}

function gameTeams(game) {
  const away = game?.teams?.away?.team || {}
  const home = game?.teams?.home?.team || {}
  return {
    away: cleanTeam(away.abbreviation || away.teamCode || away.fileCode || MLB_TEAM_ABBR_BY_ID[away.id] || away.name),
    home: cleanTeam(home.abbreviation || home.teamCode || home.fileCode || MLB_TEAM_ABBR_BY_ID[home.id] || home.name),
  }
}

function findMatchingGame(play, games) {
  const pitcherTeam = cleanTeam(play['Pitcher Team'])
  const opponent = cleanTeam(play.Opponent)

  return games.find(game => {
    const teams = gameTeams(game)
    const teamMatch = pitcherTeam && (teams.away === pitcherTeam || teams.home === pitcherTeam)
    const opponentMatch = !opponent || teams.away === opponent || teams.home === opponent
    return teamMatch && opponentMatch
  }) || games.find(game => {
    const teams = gameTeams(game)
    return pitcherTeam && (teams.away === pitcherTeam || teams.home === pitcherTeam)
  })
}

function findPitcherEntry(feed, pitcherName) {
  const target = cleanName(pitcherName)
  const sides = ['away', 'home']

  for (const side of sides) {
    const players = feed?.liveData?.boxscore?.teams?.[side]?.players || {}
    for (const player of Object.values(players)) {
      const fullName = cleanName(player?.person?.fullName)
      if (fullName && fullName === target) return { side, player }
    }
  }

  for (const side of sides) {
    const players = feed?.liveData?.boxscore?.teams?.[side]?.players || {}
    for (const player of Object.values(players)) {
      const fullName = cleanName(player?.person?.fullName)
      if (fullName && (fullName.includes(target) || target.includes(fullName))) return { side, player }
    }
  }

  return null
}

function gameIsFinal(statusCode) {
  return ['F', 'O', 'FR'].includes(String(statusCode || '').toUpperCase())
}

function gameIsLive(statusCode) {
  return ['I', 'M', 'N', 'PW'].includes(String(statusCode || '').toUpperCase())
}

function pitcherIsCurrent(feed, player) {
  const currentPitcherId = feed?.liveData?.linescore?.defense?.pitcher?.id
  return Boolean(currentPitcherId && player?.person?.id && currentPitcherId === player.person.id)
}

function pitcherTeamIsOnDefense(feed, side) {
  const defenseTeamId = feed?.liveData?.linescore?.defense?.team?.id
  const pitcherTeamId = feed?.gameData?.teams?.[side]?.id
  return Boolean(defenseTeamId && pitcherTeamId && defenseTeamId === pitcherTeamId)
}

function pitcherHasActualOuting(player) {
  const pitching = player?.stats?.pitching || {}
  return [
    pitching.gamesPitched,
    pitching.gamesStarted,
    pitching.numberOfPitches,
    pitching.battersFaced,
    pitching.outs,
  ].some(value => (numberFrom(value) || 0) > 0)
}

function liveGameContext(feed, player) {
  const linescore = feed?.liveData?.linescore || {}
  const inning = linescore.currentInningOrdinal || linescore.currentInning
  const half = linescore.inningHalf || linescore.currentInningHalf
  const outs = Number.isFinite(Number(linescore.outs)) ? String(linescore.outs) : ''
  const pitches = numberFrom(player?.stats?.pitching?.numberOfPitches)

  return {
    'Live Inning': inning && half ? `${half} ${inning}` : inning ? String(inning) : '',
    'Live Outs': outs,
    'Live Pitches': pitches === null ? '' : String(pitches),
  }
}

async function buildLiveGameMap(dateKey) {
  const scheduleUrl = `${MLB_SCHEDULE_URL}?sportId=1&date=${encodeURIComponent(dateKey)}`
  const schedule = await getJson(scheduleUrl)
  const games = schedule?.dates?.flatMap(date => date.games || []) || []
  const feeds = new Map()

  await Promise.all(games.map(async game => {
    const gamePk = game?.gamePk
    if (!gamePk) return
    try {
      const feed = await getJson(`${MLB_LIVE_FEED_URL}/${gamePk}/feed/live`)
      feeds.set(gamePk, feed)
    } catch {
      feeds.set(gamePk, null)
    }
  }))

  return { games, feeds }
}

async function enrichPlaysWithLiveMlb(plays, options = {}) {
  if (!Array.isArray(plays) || plays.length === 0) return plays

  let liveData
  try {
    const dateKeys = options.dateKey ? [options.dateKey] : candidateDateKeysFromPlays(plays)
    const candidates = await Promise.all(dateKeys.map(async dateKey => {
      const data = await buildLiveGameMap(dateKey)
      const matchCount = plays.filter(play => findMatchingGame(play, data.games)).length
      return { dateKey, matchCount, data }
    }))
    liveData = candidates
      .sort((a, b) => (b.matchCount - a.matchCount) || String(b.dateKey).localeCompare(String(a.dateKey)))[0]?.data
    if (!liveData) return plays
  } catch {
    return plays
  }

  return plays.map(play => {
    const game = findMatchingGame(play, liveData.games)
    if (!game?.gamePk) return play

    const feed = liveData.feeds.get(game.gamePk)
    if (!feed) return play

    const match = findPitcherEntry(feed, play.Pitcher)
    const status = feed?.gameData?.status || game.status || {}
    const statusCode = status.codedGameState || status.statusCode || status.abstractGameCode
    const isFinal = gameIsFinal(statusCode)
    const isLive = gameIsLive(statusCode)

    if (!match) {
      return {
        ...play,
        'Live Status': isFinal ? 'Final' : isLive ? 'Live' : (status.detailedState || 'Scheduled'),
        'GamePk': String(game.gamePk),
      }
    }

    const hasActualOuting = pitcherHasActualOuting(match.player)
    const context = hasActualOuting ? liveGameContext(feed, match.player) : {}
    if (!hasActualOuting) {
      return {
        ...play,
        'Actual Ks': '',
        'Live Ks': '',
        'Live Inning': '',
        'Live Outs': '',
        'Live Pitches': '',
        'Live Status': isFinal ? 'Final' : isLive ? 'Live' : (status.detailedState || 'Scheduled'),
        'GamePk': String(game.gamePk),
        Result: '',
      }
    }

    const strikeouts = numberFrom(match.player?.stats?.pitching?.strikeOuts)
    if (strikeouts === null) {
      return {
        ...play,
        ...context,
        'Live Status': isFinal ? 'Final' : isLive ? 'Live' : (status.detailedState || 'Scheduled'),
        'GamePk': String(game.gamePk),
      }
    }

    const isCurrent = pitcherIsCurrent(feed, match.player)
    const hasOuting = Boolean(match.player?.stats?.pitching)
    const onDefense = pitcherTeamIsOnDefense(feed, match.side)
    const pitcherDone = isFinal || (isLive && hasOuting && onDefense && !isCurrent)
    const result = inferLiveResult(play['Best Bet'], strikeouts, pitcherDone, isFinal)
    const liveStatus = isFinal
      ? 'Final'
      : pitcherDone
        ? 'Starter Out'
        : isCurrent
          ? 'Pitching Live'
          : isLive && !onDefense
            ? 'Live'
          : isLive
            ? 'Live'
            : (status.detailedState || 'Scheduled')

    return {
      ...play,
      ...context,
      'Actual Ks': String(strikeouts),
      'Live Ks': String(strikeouts),
      'Live Status': liveStatus,
      'GamePk': String(game.gamePk),
      Result: result || play.Result || '',
    }
  })
}

module.exports = {
  enrichPlaysWithLiveMlb,
  inferLiveResult,
}
