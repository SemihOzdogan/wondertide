import type { User } from '@supabase/supabase-js';
import { Linking } from 'react-native';

import type { AuthProvider, GameAccount } from '../auth/authContract';
import { supabase } from './supabase';

export const authRedirectUrl = 'wondertide://auth/callback';

function toAccount(user: User): GameAccount {
  const provider = (user.is_anonymous
    ? 'anonymous'
    : user.app_metadata.provider ?? 'email') as AuthProvider;

  return {
    id: user.id,
    provider,
    email: user.email,
    displayName: typeof user.user_metadata.full_name === 'string'
      ? user.user_metadata.full_name
      : typeof user.user_metadata.name === 'string'
        ? user.user_metadata.name
        : undefined,
    avatarUrl: typeof user.user_metadata.avatar_url === 'string'
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata.picture === 'string'
        ? user.user_metadata.picture
        : undefined,
    isAnonymous: user.is_anonymous ?? false,
  };
}

export async function ensureGameAccount(): Promise<GameAccount> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) return toAccount(sessionData.session.user);

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw error ?? new Error('Misafir hesabı oluşturulamadı.');
  }
  return toAccount(data.user);
}

export async function getCurrentGameAccount(): Promise<GameAccount | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return toAccount(data.user);
}

export async function linkEmailToGuest(email: string, password: string) {
  const { data, error } = await supabase.auth.updateUser({ email, password }, {
    emailRedirectTo: authRedirectUrl,
  });
  if (error || !data.user) throw error ?? new Error('Hesap bağlanamadı.');
  return toAccount(data.user);
}

export async function linkOAuthToGuest(provider: 'google' | 'apple') {
  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    options: { redirectTo: authRedirectUrl },
  });
  if (error || !data?.url) throw error ?? new Error('Giriş başlatılamadı.');
  await Linking.openURL(data.url);
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) throw error ?? new Error('Giriş yapılamadı.');
  return toAccount(data.user);
}

/** Oturumu kapatır ve oyun kesintiye uğramasın diye yeni bir misafir hesabı açar. */
export async function signOutToGuest(): Promise<GameAccount> {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
  return ensureGameAccount();
}

/** Permanently removes the signed-in account and its cascaded cloud save. */
export async function deleteCurrentAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_current_user');
  if (error) throw error;

  // Removing the server-side user does not reliably clear the local session on
  // every device, so clear it before the UI starts a fresh anonymous session.
  const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
  if (signOutError) throw signOutError;
}

export async function signInWithOAuth(provider: 'google' | 'apple') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: authRedirectUrl, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw error ?? new Error('Giriş başlatılamadı.');
  await Linking.openURL(data.url);
}

async function completeAuthRedirect(url: string | null | undefined) {
  if (!url?.startsWith(authRedirectUrl)) return;
  const match = url.match(/[?&]code=([^&]+)/);
  if (!match?.[1]) return;
  const { error } = await supabase.auth.exchangeCodeForSession(
    decodeURIComponent(match[1]),
  );
  if (error) console.warn('Giriş yönlendirmesi tamamlanamadı:', error);
}

export function listenForAuthRedirects() {
  Linking.getInitialURL().then(completeAuthRedirect).catch(console.warn);
  const subscription = Linking.addEventListener('url', event => {
    completeAuthRedirect(event.url).catch(console.warn);
  });
  return () => subscription.remove();
}
