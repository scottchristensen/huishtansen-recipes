"use client";

// Stubbed out while SSO is paused. Real Google OAuth implementation is
// preserved in _stash/sso/. AuthProvider is a passthrough; useAuth() returns
// empty values so the rest of the app keeps compiling. Restore from the
// stash README when ready to bring SSO back.

import { createContext, useContext } from "react";

interface Profile {
  id: string;
  chef_name: string;
  email: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  session: null;
  user: null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setProfile: (profile: Profile) => void;
}

const NOOP_AUTH: AuthContextType = {
  session: null,
  user: null,
  profile: null,
  loading: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  setProfile: () => {},
};

const AuthContext = createContext<AuthContextType>(NOOP_AUTH);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={NOOP_AUTH}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export async function createProfile(): Promise<Profile | null> {
  return null;
}
