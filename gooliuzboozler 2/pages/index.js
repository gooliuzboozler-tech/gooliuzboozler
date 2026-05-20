import Head from 'next/head'
import { useEffect, useState } from 'react'

const PRICES = {
  weekly:  { id: 'price_1TYwNoIzVbZI7suaeiqXo9Ws', amount: '$19', period: 'per week — billed weekly' },
  monthly: { id: 'price_1TYwOlIzVbZI7suaEGEbXxia', amount: '$49', period: 'per month — billed monthly' },
  season:  { id: 'price_1TYwPfIzVbZI7suaxHy2ScZ3', amount: '$149', period: 'full 2026 season — one time' },
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

export default function Home() {
  const [loading, setLoading] = useState(null)

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

    return () => obs.disconnect()
  }, [])

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
        <meta name="description" content="Sharp MLB strikeout projections. 247-69 all-time, 78.16% win rate, 40.79% ROI. Daily picks via email." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* NAV */}
      <nav className="nav">
        <div>
          <span className="nav-logo">GOOLIUZ<em>BOOZLER</em></span>
          <span className="nav-tag">MLB K Props</span>
        </div>
        <a href="#pricing" className="nav-cta">Get Access</a>
      </nav>

      {/* TICKER */}
      <div className="ticker-wrap">
        <div className="ticker-inner">
          {[
            'PITCHER K DINER — 2026 SEASON LIVE',
            '247-69 ALL-TIME RECORD',
            '78.16% WIN RATE',
            '40.79% ROI',
            'WIN-FIRST OPTIMIZER ACTIVE',
            'DAILY PICKS — EVERY MLB STARTER',
            'BvP SPLITS — ACTIVE ROSTER',
            'FULL BACKTEST TRANSPARENCY',
            'PITCHER K DINER — 2026 SEASON LIVE',
            '247-69 ALL-TIME RECORD',
            '78.16% WIN RATE',
            '40.79% ROI',
            'WIN-FIRST OPTIMIZER ACTIVE',
            'DAILY PICKS — EVERY MLB STARTER',
            'BvP SPLITS — ACTIVE ROSTER',
            'FULL BACKTEST TRANSPARENCY',
          ].map((item, i) => (
            <div key={i} className="ticker-item">{item}</div>
          ))}
        </div>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg-letter">K</div>
        <div>
          <div className="hero-eyebrow">2026 Season — Live Now</div>
          <h1>The <em>K</em> Board<br />Built to<br />Beat the Line.</h1>
          <p className="hero-sub">
            Sharp MLB strikeout projections powered by the Pitcher K DINER model.
            Daily picks delivered to your inbox — Strong plays, BvP splits, full
            edge breakdown. No fluff. Just the number.
          </p>
          <div className="hero-actions">
            <a href="#pricing" className="btn-primary">Get Access Now</a>
            <a href="#model" className="btn-ghost">See the Model</a>
          </div>
        </div>

        <div className="stat-card fade-up">
          <div className="stat-card-label">// All-Time Backtest — Win-First Optimizer</div>
          <div className="stat-grid">
            <div>
              <div className="stat-val g">247-69</div>
              <div className="stat-lbl">Active Record</div>
            </div>
            <div>
              <div className="stat-val g">78.16%</div>
              <div className="stat-lbl">Win Rate</div>
            </div>
            <div>
              <div className="stat-val">40.79%</div>
              <div className="stat-lbl">ROI</div>
            </div>
            <div>
              <div className="stat-val">72.88%</div>
              <div className="stat-lbl">Test Split</div>
            </div>
          </div>
          <div className="bar-row">
            <div className="bar-meta"><span>Strong Plays</span><span>~86% avg prob</span></div>
            <div className="bar-track"><div className="bar-fill" style={{width:'86%'}}></div></div>
          </div>
          <div className="bar-row">
            <div className="bar-meta"><span>Playable Plays</span><span>~77% avg prob</span></div>
            <div className="bar-track"><div className="bar-fill" style={{width:'77%', animationDelay:'0.2s'}}></div></div>
          </div>
          <div className="bar-row">
            <div className="bar-meta"><span>Test Split</span><span>43-16 (72.88%)</span></div>
            <div className="bar-track"><div className="bar-fill" style={{width:'72.88%', animationDelay:'0.4s'}}></div></div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="model" style={{background:'rgba(242,237,227,0.015)', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)'}}>
        <div className="eyebrow">// What Makes This Different</div>
        <h2 className="section-title">Built on DINER.<br />Sharpened by Backtest.</h2>
        <p className="section-sub">
          Every play has a Trust tier, three bet options (Best, Conservative, Risky),
          BvP active roster splits, and a K Edge score. No black box.
        </p>
        <div className="features-grid" style={{marginTop:'3.5rem'}}>
          {[
            ['01', 'Win-First Optimizer', 'Every projection runs through the highest-win-rate config first. 247-69 active record. The model optimizes for winning bets, not just projecting Ks.'],
            ['02', 'Trust Tiers', 'Every play is graded Strong, Playable, Thin, or Pass. Only Strong and Playable plays are included in the daily email. No garbage plays.'],
            ['03', 'Three Bet Options', 'Best Bet (highest probability), Conservative Bet (one line safer), Risky Bet (tighter landing zone). You pick your risk tolerance.'],
            ['04', 'BvP Active Roster Splits', 'Every pitcher's projection includes real hitter-vs-pitcher K% splits for the current active opposing roster — not career aggregates.'],
            ['05', 'K Edge Score', 'The gap between the Model K and the betting line. Targets 0.5–1.5 K cushion. The higher the edge, the more confident the projection.'],
            ['06', 'Full Changelog', 'Every model update is logged with a reason and before/after backtest impact. You always know what changed and why.'],
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
        <h2 className="section-title">One Model.<br />Three Ways In.</h2>
        <p className="section-sub">
          Daily picks delivered to your inbox before first pitch. Cancel anytime.
        </p>
        <div className="pricing-grid">
          <PriceCard
            tier="Weekly"
            price={PRICES.weekly}
            featured={false}
            loading={loading}
            onSubscribe={handleSubscribe}
            features={[
              { yes: true,  text: 'Daily K picks email' },
              { yes: true,  text: 'Strong + Playable plays' },
              { yes: true,  text: 'Best Bet per pitcher' },
              { yes: false, text: 'Conservative + Risky Bets' },
              { yes: false, text: 'BvP standout callouts' },
              { yes: false, text: 'Weekly recap + ROI tracker' },
            ]}
          />
          <PriceCard
            tier="Monthly"
            price={PRICES.monthly}
            featured={true}
            loading={loading}
            onSubscribe={handleSubscribe}
            features={[
              { yes: true, text: 'Daily K picks email' },
              { yes: true, text: 'Strong + Playable plays' },
              { yes: true, text: 'All 3 bet options per pitcher' },
              { yes: true, text: 'BvP standout callouts' },
              { yes: true, text: 'Weekly recap + ROI tracker' },
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
              { yes: true, text: 'Full board — all 26 plays daily' },
              { yes: true, text: 'K Edge + model variable breakdown' },
              { yes: true, text: 'DINER changelog access' },
              { yes: true, text: '2027 early-access pricing' },
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
            ['How are picks delivered?', 'By email, before first pitch each day. You get a formatted picks sheet with every Strong and Playable play, bet options, probabilities, and BvP callouts.'],
            ['What is the DINER model?', 'DINER is the projection framework: Defense-adjusted lineup K%, Innings context, Normalized park factor, Umpire tendency, Rest/fatigue adjustment. Every component is weighted and documented in the changelog.'],
            ['What lines do the picks use?', 'Kalshi-style K thresholds. For Yes bets, only accept the listed line or lower. For No bets, only accept the listed line or higher. The email always specifies.'],
            ['Do you guarantee profits?', 'No — and anyone who does is selling you something else. The model has a 78.16% win rate on a 247-69 active record. Edges lose sometimes. The backtest is real and available to inspect.'],
            ['Can I cancel anytime?', 'Yes. Cancel from your account or by emailing support. No cancellation fees, no questions asked. Weekly and monthly subscriptions stop at the end of the paid period.'],
            ['What does the Season Pass include?', 'Full 2026 season access — every play, every variable, the full board including Thin plays and model notes. One payment, no recurring charges. Includes 2027 early-access pricing.'],
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
