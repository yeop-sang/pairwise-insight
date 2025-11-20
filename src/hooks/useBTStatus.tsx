import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';

interface BTRun {
  run_id: string;
  project_id: string;
  status: 'success' | 'running' | 'failed';
  started_at: string;
  finished_at?: string;
  num_comparisons?: number;
  convergence?: number;
}

export const useBTStatus = (projectId: string) => {
  const [loading, setLoading] = useState(false);
  const [latestRun, setLatestRun] = useState<BTRun | null>(null);

  const fetchLatestRun = async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      const runs = await apiFetch<BTRun[]>(
        `/api/debug/bt-runs?project_id=${projectId}`,
        { method: 'GET' }
      );

      if (runs && runs.length > 0) {
        setLatestRun(runs[0]);
      }
    } catch (error) {
      console.error('BT 상태 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestRun();
    
    const interval = setInterval(fetchLatestRun, 30000);
    
    return () => clearInterval(interval);
  }, [projectId]);

  return {
    loading,
    latestRun,
    refetch: fetchLatestRun
  };
};
