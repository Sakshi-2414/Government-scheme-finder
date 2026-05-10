import React, { useEffect, useState } from 'react'
import s from './HomePage.module.css'

const SCHEMES_PREVIEW = [
  { icon: '🌾', name: 'PM Kisan Samman Nidhi',        benefit: '₹6,000/year direct transfer',     tag: 'Agriculture' },
  { icon: '🏥', name: 'Ayushman Bharat PM-JAY',        benefit: '₹5 lakh health insurance/year',   tag: 'Health' },
  { icon: '🏠', name: 'PM Awas Yojana (Gramin)',       benefit: '₹1.2 lakh house construction',    tag: 'Housing' },
  { icon: '💡', name: 'PM Ujjwala Yojana',             benefit: 'Free LPG connection for women',   tag: 'Women' },
  { icon: '💰', name: 'PM MUDRA Yojana',               benefit: 'Loan up to ₹10 lakh',             tag: 'Business' },
  { icon: '📚', name: 'PM Kaushal Vikas Yojana',       benefit: 'Free skill training + ₹500/month', tag: 'Youth' },
  { icon: '👷', name: 'Mahatma Gandhi NREGA',          benefit: '100 days guaranteed employment',  tag: 'Labour' },
  { icon: '🎓', name: 'Post Matric Scholarship (SC)',  benefit: 'Full fee + maintenance allowance', tag: 'Education' },
]

const STEPS = [
  { icon: '🎤', title: 'Speak or Type',   desc: 'Tell us your age, income, state, occupation and social category in plain language.' },
  { icon: '🧠', title: 'AI Extracts Info', desc: 'Our NLP engine instantly extracts all key details from what you said.' },
  { icon: '⚙️', title: 'Rules Engine',    desc: 'We match your profile against 21+ real government schemes with eligibility rules.' },
  { icon: '🎯', title: 'Get Results',     desc: 'Receive a ranked list of every scheme you qualify for with direct apply links.' },
]

const STATS = [
  { value: '21+', label: 'Government Schemes' },
  { value: '100%', label: 'Free to Use' },
  { value: '🇮🇳', label: 'Made for India' },
  { value: '<5s', label: 'Instant Results' },
]

