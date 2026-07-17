import axios from 'axios';
import axiosRetry from 'axios-retry';
import { ZALANDO_API } from '../config/api';
import { AuthManager } from './AuthManager';

export const ZalandoClient = axios.create({
  baseURL: `${ZALANDO_API.BASE_URL}${ZALANDO_API.ENDPOINTS.ARTICLES}`
});

// Implement axios-retry logic for 429s and 5xx errors with exponential backoff
axiosRetry(ZalandoClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    if (error.response && error.response.status === 429) {
      return true;
    }
    if (error.response && error.response.status >= 500 && error.response.status < 600) {
      return true;
    }
    return axiosRetry.isNetworkOrIdempotentRequestError(error);
  }
});

// Automatically append Bearer token to all requests
ZalandoClient.interceptors.request.use(async (config) => {
  const token = await AuthManager.getToken();
  if (!config.headers) {
    config.headers = {} as any;
  }
  config.headers['Authorization'] = `Bearer ${token}`;
  return config;
}, (error) => {
  return Promise.reject(error);
});
