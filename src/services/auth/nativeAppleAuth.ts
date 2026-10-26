import { appleAuth } from '@invertase/react-native-apple-authentication';
import { Platform } from 'react-native';

import { supabase } from '../supabase/supabase';

type AppleAuthError = { code?: string };

async function requestAppleCredential() {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple ile giriş yalnızca iPhone ve iPad’de kullanılabilir.');
  }

  try {
    const credential = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      // Apple, ad ve e-posta bilgisini yalnızca ilk yetkilendirmede iletir.
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    });

    const token = credential.identityToken;
    if (!token) {
      throw new Error('Apple’dan kimlik belirteci alınamadı. Lütfen tekrar dene.');
    }

    return { nonce: credential.nonce, token };
  } catch (error) {
    if ((error as AppleAuthError).code === appleAuth.Error.CANCELED) return null;
    throw error;
  }
}

/** Misafir hesabını koruyarak yerel Apple kimliğini ona ekler. */
export async function linkNativeAppleIdentity() {
  const credential = await requestAppleCredential();
  if (!credential) return false;

  const { error } = await supabase.auth.linkIdentity({
    provider: 'apple',
    token: credential.token,
    nonce: credential.nonce,
  });
  if (error) throw error;
  return true;
}

/** Apple kimliğiyle yeni bir Supabase oturumu başlatır. */
export async function signInWithNativeApple() {
  const credential = await requestAppleCredential();
  if (!credential) return false;

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.token,
    nonce: credential.nonce,
  });
  if (error) throw error;
  return true;
}
