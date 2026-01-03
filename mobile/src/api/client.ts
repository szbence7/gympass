import axios from 'axios';
import { API_BASE_URL } from './config';
import { getToken } from '../auth/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add gym slug to all requests (except public endpoints)
    try {
      const gymJson = await AsyncStorage.getItem('selectedGym');
      if (gymJson) {
        const gym = JSON.parse(gymJson);
        config.headers['X-Gym-Slug'] = gym.slug;
      }
    } catch (error) {
      console.error('Failed to get selected gym for API request:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Special handling for login endpoint - don't show "Session expired"
    const isLoginEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/staff/login');
    
    // Handle auth errors (but not for login endpoints)
    if (error.response?.status === 401 && !isLoginEndpoint) {
      throw new Error('Session expired. Please login again.');
    }
    
    if (error.response?.status === 403) {
      throw new Error('Access denied');
    }
    
    // Handle API error responses
    if (error.response?.data?.error) {
      // For login endpoints, preserve the error code so LoginScreen can handle it
      if (isLoginEndpoint) {
        const errorObj = {
          message: error.response.data.error.message,
          code: error.response.data.error.code,
        };
        const apiError = new Error(errorObj.message) as any;
        apiError.code = errorObj.code;
        apiError.response = error.response;
        throw apiError;
      }
      throw new Error(error.response.data.error.message);
    }
    
    // Handle network errors (server unreachable)
    if (!error.response) {
      throw new Error('Cannot connect to server. Please check your connection and ensure the backend is running.');
    }
    
    throw error;
  }
);

export default apiClient;

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PassType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  durationDays: number | null;
  totalEntries: number | null;
  price: number;
  active: boolean;
  // New system fields (optional for backward compatibility)
  nameHu?: string;
  nameEn?: string;
  descHu?: string;
  descEn?: string;
  behavior?: 'DURATION' | 'VISITS';
  durationValue?: number | null;
  durationUnit?: 'day' | 'week' | 'month' | null;
  visitsCount?: number | null;
  expiresInValue?: number | null;
  expiresInUnit?: 'day' | 'week' | 'month' | 'year' | null;
  neverExpires?: boolean;
}

export interface UserPass {
  id: string;
  userId: string;
  passTypeId: string;
  offeringId?: string | null;
  status: string;
  purchasedAt: string;
  validFrom: string;
  validUntil: string | null;
  totalEntries: number | null;
  remainingEntries: number | null;
  walletSerialNumber: string;
  qrTokenId: string | null;
  purchasedNameHu?: string | null;
  purchasedNameEn?: string | null;
  purchasedDescHu?: string | null;
  purchasedDescEn?: string | null;
  passType?: PassType;
  token?: {
    token: string;
  };
}

export const authAPI = {
  register: async (email: string, password: string, name: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', { email, password, name });
    return response.data;
  },
  
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    return response.data;
  },
};

export interface Features {
  appleWallet: boolean;
}

// In-memory cache for features (fetched once per app session)
let featuresCache: Features | null = null;
let featuresFetchPromise: Promise<Features> | null = null;

export const featuresAPI = {
  getFeatures: async (): Promise<Features> => {
    // Return cached value if available
    if (featuresCache) {
      return featuresCache;
    }
    
    // If fetch is already in progress, return that promise
    if (featuresFetchPromise) {
      return featuresFetchPromise;
    }
    
    // Fetch features from backend
    featuresFetchPromise = (async () => {
      try {
        // Use axios directly for public endpoint (no auth needed)
        const response = await axios.get<Features>(`${API_BASE_URL}/api/public/features`);
        featuresCache = response.data;
        return featuresCache;
      } catch (error) {
        console.error('Failed to fetch features, defaulting to disabled:', error);
        // Default to false on error
        featuresCache = { appleWallet: false };
        return featuresCache;
      } finally {
        featuresFetchPromise = null;
      }
    })();
    
    return featuresFetchPromise;
  },
};

export const passAPI = {
  getPassTypes: async (): Promise<PassType[]> => {
    const response = await apiClient.get<PassType[]>('/pass-types');
    return response.data;
  },
  
  purchasePass: async (passTypeId: string): Promise<{ pass: UserPass; token: string }> => {
    const response = await apiClient.post('/passes/purchase', { passTypeId });
    return response.data;
  },
  
  getMyPasses: async (): Promise<UserPass[]> => {
    const response = await apiClient.get<UserPass[]>('/passes/me');
    return response.data;
  },
  
  getPassById: async (id: string): Promise<UserPass> => {
    const response = await apiClient.get<UserPass>(`/passes/${id}`);
    return response.data;
  },
  
  getWalletPassUrl: (id: string, token: string): string => {
    return `${API_BASE_URL}/api/passes/${id}/wallet?token=${token}`;
  },
};
