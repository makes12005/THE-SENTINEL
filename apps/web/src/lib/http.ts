/**
 * Base HTTP client — setup without interceptors to avoid circular dependencies.
 */
import axios from 'axios';

const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

export default http;
