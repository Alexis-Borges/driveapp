import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useRgpdExport() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('rgpd-export', {
        body: {},
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useRgpdDelete() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('rgpd-delete', {
        body: {},
      });
      if (error) throw error;
    },
  });
}
