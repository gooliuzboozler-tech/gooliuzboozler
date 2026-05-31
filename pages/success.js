import Head from 'next/head'
import Link from 'next/link'

export default function Success() {
  return (
    <>
      <Head>
        <title>You're In — GooliuzBoozler</title>
      </Head>
      <div className="result-page">
        <div className="result-icon">⚾</div>
        <h1 className="result-title" style={{color:'#22C55E'}}>You're In.</h1>
        <p className="result-sub">
          Your access is active. Go to the members board to view today's picks
          and set your login password if this is your first time.
        </p>
        <p style={{fontFamily:'DM Mono, monospace', fontSize:'0.7rem', color:'var(--muted)', letterSpacing:'0.12em', marginBottom:'2rem'}}>
          Questions? support@gooliuzboozler.com
        </p>
        <Link href="/picks" className="btn-ghost">View Today's Picks</Link>
      </div>
    </>
  )
}
