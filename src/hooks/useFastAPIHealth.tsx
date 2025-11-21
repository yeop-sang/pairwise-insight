import { useState, useEffect } from 'react';

const FASTAPI_BASE_URL = import.meta.env.VITE_FASTAPI_BASE_URL;

interface HealthResponse {
  name: string;
  version: string;
}

export const useFastAPIHealth = () => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    if (!FASTAPI_BASE_URL) {
      setError('FASTAPI_BASE_URL이 설정되지 않았습니다.');
      setIsHealthy(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(FASTAPI_BASE_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: HealthResponse = await response.json();
      setHealthData(data);
      setIsHealthy(true);
    } catch (err: any) {
      console.error('FastAPI 헬스체크 실패:', err);
      setError(err.message || '연결 실패');
      setIsHealthy(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return {
    isHealthy,
    healthData,
    loading,
    error,
    refetch: checkHealth
  };
};
