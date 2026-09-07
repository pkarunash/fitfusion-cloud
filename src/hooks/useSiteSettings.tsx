import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_SITE_NAME = "World Gym";
export const DEFAULT_TAGLINE = "Protein, Equipment & Memberships";

export function useSiteSettings() {
  const { data, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("site_name,tagline")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  return {
    siteName: data?.site_name || DEFAULT_SITE_NAME,
    tagline: data?.tagline || DEFAULT_TAGLINE,
    isLoading,
  };
}
