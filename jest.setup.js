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

jest.mock('@invertase/react-native-apple-authentication', () => {
  const AppleButton = () => null;
  AppleButton.Style = { BLACK: 'Black' };
  AppleButton.Type = { SIGN_IN: 'SignIn', SIGN_UP: 'SignUp' };
  return {
    AppleButton,
    appleAuth: {
      Error: { CANCELED: '1001' },
      Operation: { LOGIN: 'LOGIN' },
      Scope: { FULL_NAME: 'FULL_NAME', EMAIL: 'EMAIL' },
      performRequest: jest.fn(),
    },
  };
});

jest.mock('lucide-react-native', () => {
  const Icon = () => null;
  return {
    Apple: Icon,
    ChevronLeft: Icon,
    ChevronRight: Icon,
    CircleCheck: Icon,
    Cloud: Icon,
    Gift: Icon,
    LockKeyhole: Icon,
    Mail: Icon,
    ShieldCheck: Icon,
    UserRound: Icon,
  };
});
