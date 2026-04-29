import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { logger } from '../utils/logger';
import { CircuitBreaker } from './circuitBreaker';
import { createServiceUnavailableError } from '../types/errors';

export class CourseraClient {
  private axiosInstance: AxiosInstance;
  private sessionToken?: string;
  private circuitBreaker: CircuitBreaker<unknown>;

  constructor(baseURL = 'https://www.coursera.org') {
    this.circuitBreaker = new CircuitBreaker('coursera-api');

    this.axiosInstance = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'User-Agent': 'coursera-mcp/0.1.0',
      },
    });

    // Request interceptor to add auth header
    this.axiosInstance.interceptors.request.use((config) => {
      if (this.sessionToken) {
        config.headers.Authorization = `Bearer ${this.sessionToken}`;
      }
      return config;
    });

    // Response error interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        logger.warn('Coursera API error', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  setSessionToken(token: string): void {
    this.sessionToken = token;
  }

  clearSessionToken(): void {
    this.sessionToken = undefined;
  }

  async get<T>(url: string, config: AxiosRequestConfig = {}): Promise<T> {
    try {
      return await this.circuitBreaker.execute(
        () => this.axiosInstance.get<T>(url, config).then((res) => res.data),
        () => null as unknown as T
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  async post<T>(url: string, data?: unknown, config: AxiosRequestConfig = {}): Promise<T> {
    try {
      return await this.circuitBreaker.execute(() =>
        this.axiosInstance.post<T>(url, data, config).then((res) => res.data)
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  async put<T>(url: string, data?: unknown, config: AxiosRequestConfig = {}): Promise<T> {
    try {
      return await this.circuitBreaker.execute(() =>
        this.axiosInstance.put<T>(url, data, config).then((res) => res.data)
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete<T>(url: string, config: AxiosRequestConfig = {}): Promise<T> {
    try {
      return await this.circuitBreaker.execute(() =>
        this.axiosInstance.delete<T>(url, config).then((res) => res.data)
      );
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 0;
      const message = error.message || 'Unknown error';

      if (status === 0 || status >= 500) {
        logger.error('Service unavailable', { status, message });
        throw createServiceUnavailableError('Coursera API service unavailable');
      }
    }

    logger.error('Coursera client error', {
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}
