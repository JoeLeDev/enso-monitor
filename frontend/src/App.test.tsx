
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const { mockGetObservations, mockGetComparison } = vi.hoisted(() => ({
  mockGetObservations: vi.fn(),
  mockGetComparison: vi.fn(),
}))

vi.mock('./services/ensoApi', () => ({
  getObservations: mockGetObservations,
  getComparison: mockGetComparison,
}))

vi.mock('./hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  LineChart: ({ data }: { data: Array<{ period?: string }> }) => (
    <div data-testid="chart">
      {data.map((item, index) => (
        <span key={index}>{item.period}</span>
      ))}
    </div>
  ),
  CartesianGrid: () => null,
  Line: () => null,
  ReferenceLine: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Legend: () => null,
}))

describe('ENSO Monitor dashboard', () => {
  beforeEach(() => {
    mockGetObservations.mockReset()
    mockGetComparison.mockReset()

    mockGetObservations.mockResolvedValue({
      total: 3,
      observations: [
        { year: 1990, season: 'DJF', season_order: 1, value: 0.3 },
        { year: 2000, season: 'DJF', season_order: 1, value: 1.2 },
        { year: 2020, season: 'DJF', season_order: 1, value: -0.8 },
      ],
    })

    mockGetComparison.mockResolvedValue({
      period_1: {
        start_year: 1997,
        end_year: 1998,
        total: 0,
        observations: [],
      },
      period_2: {
        start_year: 2015,
        end_year: 2016,
        total: 0,
        observations: [],
      },
    })
  })

  it('actualise les observations du graphique lorsque la période change', async () => {
    render(<App />)

    await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
      })

      expect(screen.queryByText('921')).not.toBeInTheDocument()

    const charts = screen.getAllByTestId('chart')
    const historicalChart = charts[0]

    expect(historicalChart).toHaveTextContent('DJF 1990')
    expect(historicalChart).toHaveTextContent('DJF 2000')
    expect(historicalChart).toHaveTextContent('DJF 2020')

    const startYearInput = screen.getByLabelText('Début')

    fireEvent.change(startYearInput, { target: { value: '2010' } })

    await waitFor(() => {
      expect(historicalChart).not.toHaveTextContent('DJF 1990')
      expect(historicalChart).not.toHaveTextContent('DJF 2000')
      expect(historicalChart).toHaveTextContent('DJF 2020')
    })
  })

  it('met à jour le tableau accessible lorsque le filtre de période change', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Consulter les observations de la période'))

    const table = screen.getByRole('table', {
      name: /Observations ONI de 1990 à 2026/,
    })

    expect(table).toHaveTextContent('1990')
    expect(table).toHaveTextContent('DJF')
    expect(table).toHaveTextContent('+0,3')
    expect(table).toHaveTextContent('2000')
    expect(table).toHaveTextContent('+1,2')
    expect(table).toHaveTextContent('2020')
    expect(table).toHaveTextContent('-0,8')

    fireEvent.change(screen.getByLabelText('Début'), {
      target: { value: '2010' },
    })

    await waitFor(() => {
      const filteredTable = screen.getByRole('table', {
        name: /Observations ONI de 2010 à 2026/,
      })
      expect(filteredTable).toHaveTextContent('2020')
      expect(filteredTable).toHaveTextContent('-0,8')
      expect(filteredTable).not.toHaveTextContent('1990')
      expect(filteredTable).not.toHaveTextContent('+0,3')
      expect(filteredTable).not.toHaveTextContent('2000')
      expect(filteredTable).not.toHaveTextContent('+1,2')
    })
  })

  it('pagine le tableau accessible au-delà de douze observations', async () => {
    const seasons = [
      'DJF', 'JFM', 'FMA', 'MAM', 'AMJ', 'MJJ',
      'JJA', 'JAS', 'ASO', 'SON', 'OND', 'NDJ',
    ]

    mockGetObservations.mockResolvedValue({
      total: 14,
      observations: Array.from({ length: 14 }, (_, index) => ({
        year: 1990 + Math.floor(index / 12),
        season: seasons[index % 12],
        season_order: (index % 12) + 1,
        value: index === 0 ? 0.3 : index === 12 ? 1.1 : index === 13 ? -0.4 : 0.1,
      })),
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('14')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Consulter les observations de la période'))

    expect(screen.getByText('Page 1 sur 2')).toBeInTheDocument()
    expect(screen.getByRole('table')).toHaveTextContent('DJF')
    expect(screen.getByRole('table')).toHaveTextContent('+0,3')
    expect(screen.getByRole('table')).not.toHaveTextContent('+1,1')

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))

    await waitFor(() => {
      expect(screen.getByText('Page 2 sur 2')).toBeInTheDocument()
    })

    expect(screen.getByRole('table')).toHaveTextContent('+1,1')
    expect(screen.getByRole('table')).toHaveTextContent('-0,4')
    expect(screen.getByRole('table')).not.toHaveTextContent('+0,3')
  })
})
