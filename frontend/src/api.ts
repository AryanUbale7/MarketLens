import axios from 'axios';

// API Client configuration
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '', // Use environment variable in production, fallback to relative path in dev
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interfaces matching backend schemas
export interface Category {
  id: number;
  name: string;
  description: string | null;
}

export interface Source {
  id: number;
  name: string;
  website: string | null;
}

export interface Article {
  id: number;
  title: string;
  url: string;
  source_id: number;
  category_id: number;
  summary: string | null;
  why_it_matters: string | null;
  priority_score: number;
  published_date: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_articles: number;
  wealth_creation: number;
  wealth_protection: number;
  wealth_legacy: number;
  online_sources: number;
  failed_sources: number;
}

export interface FetchNewsResponse {
  source_results: Record<string, { count: number; status: string }>;
  total_fetched: number;
  saved: number;
  skipped: number;
  online_sources: number;
  failed_sources: number;
}

export interface AIProcessResponse {
  processed: number;
}

export interface AISingleProcessResponse {
  message: string;
  article_id: number;
}

export interface SourceHealthEntry {
  status: string;  // 'online' | 'blocked' | 'unavailable' | 'no_rss_feed' | 'unknown'
  last_fetched: string | null;
  rss_url: string | null;
  is_active: boolean;
}

export interface SourceHealthResponse {
  [sourceName: string]: SourceHealthEntry;
}

// API Services
export const api = {
  // Dashboard
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await client.get<DashboardStats>('/api/v1/dashboard/stats');
    return data;
  },

  getLatestNews: async (): Promise<Article[]> => {
    const { data } = await client.get<Article[]>('/api/v1/dashboard/latest');
    return data;
  },

  getSourceDistribution: async (): Promise<Record<string, number>> => {
    const { data } = await client.get<Record<string, number>>('/api/v1/dashboard/source-distribution');
    return data;
  },

  getCategoryDistribution: async (): Promise<Record<string, number>> => {
    const { data } = await client.get<Record<string, number>>('/api/v1/dashboard/category-distribution');
    return data;
  },

  getSourceHealth: async (): Promise<SourceHealthResponse> => {
    const { data } = await client.get<SourceHealthResponse>('/api/v1/dashboard/source-health');
    return data;
  },

  // Categories & Sources
  getCategories: async (): Promise<Category[]> => {
    const { data } = await client.get<Category[]>('/api/v1/categories/');
    return data;
  },

  getSources: async (): Promise<Source[]> => {
    const { data } = await client.get<Source[]>('/api/v1/sources/');
    return data;
  },

  // Articles
  getArticles: async (params?: {
    q?: string;
    category_id?: number;
    source_id?: number;
    source_group?: string;
    skip?: number;
    limit?: number;
  }): Promise<Article[]> => {
    const { data } = await client.get<Article[]>('/api/v1/articles/', { params });
    return data;
  },

  getArticle: async (id: number): Promise<Article> => {
    const { data } = await client.get<Article>(`/api/v1/articles/${id}`);
    return data;
  },

  // Admin Actions
  fetchNews: async (): Promise<FetchNewsResponse> => {
    const { data } = await client.post<FetchNewsResponse>('/api/v1/fetch-news');
    return data;
  },

  processAllArticlesWithAI: async (): Promise<AIProcessResponse> => {
    const { data } = await client.post<AIProcessResponse>('/api/v1/process-all-articles');
    return data;
  },

  processSingleArticleWithAI: async (id: number): Promise<AISingleProcessResponse> => {
    const { data } = await client.post<AISingleProcessResponse>(`/api/v1/process-article/${id}`);
    return data;
  },
  
  // Health Check
  checkBackendHealth: async (): Promise<boolean> => {
    try {
      const { data } = await client.get('/');
      return data?.message?.includes('Running') || false;
    } catch {
      return false;
    }
  }
};
