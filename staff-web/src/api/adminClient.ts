import axios from 'axios';
import { config } from '../config';

const API_BASE_URL = config.adminApiBaseUrl;

const adminClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

adminClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

adminClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/admin/login';
      throw new Error('Session expired. Please login again.');
    }
    
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error.message);
    }
    
    if (!error.response) {
      throw new Error('Cannot connect to server. Please check if the backend is running.');
    }
    
    throw error;
  }
);

export interface PlatformAdmin {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: PlatformAdmin;
}

export interface GymMetrics {
  totalPasses: number;
  activePasses: number;
  totalUsers: number;
  lastActivity: number | null;
}

export interface Gym {
  id: string;
  slug: string;
  name: string;
  status: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: number | null;
  plan_id: string | null;
  billing_email: string | null;
  // Business/Contact info
  company_name: string | null;
  tax_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  // Staff login
  staff_login_path: string | null;
  metrics: GymMetrics;
}

export interface DetailedMetrics {
  passesByType: Array<{ passType: string; count: number }>;
  recentActivity: Array<{ timestamp: number; action: string; userName: string }>;
}

export interface GymDetail extends Gym {
  detailedMetrics: DetailedMetrics;
}

export const adminAPI = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await axios.post<AuthResponse>(`${API_BASE_URL}/login`, { email, password });
    return response.data;
  },

  getGyms: async (search?: string, status?: string): Promise<Gym[]> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    
    const response = await adminClient.get<Gym[]>(`/gyms?${params.toString()}`);
    return response.data;
  },

  getGymById: async (id: string): Promise<GymDetail> => {
    const response = await adminClient.get<GymDetail>(`/gyms/${id}`);
    return response.data;
  },

  blockGym: async (id: string): Promise<void> => {
    await adminClient.post(`/gyms/${id}/block`);
  },

  unblockGym: async (id: string): Promise<void> => {
    await adminClient.post(`/gyms/${id}/unblock`);
  },

  deleteGym: async (id: string): Promise<void> => {
    await adminClient.post(`/gyms/${id}/delete`);
  },

  updateGymBusinessInfo: async (id: string, data: Partial<Gym>): Promise<void> => {
    await adminClient.patch(`/gyms/${id}`, data);
  },
};

export default adminClient;

