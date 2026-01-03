import axios from 'axios';
import { config } from '../config';

const API_BASE_URL = config.apiBaseUrl;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('staff_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Extract gym slug from hostname and send as header for tenant resolution
    // This is needed because the Vite proxy changes the host header
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      if (parts.length > 0 && parts[0] !== 'localhost' && !parts[0].includes(':')) {
        const gymSlug = parts[0];
        config.headers['X-Gym-Slug'] = gymSlug;
      }
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
    // Handle auth errors
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const isLoginRequest = requestUrl.includes('/auth/staff/login');
      const hasToken = localStorage.getItem('staff_token');
      
      // Only redirect if:
      // 1. It's NOT a login request (we're already authenticated but token expired)
      // 2. We have a token (session expired scenario)
      // For login attempts (no token or login endpoint), let the error propagate to LoginScreen
      if (!isLoginRequest && hasToken) {
        localStorage.removeItem('staff_token');
        localStorage.removeItem('staff_user');
        window.location.href = '/';
        throw new Error('Session expired. Please login again.');
      }
      // For login failures, don't redirect - let LoginScreen handle the error
    }
    
    if (error.response?.status === 403) {
      throw new Error('Access denied');
    }
    
    // Handle API error responses
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error.message);
    }
    
    // Handle network errors (server unreachable)
    if (!error.response) {
      throw new Error('Cannot connect to server. Please check if the backend is running.');
    }
    
    throw error;
  }
);

export default apiClient;

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: StaffUser;
}

export interface ScanResult {
  valid: boolean;
  reason?: 'NOT_FOUND' | 'EXPIRED' | 'DEPLETED' | 'REVOKED';
  pass?: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    type: {
      id: string;
      name: string;
      code: string;
    };
    validUntil: string | null;
    remainingEntries: number | null;
    status: string;
  };
  autoConsumed?: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  isBlocked?: boolean;
  createdAt?: string;
  hasActivePass?: boolean;
  activePassSummary?: {
    id: string;
    passTypeName: string;
    validUntil: string | null;
    remainingEntries: number | null;
    status: string;
  } | null;
}

export interface UserDetail {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isBlocked: boolean;
    createdAt: string;
  };
  passes: Array<{
    id: string;
    passTypeId: string;
    status: string;
    purchasedAt: string;
    validFrom: string;
    validUntil: string | null;
    totalEntries: number | null;
    remainingEntries: number | null;
    walletSerialNumber: string;
    passTypeName: string;
    passTypeCode: string;
  }>;
}

export interface PassType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  durationDays: number | null;
  totalEntries: number | null;
  price: number;
}

export interface CreateUserResponse {
  user: User;
  tempPassword: string;
}

export interface DashboardData {
  stats: {
    purchases: {
      today: number;
      week: number;
      month: number;
    };
    activePasses: number;
  };
  recentCheckIns: Array<{
    at: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    pass: {
      id: string;
      typeCode: string;
      typeName: string;
      remainingEntries: number | null;
      validUntil: string | null;
    };
  }>;
  alerts: {
    expiringSoon: Array<{
      passId: string;
      userId: string;
      userName: string;
      typeName: string;
      validUntil: string;
    }>;
    lowEntries: Array<{
      passId: string;
      userId: string;
      userName: string;
      typeName: string;
      remainingEntries: number;
    }>;
  };
}

export const staffAPI = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/staff/login', { email, password });
    return response.data;
  },

  scan: async (token: string): Promise<ScanResult> => {
    const response = await apiClient.post<ScanResult>('/staff/scan', { token });
    return response.data;
  },

  consume: async (token: string, entries = 1): Promise<{ success: boolean; remainingEntries: number }> => {
    const response = await apiClient.post('/staff/consume', { token, entries });
    return response.data;
  },

  getHistory: async (limit = 50): Promise<any[]> => {
    const response = await apiClient.get(`/staff/history?limit=${limit}`);
    return response.data;
  },

  getUsers: async (query?: string, activePassOnly?: boolean, blockedOnly?: boolean): Promise<User[]> => {
    let url = '/staff/users';
    const params = [];
    if (query) params.push(`query=${encodeURIComponent(query)}`);
    if (activePassOnly) params.push('activePassOnly=true');
    if (blockedOnly) params.push('blockedOnly=true');
    if (params.length > 0) url += '?' + params.join('&');
    
    const response = await apiClient.get<User[]>(url);
    return response.data;
  },

  getUserById: async (userId: string): Promise<UserDetail> => {
    const response = await apiClient.get<UserDetail>(`/staff/users/${userId}`);
    return response.data;
  },

  blockUser: async (userId: string): Promise<void> => {
    await apiClient.post(`/staff/users/${userId}/block`);
  },

  unblockUser: async (userId: string): Promise<void> => {
    await apiClient.post(`/staff/users/${userId}/unblock`);
  },

  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/staff/users/${userId}`);
  },

  revokePass: async (passId: string): Promise<void> => {
    await apiClient.post(`/staff/passes/${passId}/revoke`);
  },

  restorePass: async (passId: string): Promise<void> => {
    await apiClient.post(`/staff/passes/${passId}/restore`);
  },

  createUser: async (name: string, email: string): Promise<CreateUserResponse> => {
    const response = await apiClient.post<CreateUserResponse>('/staff/users', { name, email });
    return response.data;
  },

  getPassTemplates: async (): Promise<any[]> => {
    const response = await apiClient.get('/staff/passes/templates');
    return response.data;
  },

  getPassOfferings: async (): Promise<any[]> => {
    const response = await apiClient.get('/staff/passes/offerings');
    return response.data;
  },

  createPassOffering: async (offering: any): Promise<any> => {
    const response = await apiClient.post('/staff/passes/offerings', offering);
    return response.data;
  },

  updatePassOffering: async (id: string, offering: any): Promise<any> => {
    const response = await apiClient.put(`/staff/passes/offerings/${id}`, offering);
    return response.data;
  },

  getPassTypes: async (): Promise<PassType[]> => {
    const response = await apiClient.get<PassType[]>('/pass-types');
    return response.data;
  },

  assignPass: async (userId: string, passTypeId: string): Promise<any> => {
    const response = await apiClient.post('/staff/passes/assign', { userId, passTypeId });
    return response.data;
  },

  getDashboard: async (recentLimit = 10): Promise<DashboardData> => {
    const response = await apiClient.get<DashboardData>(`/staff/dashboard?recentLimit=${recentLimit}`);
    return response.data;
  },

  getGymInfo: async (): Promise<any> => {
    const response = await apiClient.get('/staff/gym-info');
    return response.data;
  },

  updateOpeningHours: async (openingHours: any): Promise<void> => {
    await apiClient.put('/staff/gym/opening-hours', { openingHours });
  },
};
