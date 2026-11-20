import { useIsMobile } from './hooks/useIsMobile'
import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'
import {
  getComparison,
  getObservations,
  type ComparisonResponse,
  type Observation,
} from './services/ensoApi'
import './App.css'

function formatPeriod(observation: Observation) {
  return `${observation.season} ${observation.year}`
}

function formatOniValue(value: number) {
  const absolute = Math.abs(value).toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

  if (value > 0) return `+${absolute}`
  if (value < 0) return `-${absolute}`
  return absolute
}

function App() {
  const [observations, setObservations] = useState<Observation[]>([])
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  const isMobile = useIsMobile()

  const [startYear, setStartYear] = useState(
    () => window.matchMedia('(max-width: 600px)').matches ? 2016 : 1990,
  )
  const [endYear, setEndYear] = useState(2026)


  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const [history, comparisonData] = await Promise.all([
          getObservations(),
          getComparison(),
        ])

        if (!cancelled) {
          setObservations(history.observations)
          setComparison(comparisonData)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur inconnue')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredObservations = useMemo(
    () => observations.filter(
      (item) => item.year >= startYear && item.year <= endYear,
    ),
    [observations, startYear, endYear],
  )

  const chartData = useMemo(
    () => filteredObservations.map((item) => ({
      ...item,
      period: formatPeriod(item),
    })),
    [filteredObservations],
  )

  const latest = observations.at(-1)
  const minimum = filteredObservations.length
    ? Math.min(...filteredObservations.map((item) => item.value))
    : null
  const maximum = filteredObservations.length
    ? Math.max(...filteredObservations.map((item) => item.value))
    : null

  const comparisonData = useMemo(() => {
    if (!comparison) return []

    const first = comparison.period_1.observations
    const second = comparison.period_2.observations

    return Array.from({ length: Math.max(first.length, second.length) }, (_, i) => ({
      season: `S${i + 1}`,
      episode1997: first[i]?.value ?? null,
      episode2015: second[i]?.value ?? null,
    }))
  }, [comparison])

  const comparisonSummary = useMemo(() => {
    if (!comparison) return null

    const first = comparison.period_1.observations
    const second = comparison.period_2.observations

    if (!first.length || !second.length) return null

    const peak1997 = Math.max(...first.map((item) => item.value))
    const peak2015 = Math.max(...second.map((item) => item.value))

    const difference = Math.abs(peak1997 - peak2015)

    let interpretation: string

    if (difference < 0.1) {
      interpretation =
        'Les deux épisodes présentent des maxima ONI très proches.'
    } else if (peak1997 > peak2015) {
      interpretation =
        "L'épisode 1997–1998 présente un maximum ONI supérieur à celui de 2015–2016."
    } else {
      interpretation =
        "L'épisode 2015–2016 présente un maximum ONI supérieur à celui de 1997–1998."
    }

    return {
      peak1997,
      peak2015,
      interpretation,
    }
  }, [comparison])

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">NOAA · CLIMATE DATA</p>
          <h1>ENSO Monitor</h1>
          <p className="subtitle">
            Exploration historique de l'Oceanic Niño Index (ONI)
          </p>
        </div>
        <span className="source-badge">ERSSTv6 · NOAA CPC</span>
      </header>

      {loading && <p role="status">Chargement des données climatiques…</p>}

      {error && (
        <div className="error" role="alert">
          Impossible de charger les données : {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="stats">
            <article className="stat-card">
              <span>Observations</span>
              <strong>{observations.length}</strong>
              <small>Valeurs saisonnières</small>
            </article>
            <article className="stat-card">
              <span>Dernière observation</span>
              <strong>{latest?.value.toFixed(1) ?? '—'} °C</strong>
              <small>{latest ? formatPeriod(latest) : 'Aucune donnée'}</small>
            </article>
            <article className="stat-card">
              <span>Minimum sélectionné</span>
              <strong>{minimum?.toFixed(1) ?? '—'} °C</strong>
              <small>Sur la période filtrée</small>
            </article>
            <article className="stat-card">
              <span>Maximum sélectionné</span>
              <strong>{maximum?.toFixed(1) ?? '—'} °C</strong>
              <small>Sur la période filtrée</small>
            </article>
          </section>

          <section className="chart-card">
            <div className="section-heading">
              <div>
                <h2>Évolution historique de l'ONI</h2>
                <p>Température de surface de la mer · anomalie en °C</p>
              </div>
              <div className="filters">
                <label>
                  Début
                  <input
                    type="number"
                    min={1950}
                    max={endYear}
                    value={startYear}
                    onChange={(e) => setStartYear(Number(e.target.value))}
                  />
                </label>
                <label>
                  Fin
                  <input
                    type="number"
                    min={startYear}
                    max={2100}
                    value={endYear}
                    onChange={(e) => setEndYear(Number(e.target.value))}
                  />
                </label>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="period"
                    minTickGap={isMobile ? 55 : 65}
                    tick={{ fontSize: isMobile ? 10 : 11 }}
                    tickFormatter={(value: string) => value.split(' ').at(-1) ?? value}
                    tickLine={false}
                  />
                  <YAxis domain={[-3, 3]} tick={{ fontSize: 12 }} unit="°" />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toFixed(1)} °C`, 'ONI']}
                    labelFormatter={(label) => String(label)}
                  />
                  <ReferenceLine y={0} stroke="#64748b" />
                  <ReferenceLine y={0.5} stroke="#e87936" strokeDasharray="5 5" />
                  <ReferenceLine y={-0.5} stroke="#2563eb" strokeDasharray="5 5" />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="ONI"
                    stroke="#0f766e"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="chart-note">
              Les seuils ±0,5 °C servent de repères ; une saison isolée ne
              suffit pas à confirmer un épisode ENSO.
            </p>

            <details className="observations-table-panel">
              <summary>Consulter les observations de la période</summary>
              {filteredObservations.length === 0 ? (
                <p className="observations-table-empty">
                  Aucune observation pour cette période
                </p>
              ) : (
                <div className="observations-table-scroll">
                  <table className="observations-table">
                    <caption>
                      Observations ONI de {startYear} à {endYear}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Année</th>
                        <th scope="col">Saison</th>
                        <th scope="col">ONI (°C)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredObservations.map((item) => (
                        <tr key={`${item.year}-${item.season}-${item.season_order}`}>
                          <td>{item.year}</td>
                          <td>{item.season}</td>
                          <td>{formatOniValue(item.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </details>
          </section>

          <section className="chart-card">
            <div className="section-heading">
              <div>
                <h2>Comparaison des épisodes El Niño</h2>
                <p>1997–1998 et 2015–2016 · valeurs ONI saisonnières</p>
              </div>
            </div>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="season"
                    interval={isMobile ? 5 : 2}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis domain={[-3, 3]} unit="°" />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={0} stroke="#64748b" />
                  <Line
                    type="monotone"
                    dataKey="episode1997"
                    name="1997–1998"
                    stroke="#ea580c"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="episode2015"
                    name="2015–2016"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="chart-note">
              Les courbes sont alignées par position dans chaque période,
              pour comparer leur évolution respective.
            </p>

            {comparisonSummary && (
              <div className="scientific-analysis">
                <h3>Interprétation des épisodes El Niño</h3>

                <p>
                  Les épisodes de 1997–1998 et 2015–2016 présentent
                  des anomalies positives importantes de température
                  de surface de la mer dans la région Niño 3.4.
                </p>

                <p>
                  Le maximum ONI observé sur la période 1997–1998 est de{' '}
                  <strong>{comparisonSummary.peak1997.toFixed(1)} °C</strong>,
                  contre{' '}
                  <strong>{comparisonSummary.peak2015.toFixed(1)} °C</strong>{' '}
                  pour 2015–2016.
                  {' '}{comparisonSummary.interpretation}
                </p>

                <p>
                  Cette comparaison permet d'observer les différences
                  d'intensité et d'évolution saisonnière entre les deux
                  périodes. Cependant, l'ONI repose sur des moyennes
                  glissantes de trois mois : les observations successives
                  ne sont donc pas indépendantes.
                </p>

                <p className="analysis-disclaimer">
                  Cette analyse est descriptive et limitée aux périodes
                  sélectionnées. Elle ne permet pas, à elle seule,
                  de prévoir les futurs épisodes ENSO ni d'en déduire
                  directement leurs impacts climatiques régionaux.
                </p>
              </div>
            )}
          </section>

          <footer className="footer">
            Source : NOAA Climate Prediction Center · ONI ERSSTv6
          </footer>
        </>
      )}
    </main>
  )
}

export default App
