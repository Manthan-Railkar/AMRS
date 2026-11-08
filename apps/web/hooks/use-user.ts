"use client";

import { useQuery } from "@tanstack/react-query";
import { getCurrentUserAction, type UserProfile } from "@/app/actions/auth";

export function useCurrentUser() {
  return useQuery<UserProfile | null>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      return await getCurrentUserAction();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

