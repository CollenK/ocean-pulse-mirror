/**
 * Data Service Client
 * Client for communicating with the Python backend data service
 */

const DATA_SERVICE_URL = process.env.NEXT_PUBLIC_DATA_SERVICE_URL || 'http://localhost:8000';

export interface HealthScoreResponse {
  mpa_id: string;
  name: string;
  overall_score: number;
  confidence: 'high' | 'medium' | 'low';
  components: {
    biodiversity: number;
    water_quality: number;
    thermal_stress: number;
    productivity: number;
  };
  environmental_data: EnvironmentalDataResponse | null;
  species_data: SpeciesDataResponse | null;
  calculated_at: string;
}

export interface EnvironmentalDataResponse {
  mpa_id: string;
  sea_surface_temperature: {
    value: number;
    unit: string;
    trend: string | null;
    anomaly: number | null;
  } | null;
  chlorophyll: {
    value: number;
    unit: string;
    trend: string | null;
  } | null;
  dissolved_oxygen: {
    value: number;
    unit: string;
  } | null;
  ph: {
    value: number;
    unit: string;
  } | null;
  salinity: {
    value: number;
    unit: string;
  } | null;
  fetched_at: string;
}

export interface SpeciesDataResponse {
  mpa_id: string;
  total_species: number;
  total_records: number;
  biodiversity_index: number;
  top_species: Array<{
    scientific_name: string;
    common_name: string | null;
    records: number;
    phylum: string | null;
  }>;
  fetched_at: string;
}

export interface SSTTimeseriesResponse {
  mpa_id: string;
  timeseries: Array<{
    date: string;
    value: number;
  }>;
}

export interface SpeciesListResponse {
  species: Array<{
    scientific_name: string;
    common_name: string | null;
    records: number;
    phylum: string | null;
    class: string | null;
    family: string | null;
    conservation_status: string | null;
  }>;
  total: number;
}

class DataServiceClient {
  private baseUrl: string;
  private apiPrefix: string = '/api/v1';

  constructor() {
    this.baseUrl = DATA_SERVICE_URL;
  }

  /**
   * Get comprehensive health score for an MPA
   */
  async getHealthScore(params: {
    mpaId: string;
    name: string;
    lat: number;
    lon: number;
  }): Promise<HealthScoreResponse> {
    const url = new URL(`${this.baseUrl}${this.apiPrefix}/health/${params.mpaId}`);
    url.searchParams.set('name', params.name);
    url.searchParams.set('lat', params.lat.toString());
    url.searchParams.set('lon', params.lon.toString());

    const res = await fetch(url.toString());
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to fetch health score');
    }
    return res.json();
  }

  /**
   * Get environmental data from Copernicus for an MPA location
   */
  async getEnvironmentalData(params: {
    mpaId: string;
    lat: number;
    lon: number;
  }): Promise<EnvironmentalDataResponse> {
    const url = new URL(`${this.baseUrl}${this.apiPrefix}/environmental/${params.mpaId}`);
    url.searchParams.set('lat', params.lat.toString());
    url.searchParams.set('lon', params.lon.toString());

    const res = await fetch(url.toString());
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to fetch environmental data');
    }
    return res.json();
  }

  /**
   * Get species biodiversity data from OBIS for an MPA location
   */
  async getSpeciesData(params: {
    mpaId: string;
    lat: number;
    lon: number;
    radiusKm?: number;
  }): Promise<SpeciesDataResponse> {
    const url = new URL(`${this.baseUrl}${this.apiPrefix}/species/${params.mpaId}`);
    url.searchParams.set('lat', params.lat.toString());
    url.searchParams.set('lon', params.lon.toString());
    if (params.radiusKm) {
      url.searchParams.set('radius_km', params.radiusKm.toString());
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to fetch species data');
    }
    return res.json();
  }

  /**
   * Get list of species observed near an MPA
   */
  async getSpeciesList(params: {
    mpaId: string;
    lat: number;
    lon: number;
    radiusKm?: number;
    limit?: number;
  }): Promise<SpeciesListResponse> {
    const url = new URL(`${this.baseUrl}${this.apiPrefix}/species/${params.mpaId}/list`);
    url.searchParams.set('lat', params.lat.toString());
    url.searchParams.set('lon', params.lon.toString());
    if (params.radiusKm) {
      url.searchParams.set('radius_km', params.radiusKm.toString());
    }
    if (params.limit) {
      url.searchParams.set('limit', params.limit.toString());
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to fetch species list');
    }
    return res.json();
  }

  /**
   * Get sea surface temperature time series
   */
  async getSSTTimeseries(params: {
    mpaId: string;
    lat: number;
    lon: number;
    days?: number;
  }): Promise<SSTTimeseriesResponse> {
    const url = new URL(`${this.baseUrl}${this.apiPrefix}/sst/${params.mpaId}/timeseries`);
    url.searchParams.set('lat', params.lat.toString());
    url.searchParams.set('lon', params.lon.toString());
    if (params.days) {
      url.searchParams.set('days', params.days.toString());
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to fetch SST timeseries');
    }
    return res.json();
  }

  /**
   * Check if the data service is healthy
   */
  async healthCheck(): Promise<{ status: string; service: string }> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) {
      throw new Error('Data service is unavailable');
    }
    return res.json();
  }
}

// Export singleton instance
export const dataService = new DataServiceClient();
