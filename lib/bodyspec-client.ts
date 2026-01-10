/**
 * Bodyspec API Client
 * Handles all interactions with the Bodyspec API v1 using OAuth Bearer token authentication
 *
 * API Documentation: https://app.bodyspec.com/docs
 */

import { BodyspecScanData, RegionalData } from './types';

const BODYSPEC_API_BASE = 'https://app.bodyspec.com';

export interface BodyspecAPIError {
  message: string;
  status?: number;
  details?: unknown;
}

export interface UserInfo {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface Location {
  location_id: string;
  name: string;
  location_type: string;
}

export interface Service {
  name: string;
  description: string;
}

export interface BodyspecAppt {
  appt_id: string;
  start_time: string;
  duration_minutes: number;
  location: Location;
  service: Service;
  status: string;
  reserve_time?: string;
}

export interface ApptListResponse {
  appts: BodyspecAppt[];
  pagination: {
    page: number;
    page_size: number;
    has_more: boolean;
  };
}

export interface ResultSummary {
  result_id: string;
  start_time: string;
  location: Location;
  service: Service;
  create_time: string;
  update_time: string;
}

export interface ResultsListResponse {
  results: ResultSummary[];
  pagination: {
    page: number;
    page_size: number;
    has_more: boolean;
  };
}

export interface DexaComposition {
  result_id: string;
  total: {
    fat_mass_kg: number;
    lean_mass_kg: number;
    bone_mass_kg: number;
    total_mass_kg: number;
    tissue_fat_pct: number;
    region_fat_pct: number;
  };
  regions: Record<string, {
    fat_mass_kg: number;
    lean_mass_kg: number;
    bone_mass_kg: number;
    total_mass_kg: number;
    tissue_fat_pct: number;
    region_fat_pct: number;
  }>;
  android_gynoid_ratio?: number;
}

export interface DexaBoneDensity {
  result_id: string;
  total: {
    bone_mineral_density: number;
    bone_area_cm2: number;
    bone_mineral_content_g: number;
  };
}

export interface DexaVisceralFat {
  result_id: string;
  vat_mass_kg: number;
  vat_volume_cm3: number;
}

// Legacy interface for compatibility with existing code
export interface Appointment {
  id: string;
  date: string;
  location: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  scanData?: BodyspecScanData;
}

export interface AppointmentListResponse {
  appointments: Appointment[];
  total: number;
}

/**
 * Bodyspec API Client
 * All methods are async and throw BodyspecAPIError on failure
 */
export class BodyspecClient {
  private accessToken: string;
  private baseUrl: string;

  constructor(accessToken: string, baseUrl: string = BODYSPEC_API_BASE) {
    this.accessToken = accessToken;
    this.baseUrl = baseUrl;
  }

  /**
   * Make an authenticated request to the Bodyspec API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;

        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.detail || errorJson.message || errorMessage;
        } catch {
          // If error body is not JSON, use the raw text
          if (errorBody) {
            errorMessage = errorBody;
          }
        }

        throw {
          message: errorMessage,
          status: response.status,
          details: errorBody,
        } as BodyspecAPIError;
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      if ((error as BodyspecAPIError).message) {
        throw error;
      }

      throw {
        message: `Network error: ${(error as Error).message}`,
        details: error,
      } as BodyspecAPIError;
    }
  }

  /**
   * Validate the access token by making a test API call
   * Returns true if token is valid, throws error otherwise
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getUserInfo();
      return true;
    } catch (error) {
      const apiError = error as BodyspecAPIError;
      if (apiError.status === 401 || apiError.status === 403) {
        throw {
          message: 'Invalid or expired access token',
          status: apiError.status,
        } as BodyspecAPIError;
      }
      throw error;
    }
  }

  /**
   * Get API information and version
   */
  async getApiInfo(): Promise<{ version: string; status: string }> {
    return this.request('/api/info');
  }

  /**
   * Check API health status
   */
  async healthCheck(): Promise<{ status: string }> {
    return this.request('/health');
  }

  /**
   * Get current user profile information
   */
  async getUserInfo(): Promise<UserInfo> {
    return this.request('/api/v1/users/me');
  }

  /**
   * List user appointments with optional filtering
   */
  async listAppts(filters?: {
    page?: number;
    page_size?: number;
    status?: string;
    sort_order?: 'newest_first' | 'oldest_first';
  }): Promise<ApptListResponse> {
    const queryParams = new URLSearchParams();

    if (filters) {
      if (filters.page) queryParams.set('page', filters.page.toString());
      if (filters.page_size) queryParams.set('page_size', filters.page_size.toString());
      if (filters.status) queryParams.set('status', filters.status);
      if (filters.sort_order) queryParams.set('sort_order', filters.sort_order);
    }

    const queryString = queryParams.toString();
    const endpoint = `/api/v1/users/me/appts${queryString ? `?${queryString}` : ''}`;

    return this.request<ApptListResponse>(endpoint);
  }

  /**
   * List user results (DEXA scans)
   */
  async listResults(filters?: {
    page?: number;
    page_size?: number;
  }): Promise<ResultsListResponse> {
    const queryParams = new URLSearchParams();

    if (filters) {
      if (filters.page) queryParams.set('page', filters.page.toString());
      if (filters.page_size) queryParams.set('page_size', filters.page_size.toString());
    }

    const queryString = queryParams.toString();
    const endpoint = `/api/v1/users/me/results/${queryString ? `?${queryString}` : ''}`;

    return this.request<ResultsListResponse>(endpoint);
  }

