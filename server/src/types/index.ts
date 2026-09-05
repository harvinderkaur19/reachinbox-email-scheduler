// Placeholder type definitions for server application
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}
