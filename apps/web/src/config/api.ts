/**
 * Centralized API configuration for Yojana Sahayak frontend.
 * Reads VITE_API_BASE_URL from environment with fallback to http://127.0.0.1:8005.
 */
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://127.0.0.1:8005';