  /**
   * Get DEXA body composition data for a result
   */
  async getDexaComposition(resultId: string): Promise<DexaComposition> {
    return this.request(`/api/v1/users/me/results/${resultId}/dexa/composition`);
  }

  /**
   * Get DEXA bone density data for a result
   */
  async getDexaBoneDensity(resultId: string): Promise<DexaBoneDensity> {
    return this.request(`/api/v1/users/me/results/${resultId}/dexa/bone-density`);
  }

  /**
   * Get DEXA visceral fat data for a result
   */
  async getDexaVisceralFat(resultId: string): Promise<DexaVisceralFat> {
    return this.request(`/api/v1/users/me/results/${resultId}/dexa/visceral-fat`);
  }

  /**
   * Convert API response to our internal scan data format
   */
  private convertToScanData(
    composition: DexaComposition,
    visceral?: DexaVisceralFat,
    boneDensity?: DexaBoneDensity
  ): BodyspecScanData {
    const kgToLb = 2.20462;

    const convertRegion = (region: DexaComposition['regions'][string]): RegionalData => ({
      fat: region.fat_mass_kg * kgToLb,
      lean: region.lean_mass_kg * kgToLb,
      bmd: undefined, // BMD is per-region in bone density endpoint, not composition
    });

    return {
      bodyFatPercentage: composition.total.tissue_fat_pct,
      totalBodyFat: composition.total.fat_mass_kg * kgToLb,
      leanBodyMass: composition.total.lean_mass_kg * kgToLb,
      boneMineralDensity: boneDensity?.total.bone_mineral_density ?? 0,
      visceralAdiposeTissue: visceral?.vat_volume_cm3 ?? 0,
      weight: composition.total.total_mass_kg * kgToLb,
      regional: {
        leftArm: convertRegion(composition.regions.left_arm || { fat_mass_kg: 0, lean_mass_kg: 0, bone_mass_kg: 0, total_mass_kg: 0, tissue_fat_pct: 0, region_fat_pct: 0 }),
        rightArm: convertRegion(composition.regions.right_arm || { fat_mass_kg: 0, lean_mass_kg: 0, bone_mass_kg: 0, total_mass_kg: 0, tissue_fat_pct: 0, region_fat_pct: 0 }),
        trunk: convertRegion(composition.regions.trunk || { fat_mass_kg: 0, lean_mass_kg: 0, bone_mass_kg: 0, total_mass_kg: 0, tissue_fat_pct: 0, region_fat_pct: 0 }),
        leftLeg: convertRegion(composition.regions.left_leg || { fat_mass_kg: 0, lean_mass_kg: 0, bone_mass_kg: 0, total_mass_kg: 0, tissue_fat_pct: 0, region_fat_pct: 0 }),
        rightLeg: convertRegion(composition.regions.right_leg || { fat_mass_kg: 0, lean_mass_kg: 0, bone_mass_kg: 0, total_mass_kg: 0, tissue_fat_pct: 0, region_fat_pct: 0 }),
      },
      androidGynoidRatio: composition.android_gynoid_ratio,
      boneMineralContent: boneDensity?.total.bone_mineral_content_g,
    };
  }

  /**
   * Fetch all completed scans with full data
   * This is useful for initial sync or bulk import
   */
  async fetchAllScans(options?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Appointment[]> {
    // Get all results
    const resultsResponse = await this.listResults({ page_size: 100 });
    const appointments: Appointment[] = [];

    for (const result of resultsResponse.results) {
      try {
        // Fetch composition data (required)
        const composition = await this.getDexaComposition(result.result_id);

        // Try to get additional data (optional)
        let visceral: DexaVisceralFat | undefined;
        let boneDensity: DexaBoneDensity | undefined;

        try {
          visceral = await this.getDexaVisceralFat(result.result_id);
        } catch {
          // Visceral fat data not available for this scan
        }

        try {
          boneDensity = await this.getDexaBoneDensity(result.result_id);
        } catch {
          // Bone density data not available for this scan
        }

        const scanData = this.convertToScanData(composition, visceral, boneDensity);

        appointments.push({
          id: result.result_id,
          date: result.start_time,
          location: result.location.name,
          status: 'completed',
          scanData,
        });
      } catch (error) {
        console.error(`Failed to fetch scan data for result ${result.result_id}:`, error);
        // Skip this result and continue with others
      }
    }

    return appointments;
  }

  /**
   * Fetch the most recent scan with full data
   */
  async fetchLatestScan(): Promise<Appointment | null> {
    const scans = await this.fetchAllScans();
    return scans.length > 0 ? scans[0] : null;
  }

  // Legacy methods for backward compatibility
  async listAppointments(filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<AppointmentListResponse> {
    const scans = await this.fetchAllScans({
      startDate: filters?.startDate,
      endDate: filters?.endDate,
    });

    return {
      appointments: scans,
      total: scans.length,
    };
  }
}

/**
 * Create a new Bodyspec API client instance
 */
export function createBodyspecClient(accessToken: string): BodyspecClient {
  return new BodyspecClient(accessToken);
}

/**
 * Test if a token is valid without saving it
 */
export async function testBodyspecToken(accessToken: string): Promise<{
  valid: boolean;
  error?: string;
  userInfo?: UserInfo;
}> {
  try {
    const client = new BodyspecClient(accessToken);
    await client.validateToken();
    const userInfo = await client.getUserInfo();

    return {
      valid: true,
      userInfo,
    };
  } catch (error) {
    const apiError = error as BodyspecAPIError;
    return {
      valid: false,
      error: apiError.message || 'Unknown error validating token',
    };
  }
}
