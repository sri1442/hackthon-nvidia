/**
 * useAgvTelemetry Hook - Manages AGV telemetry streaming and updates
 */

import { useEffect, useState } from 'react';
import { fetchStreamData, AGV } from '../services/telemetryService';

export function useAgvTelemetry(streaming: boolean, uiPositionMap: Record<string, { x: number; y: number }>) {
  const [agvs, setAgvs] = useState<AGV[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    fetchStreamData(uiPositionMap)
      .then(data => {
        setAgvs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Initial telemetry load failed:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!streaming) return;

    const timer = setInterval(async () => {
      try {
        const currentStates = await fetchStreamData(uiPositionMap);
        if (currentStates.length > 0) {
          setAgvs(currentStates);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error('Stream fetch error:', error);
      }
    }, 2200);

    return () => clearInterval(timer);
  }, [streaming, uiPositionMap]);

  return { agvs, lastUpdate, loading };
}
