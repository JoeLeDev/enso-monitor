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

const OBSERVATIONS_PAGE_SIZE = 12

function App() {
  const [observations, setObservations] = useState<Observation[]>([])
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tablePage, setTablePage] = useState(1)

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

  const tablePageCount = Math.max(
    1,
    Math.ceil(filteredObservations.length / OBSERVATIONS_PAGE_SIZE),
  )
  const safeTablePage = Math.min(tablePage, tablePageCount)

  const pagedObservations = useMemo(() => {
    const startIndex = (safeTablePage - 1) * OBSERVATIONS_PAGE_SIZE
    return filteredObservations.slice(
      startIndex,
      startIndex + OBSERVATIONS_PAGE_SIZE,
    )
  }, [filteredObservations, safeTablePage])

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
                    onChange={(e) => {
                      setStartYear(Number(e.target.value))
                      setTablePage(1)
                    }}
                  />
                </label>
                <label>
                  Fin
                  <input
                    type="number"
                    min={startYear}
                    max={2100}
                    value={endYear}
                    onChange={(e) => {
                      setEndYear(Number(e.target.value))
                      setTablePage(1)
                    }}
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
                <>
                  <div className="observations-table-scroll">
                    <table className="observations-table">
                      <caption>
                        Observations ONI de {startYear} à {endYear}
                        {' · '}
                        {filteredObservations.length} valeur
                        {filteredObservations.length > 1 ? 's' : ''}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Année</th>
                          <th scope="col">Saison</th>
                          <th scope="col">ONI (°C)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedObservations.map((item) => (
                          <tr key={`${item.year}-${item.season}-${item.season_order}`}>
                            <td>{item.year}</td>
                            <td>{item.season}</td>
                            <td>{formatOniValue(item.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <nav
                    className="observations-pagination"
                    aria-label="Pagination des observations"
                  >
                    <button
                      type="button"
                      className="observations-pagination-button"
                      onClick={() => setTablePage((page) => Math.max(1, page - 1))}
                      disabled={safeTablePage <= 1}
                    >
                      Précédent
                    </button>
                    <p className="observations-pagination-status" aria-live="polite">
                      Page {safeTablePage} sur {tablePageCount}
                    </p>
                    <button
                      type="button"
                      className="observations-pagination-button"
                      onClick={() => setTablePage((page) => Math.min(tablePageCount, page + 1))}
                      disabled={safeTablePage >= tablePageCount}
                    >
                      Suivant
                    </button>
                  </nav>
                </>
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
