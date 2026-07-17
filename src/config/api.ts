import { env } from './env';

export const ZALANDO_API = {
  BASE_URL: env.PRISM_URL,
  ENDPOINTS: {
    TOKENS: '/tokens',
    ARTICLES: '/articles'
  },
  SCOPES: {
    ARTICLE_WRITE: 'article.write',
  }
} as const;
