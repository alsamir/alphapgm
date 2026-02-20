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

interface AuthTokenResponse {
  accessToken?: string;
  tokens?: { accessToken: string };
  user?: any;
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
  async login(email: string, password: string, turnstileToken?: string) {
    return this.request<AuthTokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, turnstileToken }),
    });
  }

  async register(data: { email: string; username: string; password: string; firstName?: string; lastName?: string; name?: string; phone?: string; turnstileToken?: string }) {
    return this.request<AuthTokenResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshToken() {
    return this.request<AuthTokenResponse>('/auth/refresh', {
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

  async getConverterPreview(id: number) {
    return this.request<any>(`/converters/${id}/preview`);
  }

  async getBrands(token?: string) {
    return this.request<{ name: string; count: number; brandImage?: string | null }[]>('/converters/brands', { token });
  }

  async createConverter(data: any, token: string) {
    return this.request<any>('/converters', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async updateConverter(id: number, data: any, token: string) {
    return this.request<any>(`/converters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  }

  async deleteConverter(id: number, token: string) {
    return this.request<any>(`/converters/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  async importConverters(records: any[], token: string) {
    return this.request<any>('/converters/import', {
      method: 'POST',
      body: JSON.stringify({ records }),
      token,
    });
  }

  // Pricing
  async getMetalPrices() {
    return this.request<any[]>('/pricing/metals');
  }

  async getRecoveryPercentages(token: string) {
    return this.request<{ pt: number; pd: number; rh: number }>('/pricing/percentage', { token });
  }

  async updateRecoveryPercentages(data: { pt: number; pd: number; rh: number }, token: string) {
    return this.request<any>('/pricing/percentage', {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  }

  async updateMetalPrice(metalId: number, price: number, token: string) {
    return this.request<any>(`/pricing/metals/${metalId}`, {
      method: 'PUT',
      body: JSON.stringify({ price }),
      token,
    });
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
  async sendAiMessage(message: string, chatId: number | undefined, token: string, locale?: string) {
    return this.request<any>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, chatId, locale }),
      token,
    });
  }

  async identifyConverterByImage(file: File, message: string | undefined, token: string, locale?: string) {
    const formData = new FormData();
    formData.append('image', file);
    if (message) formData.append('message', message);
    if (locale) formData.append('locale', locale);

    const res = await fetch(`${this.baseUrl}/api/v1/ai/identify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Image identification failed');
    return data as ApiResponse<any>;
  }

  async getAiHistory(token: string) {
    return this.request<any[]>('/ai/history', { token });
  }

  async getAiChat(chatId: number, token: string) {
    return this.request<any>(`/ai/chat/${chatId}`, { token });
  }

  async createCreditTopup(quantity: number, token: string) {
    return this.request<{ url: string }>('/credits/topup', {
      method: 'POST',
      body: JSON.stringify({ quantity }),
      token,
    });
  }

  // Admin - Converters (full data with pt/pd/rh)
  async adminSearchConverters(params: Record<string, any>, token: string) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, String(value));
      }
    });
    return this.request<{ data: any[]; page: number; limit: number; hasMore: boolean; total: number }>(
      `/admin/converters?${query.toString()}`,
      { token },
    );
  }

  // Admin - Credits
  async getAdminCreditStats(token: string) {
    return this.request<any>('/admin/credits/stats', { token });
  }

  async getAdminCreditLedger(params: Record<string, any>, token: string) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, String(value));
      }
    });
    return this.request<any>(`/admin/credits/ledger?${query.toString()}`, { token });
  }

  async adjustUserCredits(data: { userId: number; amount: number; reason: string }, token: string) {
    return this.request<any>('/admin/credits/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
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

  async updateUserRole(userId: number, roleId: number, token: string) {
    return this.request<any>(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ roleId }),
      token,
    });
  }

  async updateUserStatus(userId: number, statusId: number, token: string) {
    return this.request<any>(`/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ statusId }),
      token,
    });
  }

  // Admin - Password Reset
  async resetUserPassword(userId: number, password: string | undefined, token: string) {
    return this.request<{ temporaryPassword: string }>(`/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
      token,
    });
  }

  // Admin - User History
  async getUserHistory(userId: number, token: string) {
    return this.request<any>(`/admin/users/${userId}/history`, { token });
  }

  // Price Lists
  async getPriceLists(token: string) {
    return this.request<any[]>('/pricelists', { token });
  }

  async getPriceList(id: number, token: string) {
    return this.request<any>(`/pricelists/${id}`, { token });
  }

  async createPriceList(name: string, token: string) {
    return this.request<any>('/pricelists', {
      method: 'POST',
      body: JSON.stringify({ name }),
      token,
    });
  }

  async deletePriceList(id: number, token: string) {
    return this.request<any>(`/pricelists/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  async addPriceListItem(priceListId: number, converterId: number, quantity: number, token: string) {
    return this.request<any>(`/pricelists/${priceListId}/items`, {
      method: 'POST',
      body: JSON.stringify({ converterId, quantity }),
      token,
    });
  }

  async updatePriceListItemQuantity(priceListId: number, itemId: number, quantity: number, token: string) {
    return this.request<any>(`/pricelists/${priceListId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
      token,
    });
  }

  async removePriceListItem(priceListId: number, itemId: number, token: string) {
    return this.request<any>(`/pricelists/${priceListId}/items/${itemId}`, {
      method: 'DELETE',
      token,
    });
  }

  async exportPriceList(priceListId: number, token: string) {
    // Returns raw response for PDF download
    const response = await fetch(`${this.baseUrl}/api/v1/pricelists/${priceListId}/export`, {
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include',
    });
    if (!response.ok) throw new ApiError('Export failed', response.status);
    return response.blob();
  }

  // Admin - User Discount
  async updateUserDiscount(userId: number, discount: number, token: string) {
    return this.request<any>(`/admin/users/${userId}/discount`, {
      method: 'PUT',
      body: JSON.stringify({ discount }),
      token,
    });
  }

  // Admin - User Price Lists
  async getAdminUserPriceLists(userId: number, token: string) {
    return this.request<any[]>(`/admin/users/${userId}/pricelists`, { token });
  }

  // Admin - Analytics
  async getAdminTopConverters(token: string, limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<any[]>(`/admin/analytics/top-converters${query}`, { token });
  }

  async getAdminSearchVolume(token: string, days?: number) {
    const query = days ? `?days=${days}` : '';
    return this.request<any[]>(`/admin/analytics/search-volume${query}`, { token });
  }

  async getAdminActiveUsers(token: string, limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<any[]>(`/admin/analytics/active-users${query}`, { token });
  }

  async adminRequest(endpoint: string, token: string) {
    return this.request<any>(endpoint, { token });
  }

  // Email verification
  async verifyEmail(verificationToken: string) {
    return this.request<any>(`/auth/verify-email?token=${encodeURIComponent(verificationToken)}`);
  }

  // Site Settings (public)
  async getSiteSettings() {
    return this.request<Record<string, string>>('/settings');
  }

  async updateSiteSettings(data: Record<string, string>, token: string) {
    return this.request<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  }

  // Admin - Image suggestions
  async getImageSuggestions(params: Record<string, any>, token: string) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, String(value));
      }
    });
    return this.request<any>(`/admin/image-suggestions?${query.toString()}`, { token });
  }

  async approveImageSuggestion(id: number, token: string) {
    return this.request<any>(`/admin/image-suggestions/${id}/approve`, {
      method: 'POST',
      token,
    });
  }

  async rejectImageSuggestion(id: number, token: string) {
    return this.request<any>(`/admin/image-suggestions/${id}/reject`, {
      method: 'POST',
      token,
    });
  }

  // Admin - User CRUD
  async createAdminUser(data: any, token: string) {
    return this.request<any>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async updateAdminUser(userId: number, data: any, token: string) {
    return this.request<any>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  }

  async deleteAdminUser(userId: number, token: string) {
    return this.request<any>(`/admin/users/${userId}`, {
      method: 'DELETE',
      token,
    });
  }

  // Admin - Groups
  async getGroups(token: string) {
    return this.request<any[]>('/admin/groups', { token });
  }

  async createGroup(data: { name: string; description?: string; color?: string }, token: string) {
    return this.request<any>('/admin/groups', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async updateGroup(id: number, data: { name?: string; description?: string; color?: string }, token: string) {
    return this.request<any>(`/admin/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  }

  async deleteGroup(id: number, token: string) {
    return this.request<any>(`/admin/groups/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  async addGroupMembers(groupId: number, userIds: number[], token: string) {
    return this.request<any>(`/admin/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
      token,
    });
  }

  async removeGroupMembers(groupId: number, userIds: number[], token: string) {
    return this.request<any>(`/admin/groups/${groupId}/members`, {
      method: 'DELETE',
      body: JSON.stringify({ userIds }),
      token,
    });
  }

  async getGroupMembers(groupId: number, token: string) {
    return this.request<any[]>(`/admin/groups/${groupId}/members`, { token });
  }

  // Admin - Messages
  async sendAdminMessage(data: any, token: string) {
    return this.request<any>('/admin/messages/send', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async getAdminMessages(params: Record<string, any>, token: string) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, String(value));
      }
    });
    return this.request<any>(`/admin/messages?${query.toString()}`, { token });
  }

  async getAdminMessage(id: number, token: string) {
    return this.request<any>(`/admin/messages/${id}`, { token });
  }

  // Admin - Upload converter image
  async uploadConverterImage(file: File, token: string) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${this.baseUrl}/api/v1/images/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new ApiError(data.message || 'Upload failed', response.status, data);
    return data as { success: boolean; data: { url: string } };
  }

  // Image suggestions (user)
  async suggestImage(converterId: number, file: File, token: string) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`${this.baseUrl}/api/v1/images/${converterId}/suggest`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
      credentials: 'include',
    });
    if (!response.ok) throw new ApiError('Upload failed', response.status);
    return response.json();
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
