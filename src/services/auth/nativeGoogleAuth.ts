import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { googleAuthConfig, hasGoogleAuthConfig } from './googleConfig';
import { supabase } from '../supabase/supabase';

function configureGoogleSignin() {
  if (!hasGoogleAuthConfig()) {
    throw new Error('Google Client ID henüz eklenmedi. src/services/auth/googleConfig.ts içindeki webClientId alanını doldur.');
  }

  if (
    Platform.OS === 'ios' &&
    !googleAuthConfig.iosClientId.endsWith('.apps.googleusercontent.com')
  ) {
    throw new Error(
      'iOS Google Client ID henüz eklenmedi. src/services/auth/googleConfig.ts içindeki iosClientId alanını doldur.',
    );
  }

  GoogleSignin.configure({
    webClientId: googleAuthConfig.webClientId,
    ...(Platform.OS === 'ios' && googleAuthConfig.iosClientId
      ? { iosClientId: googleAuthConfig.iosClientId }
      : {}),
  });
}

async function requestGoogleIdToken() {
  configureGoogleSignin();
  if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (response.type === 'cancelled') return null;
  if (!response.data.idToken) throw new Error('Google’dan kimlik belirteci alınamadı. Web Client ID ayarını kontrol et.');
  return response.data.idToken;
}

/** Misafir hesabını koruyarak Google kimliğini ona ekler. */
export async function linkNativeGoogleIdentity() {
  const idToken = await requestGoogleIdToken();
  if (!idToken) return false;
  const { error } = await supabase.auth.linkIdentity({ provider: 'google', token: idToken });
  if (error) throw error;
  return true;
}

/** Google hesabıyla yeni bir Supabase oturumu başlatır. */
export async function signInWithNativeGoogle() {
  const idToken = await requestGoogleIdToken();
  if (!idToken) return false;
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error) throw error;
  return true;
}
