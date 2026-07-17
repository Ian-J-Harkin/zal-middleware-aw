import axios from 'axios';
import { ZALANDO_API } from '../config/api';
import { env } from '../config/env';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class AuthManager {
  private static cachedToken: string | null = null;
  private static tokenExpiresAt: number = 0; // Unix timestamp in seconds

  /**
   * Retrieves an active OAuth2 Client Credentials token.
   * If the token is missing or expires within 60 seconds, it pre-emptively fetches a new one.
   */
  public static async getToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    
    // 60-second preemptive refresh boundary
    if (this.cachedToken && this.tokenExpiresAt > now + 60) {
      return this.cachedToken;
    }

    try {
      const response = await axios.post<TokenResponse>(
        `${ZALANDO_API.BASE_URL}${ZALANDO_API.ENDPOINTS.TOKENS}`,
        {
          grant_type: 'client_credentials',
          client_id: env.CLIENT_ID,
          client_secret: env.CLIENT_SECRET,
          scope: ZALANDO_API.SCOPES.ARTICLE_WRITE
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock_bypass'
          }
        }
      );

      this.cachedToken = response.data.access_token;
      this.tokenExpiresAt = now + response.data.expires_in;

      return this.cachedToken;
    } catch (error: any) {
      throw new Error(`Failed to retrieve OAuth2 token: ${error.message || error}`);
    }
  }
}
