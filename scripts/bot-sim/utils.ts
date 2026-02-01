export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomDelay(min: number, max: number): Promise<void> {
  return sleep(randomInt(min, max));
}

export function sample<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function weightedRandom(weights: Record<string, number>): string {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let random = Math.random() * total;

  for (const [key, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      return key;
    }
  }

  return Object.keys(weights)[0];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ApiClient {
  constructor(private baseUrl: string) {}

  async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${path}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json() as T;

      if (!response.ok) {
        return {
          success: false,
          error: (data as { error?: string }).error || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async get<T>(path: string, apiKey?: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'GET',
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
    });
  }

  async post<T>(
    path: string,
    body?: unknown,
    apiKey?: string
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
    });
  }
}
