"use client"

import { useUser, useAuth as useClerkAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";

export function useAuth() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerkAuth();
  const router = useRouter();
  
  // Convex mutations and queries
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Sync Clerk user with Convex
  useEffect(() => {
    if (user && isLoaded && !convexUser) {
      const syncUser = async () => {
        try {
          await createOrUpdateUser({
            clerkId: user.id,
            email: user.emailAddresses[0]?.emailAddress || "",
            name: user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || "User",
            imageUrl: user.imageUrl,
          });
        } catch (error) {
          console.error("Failed to sync user with Convex:", error);
        }
      };
      syncUser();
    }
  }, [user, isLoaded, convexUser, createOrUpdateUser]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return {
    user: user ? {
      id: user.id,
      name: user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || "User",
      email: user.emailAddresses[0]?.emailAddress || "",
      image: user.imageUrl,
      createdAt: user.createdAt,
    } : null,
    convexUser,
    isLoading: !isLoaded,
    isAuthenticated: !!user,
    signOut: handleSignOut,
  };
}
