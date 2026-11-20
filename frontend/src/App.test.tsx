
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
})
