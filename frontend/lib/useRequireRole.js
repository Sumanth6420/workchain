"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";

export function useRequireRole(role) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (user.role !== role)
      router.replace(user.role === "client" ? "/client" : "/freelancer");
  }, [ready, user, role, router]);

  return Boolean(ready && user && user.role === role);
}
