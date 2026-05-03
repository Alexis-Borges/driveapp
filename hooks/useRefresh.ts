import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useRefresh(keys: string[]) {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all(
      keys.map((key) => qc.invalidateQueries({ queryKey: [key] }))
    );
    setRefreshing(false);
  }, [keys, qc]);

  return { refreshing, onRefresh };
}
