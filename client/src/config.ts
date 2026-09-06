const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '');
  }

  if (import.meta.env.PROD) {
    console.warn(
      '⚠️ VITE_API_URL environment variable is not defined in production. Please configure VITE_API_URL in Vercel project settings to your deployed Railway backend URL.'
    );
  }

  return 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();
