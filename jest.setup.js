/* global jest */

jest.mock('@react-native-async-storage/async-storage', () => {
  const values = new Map();
  return {
    getItem: jest.fn(key => Promise.resolve(values.get(key) ?? null)),
    setItem: jest.fn((key, value) => { values.set(key, value); return Promise.resolve(); }),
    removeItem: jest.fn(key => { values.delete(key); return Promise.resolve(); }),
    clear: jest.fn(() => { values.clear(); return Promise.resolve(); }),
  };
});

jest.mock('./src/services/supabase/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInAnonymously: jest.fn(),
      updateUser: jest.fn(),
      linkIdentity: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      exchangeCodeForSession: jest.fn(),
    },
  },
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
  },
}));
