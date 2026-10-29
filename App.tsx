import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CopilotProvider } from 'react-native-copilot';

import { GameNavigator } from './src/navigation/GameNavigator';
import { CopilotTooltip } from './src/features/game/CopilotTooltip';
import { ensureGameAccount } from './src/services/supabase/authService';
import { listenForAuthRedirects } from './src/services/supabase/authService';
import { startCloudSync } from './src/services/supabase/cloudSync';
import { supabase } from './src/services/supabase/supabase';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <CopilotProvider overlay="svg" animated backdropColor="rgba(4, 24, 36, 0.76)" tooltipComponent={CopilotTooltip}>
        <GameBootstrap />
      </CopilotProvider>
    </SafeAreaProvider>
  );
}

function GameBootstrap() {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let syncingAccountId: string | undefined;

    async function syncAccount(accountId: string) {
      if (syncingAccountId === accountId) return;
      unsubscribe?.();
      syncingAccountId = accountId;
      const subscription = await startCloudSync(accountId);
      unsubscribe = subscription;
    }

    ensureGameAccount()
      .then(account => syncAccount(account.id))
      .catch(error => {
        console.warn('Supabase başlatılamadı:', error);
      });
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          syncAccount(session.user.id).catch(error => {
            console.warn('Bulut kaydı yüklenemedi:', error);
          });
        }
      },
    );

    const stopListening = listenForAuthRedirects();
    return () => {
      unsubscribe?.();
      stopListening();
      authListener.subscription.unsubscribe();
    };
  }, []);

  return <GameNavigator />;
}

export default App;
