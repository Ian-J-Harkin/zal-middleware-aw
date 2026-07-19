import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { AuthManager } from './AuthManager';

export class ZalandoClient {
  private client: AxiosInstance;
  private readonly apiUrl: string;

  constructor() {
    // Falls back to Zalando Sandbox environment if not explicitly configured
    this.apiUrl = process.env.ZALANDO_API_URL || 'https://api-sandbox.merchants.zalando.com';
    
    // Explicitly configure family: 4 to force IPv4 resolution for localhost issues
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json'
      },
      family: 4 
    });

    // Add interceptor to dynamically inject the latest OAuth2 token
    this.client.interceptors.request.use(async (config) => {
      const token = await AuthManager.getToken();
      config.headers['Authorization'] = `Bearer ${token}`;
      return config;
    });

    // Configure resilient retries
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay, // Uses exponential backoff (100ms, 200ms, 400ms)
      retryCondition: (error) => {
        // Retry on network errors, 5xx server errors, or explicitly 429 Too Many Requests
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
      }
    });
  }

  /**
   * Transmits the 1:N hierarchical ArticlePayload array to the Zalando ingestion endpoint.
   */
  public async submitProducts(payload: any[]): Promise<void> {
    if (!payload || payload.length === 0) {
      console.log('[ZalandoClient] No payload provided for transmission. Aborting.');
      return;
    }

    try {
      console.log(`[ZalandoClient] Transmitting ${payload.length} hierarchical models to ${this.apiUrl}/articles...`);

      // Wraps payload per standard Zally bulk ingestion specs
      await this.client.post('/articles', { items: payload });

      console.log('[ZalandoClient] Transmission successful.');

    } catch (error: any) {
      console.error('[ZalandoClient] Payload transmission failed:', error.response?.data || error.message);
      
      // Standardize the error throw format to match our expected stack outputs
      if (error.response) {
        throw new Error(`HTTP ${error.response.status} ${error.response.statusText} - ${JSON.stringify(error.response.data)}`);
      }
      throw error; 
    }
  }

  // Exposed for testing
  public get internalClient(): AxiosInstance {
    return this.client;
  }
}
