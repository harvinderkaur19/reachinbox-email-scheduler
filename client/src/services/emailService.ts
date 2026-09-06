import { API_BASE_URL } from '../config';
import { ApiResponse, EmailListPayload } from '../types/email';

export class ApiError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Builds API request headers incorporating Authorization Bearer token if stored in localStorage.
 */
export const getAuthHeaders = (extraHeaders: Record<string, string> = {}): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  const token = localStorage.getItem('session_token');
  if (token && token.trim() !== '') {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  return headers;
};

/**
 * Fetches paginated scheduled emails belonging to the authenticated user.
 */
export const getScheduledEmails = async (
  page: number = 1,
  limit: number = 20
): Promise<EmailListPayload> => {
  const url = `${API_BASE_URL}/api/emails/scheduled?page=${page}&limit=${limit}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (response.status === 401) {
    throw new ApiError('Unauthenticated session', 401);
  }

  const payload: ApiResponse<EmailListPayload> = await response.json();

  if (!response.ok || !payload.success || !payload.data) {
    throw new ApiError(
      payload.message || `Failed to fetch scheduled emails (HTTP ${response.status})`,
      response.status
    );
  }

  return payload.data;
};

/**
 * Fetches paginated sent and failed emails belonging to the authenticated user.
 */
export const getSentEmails = async (
  page: number = 1,
  limit: number = 20
): Promise<EmailListPayload> => {
  const url = `${API_BASE_URL}/api/emails/sent?page=${page}&limit=${limit}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (response.status === 401) {
    throw new ApiError('Unauthenticated session', 401);
  }

  const payload: ApiResponse<EmailListPayload> = await response.json();

  if (!response.ok || !payload.success || !payload.data) {
    throw new ApiError(
      payload.message || `Failed to fetch sent emails (HTTP ${response.status})`,
      response.status
    );
  }

  return payload.data;
};

/**
 * Submits a new email campaign schedule to the backend POST /api/emails/schedule.
 */
export const scheduleEmails = async (
  inputPayload: any
): Promise<any> => {
  const url = `${API_BASE_URL}/api/emails/schedule`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(inputPayload),
  });

  if (response.status === 401) {
    throw new ApiError('Unauthenticated session', 401);
  }

  const payload = await response.json();

  if (response.status === 207) {
    // Partial queue status
    return {
      ...(payload.data || {}),
      isPartial: true,
      message: payload.message || 'Campaign created but some background jobs failed to queue',
    };
  }

  return payload.data;
};

/**
 * Searches user emails in Elasticsearch GET /api/emails/search?q=...
 */
export const searchEmails = async (
  query: string
): Promise<{ total: number; query?: string; emails: any[] }> => {
  const url = `${API_BASE_URL}/api/emails/search?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (response.status === 401) {
    throw new ApiError('Unauthenticated session', 401);
  }

  const payload = await response.json();

  if (!response.ok || !payload.success || !payload.data) {
    throw new ApiError(
      payload.message || `Search service error (HTTP ${response.status})`,
      response.status
    );
  }

  return payload.data;
};