export default function HomePage({ onStart }) {
  const [schemeCount, setSchemeCount] = useState(21)

  useEffect(() => {
    fetch('/api/get-schemes')
      .then(r => r.json())
      .then(d => { if (d.count) setSchemeCount(d.count) })
      .catch(() => {})
  }, [])

  return (
    <div className={s.page}>
      {/* ── NAV ── */}
      <nav className={s.nav}>
        <div className={s.navLogo}>
          <span className={s.navIco}>🇮🇳</span>
          <span className={s.navName}>SchemeBot</span>
          <span className={s.navTag}>AI Scheme Finder</span>
        </div>
        <div className={s.navLinks}>
          <a href="#how" className={s.navLink}>How it Works</a>
          <a href="#schemes" className={s.navLink}>Schemes</a>
          <button className={s.navCta} onClick={onStart}>Launch App →</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className={s.hero}>
        <div className={s.heroBg} />
        <div className={s.heroGlow} />
        <div className={s.heroContent}>
          <div className={s.heroBadge}>
            <span className={s.heroBadgeDot} />
            AI-Powered · Voice-Enabled · Free
          </div>
          <h1 className={s.heroTitle}>
            Find Every Government<br />
            <span className={s.heroAccent}>Scheme You Deserve</span>
          </h1>
          <p className={s.heroSub}>
            Speak or type your details — age, income, state, category — and our AI instantly finds
            every Indian government scheme you're eligible for. No forms. No confusion. Just results.
          </p>
          <div className={s.heroBtns}>
            <button className={s.heroCta} onClick={onStart}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
              Start Finding Schemes
            </button>
            <a href="#how" className={s.heroSecondary}>How it works ↓</a>
          </div>
          <div className={s.heroStats}>
            {STATS.map(st => (
              <div key={st.label} className={s.heroStat}>
                <span className={s.heroStatVal}>{st.value === '21+' ? `${schemeCount}+` : st.value}</span>
                <span className={s.heroStatLbl}>{st.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={s.heroVisual}>
          <div className={s.heroCard}>
            <div className={s.heroCardTop}>
              <span className={s.heroCardDot} /><span className={s.heroCardDot} /><span className={s.heroCardDot} />
            </div>
            <div className={s.heroMsg}>
              <div className={s.heroBotMsg}>
                <span className={s.heroBotAv}>🏛</span>
                <div className={s.heroBubble}>Namaste! Tell me your details to find eligible schemes 🇮🇳</div>
              </div>
              <div className={s.heroUserMsg}>
                <div className={s.heroUserBubble}>I'm a 28yr SC farmer from Bihar, income ₹80,000</div>
                <span className={s.heroUserAv}>👤</span>
              </div>
              <div className={s.heroBotMsg}>
                <span className={s.heroBotAv}>🏛</span>
                <div className={s.heroBubble}>
                  🎉 Found <strong>8 schemes</strong> for you!<br/>
                  <span className={s.heroSchemeTag}>PM Kisan</span>
                  <span className={s.heroSchemeTag}>Ayushman</span>
                  <span className={s.heroSchemeTag}>NREGA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className={s.section} id="how">
        <div className={s.sectionInner}>
          <div className={s.sectionHdr}>
            <span className={s.sectionBadge}>Process</span>
            <h2 className={s.sectionTitle}>How SchemeBot Works</h2>
            <p className={s.sectionSub}>Four simple steps from your details to your eligible schemes</p>
          </div>
          <div className={s.stepsGrid}>
            {STEPS.map((step, i) => (
              <div key={step.title} className={s.stepCard}>
                <div className={s.stepNum}>{i + 1}</div>
                <div className={s.stepIcon}>{step.icon}</div>
                <h3 className={s.stepTitle}>{step.title}</h3>
                <p className={s.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCHEMES PREVIEW ── */}
      <section className={s.section} id="schemes">
        <div className={s.sectionInner}>
          <div className={s.sectionHdr}>
            <span className={s.sectionBadge}>Database</span>
            <h2 className={s.sectionTitle}>Schemes We Cover</h2>
            <p className={s.sectionSub}>Real government schemes across Agriculture, Health, Education, Business & more</p>
          </div>
          <div className={s.schemesGrid}>
            {SCHEMES_PREVIEW.map(sc => (
              <div key={sc.name} className={s.schemePreviewCard}>
                <div className={s.spIcon}>{sc.icon}</div>
                <div className={s.spBody}>
                  <div className={s.spName}>{sc.name}</div>
                  <div className={s.spBenefit}>{sc.benefit}</div>
                </div>
                <span className={s.spTag}>{sc.tag}</span>
              </div>
            ))}
          </div>
          <div className={s.schemesCta}>
            <button className={s.heroCta} onClick={onStart}>
              Check All {schemeCount}+ Schemes →
            </button>
          </div>
        </div>
      </section>

      {/* ── VOICE SECTION ── */}
      <section className={s.voiceSection}>
        <div className={s.sectionInner}>
          <div className={s.voiceInner}>
            <div className={s.voiceLeft}>
              <span className={s.sectionBadge}>Voice Input</span>
              <h2 className={s.sectionTitle}>Speak in Your Language</h2>
              <p className={s.sectionSub}>
                Just click the microphone and describe your situation naturally.
                Our system understands Indian English and extracts all the details automatically.
              </p>
              <ul className={s.voiceList}>
                <li>✅ Works with Indian English accents</li>
                <li>✅ No typing required</li>
                <li>✅ Real-time speech-to-text</li>
                <li>✅ Uses your browser's built-in mic (Chrome/Edge)</li>
              </ul>
              <button className={s.heroCta} style={{marginTop: '24px'}} onClick={onStart}>
                Try Voice Input →
              </button>
            </div>
            <div className={s.voiceRight}>
              <div className={s.voiceDemo}>
                <div className={s.voiceMic}>🎤</div>
                <div className={s.voiceWaves}>
                  <span /><span /><span /><span /><span />
                </div>
                <div className={s.voiceText}>"I am a 35 year old OBC farmer from Rajasthan with income of one lakh..."</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerLogo}>
            <span>🇮🇳</span> SchemeBot — AI Government Scheme Finder
          </div>
          <div className={s.footerLinks}>
            <span>Built with Python NLP · Rule-Based Engine · React · Voice API</span>
          </div>
          <div className={s.footerNote}>
            For informational purposes only. Verify eligibility on official government portals.
          </div>
        </div>
      </footer>
    </div>
  )
}
