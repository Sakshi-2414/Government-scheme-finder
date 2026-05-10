import React, { useEffect, useRef, useState, useCallback } from 'react'
import { api } from '../utils/api.js'
import s from './AnalyticsPanel.module.css'

/* Load Chart.js dynamically once */
function loadChartJs() {
  return new Promise((resolve) => {
    if (window.Chart) { resolve(window.Chart); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js'
    script.onload = () => resolve(window.Chart)
    document.head.appendChild(script)
  })
}

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: 'rgba(28,42,64,.8)' }, ticks: { color: '#3F516E', font: { size: 10 } } },
    y: { grid: { color: 'rgba(28,42,64,.8)' }, ticks: { color: '#3F516E', font: { size: 10 } }, beginAtZero: true },
  },
}

export default function AnalyticsPanel({ onClose }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const chartsRef = useRef({})
  const timerRef  = useRef(null)

  const fetchData = useCallback(async () => {
    try {
      const d = await api.analytics()
      setData(d)
    } catch {
      // backend not running — show zeros
      setData({
        summary: { total_queries:0, eligibility_rate:0, avg_schemes_per_query:0, total_schemes_in_db:21, scheme_coverage_pct:100 },
        daily_trend: Array.from({length:14},(_,i)=>({label:`D${i+1}`,count:0})),
        category_dist: [{category:'SC',count:0},{category:'ST',count:0},{category:'OBC',count:0},{category:'General',count:0}],
        state_dist: [],
        age_buckets: [{bucket:'0-18',count:0},{bucket:'19-35',count:0},{bucket:'36-60',count:0},{bucket:'60+',count:0}],
        top_schemes: [],
      })
    } finally {
      setLoading(false)
    }
  }, [])

  /* Build / rebuild charts whenever data arrives */
  useEffect(() => {
    if (!data) return
    loadChartJs().then((Chart) => {
      buildCharts(Chart, data, chartsRef)
    })
  }, [data])

  useEffect(() => {
    fetchData()
    timerRef.current = setInterval(fetchData, 30000)
    return () => {
      clearInterval(timerRef.current)
      // destroy all chart instances on unmount
      Object.values(chartsRef.current).forEach(c => c?.destroy())
    }
  }, [fetchData])

  const closeIfBg = (e) => { if (e.target === e.currentTarget) onClose() }

  return (
    <div className={s.overlay} onClick={closeIfBg}>
      <div className={s.panel}>

        {/* Header */}
        <div className={s.hdr}>
          <h2 className={s.hdrTitle}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Analytics Dashboard
          </h2>
          <button className={s.closeBtn} onClick={onClose}>✕ Close</button>
        </div>

        {loading ? (
          <div className={s.loader}>Loading analytics…</div>
        ) : (
          <>
            {/* KPIs */}
            <div className={s.kpiRow}>
              {[
                { v: data.summary.total_queries,             l: 'Total Queries' },
                { v: `${data.summary.eligibility_rate}%`,   l: 'Eligibility Rate' },
                { v: data.summary.avg_schemes_per_query,     l: 'Avg Schemes/Query' },
                { v: data.summary.total_schemes_in_db,       l: 'Schemes in DB' },
                { v: `${data.summary.scheme_coverage_pct}%`, l: 'DB Coverage' },
              ].map(k => (
                <div key={k.l} className={s.kpi}>
                  <div className={s.kv}>{k.v}</div>
                  <div className={s.kl}>{k.l}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className={s.chartsG}>
              <div className={s.cc}><div className={s.ct}>📅 Daily Queries (14 days)</div><div className={s.cw}><canvas id="an_tChart"/></div></div>
              <div className={s.cc}><div className={s.ct}>🏷️ Category Distribution</div><div className={s.cw}><canvas id="an_cChart"/></div></div>
              <div className={s.cc}><div className={s.ct}>📍 Top States</div><div className={s.cw}><canvas id="an_sChart"/></div></div>
              <div className={s.cc}><div className={s.ct}>👥 Age Groups</div><div className={s.cw}><canvas id="an_aChart"/></div></div>
            </div>

            {/* Top schemes table */}
            <div className={s.cc}>
              <div className={s.ct}>🏆 Top Matched Schemes</div>
              {data.top_schemes?.length > 0 ? (
                <div className={s.tsList}>
                  {data.top_schemes.map((sc, i) => (
                    <div key={sc.name} className={s.tsRow}>
                      <div className={s.tsRank}>{i + 1}</div>
                      <div className={s.tsName}>{sc.name.replace(/\(.*\)/, '').trim()}</div>
                      <div className={s.tsBw}>
                        <div className={s.tsB} style={{ width: `${Math.round(sc.count / data.top_schemes[0].count * 100)}%` }} />
                      </div>
                      <div className={s.tsCnt}>{sc.count}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={s.noData}>Run some queries first to see top schemes here.</div>
              )}
            </div>

            <div className={s.note}>Auto-refreshes every 30s · data from active server session</div>
          </>
        )}
      </div>
    </div>
  )
}

/* Chart builder — runs after Chart.js is loaded */
function buildCharts(Chart, data, chartsRef) {
  const destroy = (key) => { chartsRef.current[key]?.destroy() }

  // Trend line
  const tEl = document.getElementById('an_tChart')
  if (tEl) {
    destroy('t')
    chartsRef.current.t = new Chart(tEl, {
      type: 'line',
      data: {
        labels: data.daily_trend.map(x => x.label),
        datasets: [{
          data: data.daily_trend.map(x => x.count),
          borderColor: '#FF9933', backgroundColor: 'rgba(255,153,51,.1)',
          borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#FF9933',
          tension: .4, fill: true,
        }],
      },
      options: CHART_OPTS,
    })
  }

  // Category donut
  const cEl = document.getElementById('an_cChart')
  if (cEl) {
    destroy('c')
    chartsRef.current.c = new Chart(cEl, {
      type: 'doughnut',
      data: {
        labels: data.category_dist.map(x => x.category),
        datasets: [{
          data: data.category_dist.map(x => x.count),
          backgroundColor: ['#FF9933','#10B77F','#1C6ED4','#7C5CFC','#F59E0B'],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'right', labels: { color: '#8A9BBF', font: { size: 11 } } } },
      },
    })
  }

  // State bar
  const sEl = document.getElementById('an_sChart')
  if (sEl) {
    destroy('s')
    chartsRef.current.s = new Chart(sEl, {
      type: 'bar',
      data: {
        labels: (data.state_dist || []).map(x => (x.state || '').slice(0, 10)),
        datasets: [{
          data: (data.state_dist || []).map(x => x.count),
          backgroundColor: 'rgba(28,110,212,.65)', borderColor: '#1C6ED4',
          borderWidth: 1, borderRadius: 4,
        }],
      },
      options: CHART_OPTS,
    })
  }

  // Age bar
  const aEl = document.getElementById('an_aChart')
  if (aEl) {
    destroy('a')
    chartsRef.current.a = new Chart(aEl, {
      type: 'bar',
      data: {
        labels: data.age_buckets.map(x => x.bucket),
        datasets: [{
          data: data.age_buckets.map(x => x.count),
          backgroundColor: 'rgba(124,92,252,.65)', borderColor: '#7C5CFC',
          borderWidth: 1, borderRadius: 4,
        }],
      },
      options: CHART_OPTS,
    })
  }
}
