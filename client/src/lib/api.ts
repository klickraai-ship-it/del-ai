interface ApiOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private async handleResponse(response: Response) {
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/';
      throw new Error('Unauthorized - redirecting to login');
    }

    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({ message: 'Forbidden' }));
      
      // Handle demo expiry
      if (errorData.code === 'DEMO_EXPIRED') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.setItem('demoExpired', 'true');
        window.location.href = '/';
        throw new Error('Demo period expired - please upgrade to continue');
      }
      
      throw new Error(errorData.message || 'Forbidden');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const apiBaseUrl = (import.meta.env && (import.meta as any).env.VITE_API_URL) || window.location.origin;
    const url = new URL(endpoint, apiBaseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    return url.toString();
  }

  async request(endpoint: string, options: ApiOptions = {}): Promise<any> {
    const { params, headers, ...fetchOptions } = options;
    const token = this.getToken();

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const url = this.buildUrl(endpoint, params);

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    });

    return this.handleResponse(response);
  }

  async get(endpoint: string, params?: Record<string, string | number | boolean>): Promise<any> {
    return this.request(endpoint, { method: 'GET', params });
  }

  async post(endpoint: string, data?: any): Promise<any> {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint: string, data?: any): Promise<any> {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'DELETE' });
  }

  async patch(endpoint: string, data?: any): Promise<any> {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
