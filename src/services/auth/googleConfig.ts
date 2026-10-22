/**
 * Google Cloud Console > APIs & Services > Credentials bölümünden alınır.
 * Web istemci kimliği Android ve Supabase token doğrulaması için zorunludur.
 * iOS istemci kimliği ile REVERSED_CLIENT_ID, iOS native kurulumunda zorunludur.
 */
export const googleAuthConfig = {
  webClientId: '599964885133-01hdbo47mi8bl5cmsnko08iih9c1cupc.apps.googleusercontent.com',
  iosClientId: '599964885133-c84j6csh0ic08gfg6imglcrbrs20cegt.apps.googleusercontent.com',
};

export function hasGoogleAuthConfig() {
  return googleAuthConfig.webClientId.endsWith('.apps.googleusercontent.com');
}
