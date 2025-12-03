import { supabase } from '@/integrations/supabase/client';

const FASTAPI_BASE_URL = import.meta.env.VITE_FASTAPI_BASE_URL;

interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  requireAuth?: boolean;
}

/**
 * FastAPI 백엔드 API 호출 유틸리티
 * Supabase JWT 토큰을 자동으로 헤더에 포함
 */
export const apiFetch = async <T = any>(
  endpoint: string,
  config: ApiRequestConfig = {}
): Promise<T> => {
  const {
    method = 'GET',
    body,
    headers = {},
    requireAuth = true
  } = config;

  // Supabase 세션에서 JWT 토큰 가져오기
  let authToken = '';
  if (requireAuth) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
    }
    authToken = session.access_token;
  }

  const url = `${FASTAPI_BASE_URL}${endpoint}`;

  const fetchConfig: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(requireAuth ? { 'Authorization': `Bearer ${authToken}` } : {}),
      ...headers
    }
  };

  if (body && method !== 'GET') {
    fetchConfig.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchConfig);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API 요청 실패: ${response.status}`);
  }

  return response.json();
};

/**
 * FormData 업로드용 (파일 업로드)
 */
export const apiUpload = async <T = any>(
  endpoint: string,
  formData: FormData,
  requireAuth: boolean = true
): Promise<T> => {
  let authToken = '';
  if (requireAuth) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
    }
    authToken = session.access_token;
  }

  const url = `${FASTAPI_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...(requireAuth ? { 'Authorization': `Bearer ${authToken}` } : {})
      // Content-Type은 자동 설정됨 (multipart/form-data)
    },
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `파일 업로드 실패: ${response.status}`);
  }

  return response.json();
};
