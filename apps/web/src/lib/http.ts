/**
 * Base HTTP client — setup without interceptors to avoid circular dependencies.
 * baseURL is intentionally empty so all requests go through the Next.js rewrite proxy
 * (/api/* → backend). This means no CORS issues and no port configuration needed.
 */
import axios from 'axios';

const http = axios.create({
  baseURL: '',   // same-origin — Next.js rewrites handle /api/* → backend
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

export default http;
