/**
 * Game code uses this provider-neutral boundary. The concrete implementation
 * is Supabase, but gameplay does not need to know the backend vendor.
 */
export type AuthProvider = 'anonymous' | 'email' | 'google' | 'apple';

export type GameAccount = {
  id: string;
  provider: AuthProvider;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  isAnonymous: boolean;
};

export interface AuthService {
  getCurrentAccount(): Promise<GameAccount | null>;
  startAsGuest(): Promise<GameAccount>;
  registerWithEmail(email: string, password: string): Promise<GameAccount>;
  signInWithGoogle(): Promise<GameAccount>;
  signInWithApple(): Promise<GameAccount>;
  deleteAccount(): Promise<void>;
}
