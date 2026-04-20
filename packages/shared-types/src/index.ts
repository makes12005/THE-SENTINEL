export * from './auth';
export * from './trips';


/**
 * Standard API Response wrapper per project rules
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string | ErrorDetails;
  meta?: MetaDetails;
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: any;
}

export interface MetaDetails {
  timestamp: string; // IST (Asia/Kolkata)
  page?: number;
  limit?: number;
  total?: number;
}
