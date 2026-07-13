import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getEntitlements, type Entitlements } from "@/lib/billing/entitlements-service";

/**
 * The caller's resolved plan/limits/usage for UI gating, meters, and banners.
 * NEVER used for enforcement — the server is authoritative at each gate.
 */
export function useEntitlements() {
  const { user } = useAuth();
  return useQuery<Entitlements | null>({
    queryKey: ["entitlements", user?.id],
    queryFn: getEntitlements,
    enabled: !!user,
    staleTime: 60_000,
  });
}
