
export interface Observation {
    year: number
    season: string
    season_order: number
    value: number
  }
  
  export interface ObservationResponse {
    total: number
    observations: Observation[]
  }
  
  export interface ComparisonPeriod extends ObservationResponse {
    start_year: number
    end_year: number
  }
  
  export interface ComparisonResponse {
    period_1: ComparisonPeriod
    period_2: ComparisonPeriod
  }
  
  async function request<T>(url: string): Promise<T> {
    const response = await fetch(url)
  
    if (!response.ok) {
      throw new Error(`Erreur API : HTTP ${response.status}`)
    }
  
    return response.json() as Promise<T>
  }
  
  export function getObservations(
    startYear?: number,
    endYear?: number,
  ): Promise<ObservationResponse> {
    const params = new URLSearchParams()
  
    if (startYear !== undefined) {
      params.set('start_year', String(startYear))
    }
  
    if (endYear !== undefined) {
      params.set('end_year', String(endYear))
    }
  
    const query = params.toString()
  
    return request<ObservationResponse>(
      `/api/v1/observations${query ? `?${query}` : ''}`,
    )
  }
  
  export function getComparison(): Promise<ComparisonResponse> {
    return request<ComparisonResponse>('/api/v1/compare')
  }
  