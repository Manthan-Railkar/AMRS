"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUserAction, type UserProfile } from "@/app/actions/auth";

export function useCurrentUser() {
  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      return await getCurrentUserAction();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  // Keep local storage & cookie in sync with authenticated user
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (query.data?.id) {
      localStorage.setItem("amrs_active_user_id", query.data.id);
      localStorage.setItem("amrs_active_user_email", query.data.email);
      document.cookie = `amrs_user_id=${query.data.id}; path=/; max-age=2592000; SameSite=Lax`;
    } else if (query.data === null && !query.isLoading) {
      localStorage.removeItem("amrs_active_user_id");
      localStorage.removeItem("amrs_active_user_email");
      document.cookie = "amrs_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  }, [query.data, query.isLoading]);

  return query;
}
