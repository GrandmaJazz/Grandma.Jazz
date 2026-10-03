import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";

export interface SessionInfo {
  user: { id: string; email: string; name: string; isPlatformAdmin: boolean };
  membership: { businessId: string; role: "business_owner" | "event_manager" | "checkin_staff"; businessName: string } | null;
}

export function useSession() {
  const query = useQuery<SessionInfo | null>({
    queryKey: ["events-session"],
    queryFn: async () => {
      try {
        return await api<SessionInfo>("/auth/me");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
  return query;
}

export function useInvalidateSession() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["events-session"] });
}

const ROLE_RANK = { checkin_staff: 1, event_manager: 2, business_owner: 3 } as const;

export function hasRole(session: SessionInfo | null | undefined, min: keyof typeof ROLE_RANK): boolean {
  if (!session?.membership) return false;
  return ROLE_RANK[session.membership.role] >= ROLE_RANK[min];
}
