const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.replace(/\/api\/?$/, '');
  }

  // In production, default to relative path "" so Vercel vercel.json rewrites proxy /api/* to Railway seamlessly
  if (import.meta.env.PROD) {
    return '';
  }

  return 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();
