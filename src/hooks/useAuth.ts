"use client";

import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { subscribeToAuth } from "@/services/authService";
import { getOrCreateUserProfile, UserProfile } from "@/services/userService";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const userProfile = await getOrCreateUserProfile(
            currentUser.uid, 
            currentUser.displayName || "익명의 도전자"
          );
          setProfile(userProfile);
        } catch (error) {
          console.error("Error loading user profile:", error);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, profile, loading };
}
