import { AuthManager } from './AuthManager';

export class ZalandoClient {
  private readonly apiUrl: string;

  constructor() {
    // Falls back to Zalando Sandbox environment if not explicitly configured
    this.apiUrl = process.env.ZALANDO_API_URL || 'https://api-sandbox.merchants.zalando.com';
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
      const token = await AuthManager.getToken();

      console.log(`[ZalandoClient] Transmitting ${payload.length} hierarchical models to ${this.apiUrl}/articles...`);

      const response = await fetch(`${this.apiUrl}/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: payload }) // Wraps payload per standard Zally bulk ingestion specs
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log('[ZalandoClient] Transmission successful.');

    } catch (error) {
      console.error('[ZalandoClient] Payload transmission failed:', error);
      throw error; // Rethrow to allow the caller (ProductsRouter) to format the 500 response
    }
  }
}
