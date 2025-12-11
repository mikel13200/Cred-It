// frontend/src/features/tracking/hooks/useTracking.js
/**
 * Tracking hook - Updated for new backend
 */
import { useState, useEffect } from 'react';
import { useNotification } from '../../../hooks';
import { trackingApi } from '../../../api';

export function useTracking(userName) {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const { showError } = useNotification();

  useEffect(() => {
    if (!userName) return;

    const fetchProgress = async () => {
      setLoading(true);
      try {
        // Check all three stages
        // Backend returns: { success: true, data: { exists: true/false } }
        const [requestRes, pendingRes, finalRes] = await Promise.all([
          trackingApi.getUserProgress(userName),
          trackingApi.getPendingProgress(userName),
          trackingApi.getFinalProgress(userName),
        ]);

        const inRequest = requestRes.exists;
        const inPending = pendingRes.exists;
        const inFinal = finalRes.exists;

        // Set progress value (1-3)
        if (inFinal) setProgress(3);
        else if (inPending) setProgress(2);
        else if (inRequest) setProgress(1);
        else setProgress(0);
      } catch (err) {
        console.error('Error fetching progress:', err);
        showError('Failed to fetch progress');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [userName]);

  return { progress, loading };
}