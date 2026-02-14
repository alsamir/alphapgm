const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiOptions extends RequestInit {
  token?: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    const { token, ...fetchOptions } = options;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
      ...fetchOptions,
      headers,
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(data.message || 'Request failed', response.status, data);
    }

    return data;
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ accessToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: { email: string; username: string; password: string; name?: string; phone?: string }) {
    return this.request<{ accessToken: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshToken() {
    return this.request<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
    });
  }

  async getMe(token: string) {
    return this.request<any>('/auth/me', { token });
  }

  // Converters
  async searchConverters(params: Record<string, any>, token?: string) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, String(value));
      }
    });
    return this.request<{ data: any[]; page: number; limit: number; hasMore: boolean }>(
      `/converters?${query.toString()}`,
      { token },
    );
  }

  async getConverter(id: number, token: string) {
    return this.request<any>(`/converters/${id}`, { token });
  }

  async getBrands(token?: string) {
    return this.request<{ brand: string; count: number }[]>('/converters/brands', { token });
  }

  // Pricing
  async getMetalPrices() {
    return this.request<any[]>('/pricing/metals');
  }

  // Subscriptions
  async getPlans() {
    return this.request<any[]>('/subscriptions/plans');
  }

  async getCurrentSubscription(token: string) {
    return this.request<any>('/subscriptions/current', { token });
  }

  async createCheckout(planSlug: string, token: string) {
    return this.request<{ url: string }>('/subscriptions/checkout', {
      method: 'POST',
      body: JSON.stringify({ planSlug }),
      token,
    });
  }

  // Credits
  async getCreditBalance(token: string) {
    return this.request<any>('/credits/balance', { token });
  }

  async getCreditLedger(token: string, page?: number) {
    const query = page ? `?page=${page}` : '';
    return this.request<any>(`/credits/ledger${query}`, { token });
  }

  // Users
  async getProfile(token: string) {
    return this.request<any>('/users/profile', { token });
  }

  async updateProfile(data: any, token: string) {
    return this.request<any>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  }

  async updateSettings(data: any, token: string) {
    return this.request<any>('/users/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  }

  // AI
  async sendAiMessage(message: string, chatId: number | undefined, token: string) {
    return this.request<any>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, chatId }),
      token,
    });
  }

  async getAiHistory(token: string) {
    return this.request<any[]>('/ai/history', { token });
  }

  // Admin
  async getAdminDashboard(token: string) {
    return this.request<any>('/admin/dashboard', { token });
  }

  async getAdminRevenue(token: string) {
    return this.request<any>('/admin/revenue', { token });
  }

  async listUsers(params: Record<string, any>, token: string) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) query.set(key, String(value));
    });
    return this.request<any>(`/users?${query.toString()}`, { token });
  }
}

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const api = new ApiClient(API_BASE);
