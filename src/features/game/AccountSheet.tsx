import React, { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { GameAccount } from '../../services/auth/authContract';
import { linkNativeGoogleIdentity, signInWithNativeGoogle } from '../../services/auth/nativeGoogleAuth';
import { getCurrentGameAccount, linkEmailToGuest, linkOAuthToGuest, signInWithEmail, signInWithOAuth, signOutToGuest } from '../../services/supabase/authService';
import { useGameStore } from '../../store/gameStore';

type Props = { visible: boolean; onClose: () => void };

export function AccountSheet({ visible, onClose }: Props) {
  const dailyStreak = useGameStore(state => state.dailyStreak);
  const canClaimDailyReward = useGameStore(state => state.canClaimDailyReward);
  const claimDailyReward = useGameStore(state => state.claimDailyReward);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [account, setAccount] = useState<GameAccount | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'signIn'>('create');
  const [authStep, setAuthStep] = useState<'welcome' | 'choice' | 'email'>('welcome');

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setAuthStep('welcome');
    setMode('create');
    setEmail('');
    setPassword('');
    setNotice(null);
    setLoadingAccount(true);
    getCurrentGameAccount()
      .then(nextAccount => { if (active) setAccount(nextAccount); })
      .catch(() => { if (active) setAccount(null); })
      .finally(() => { if (active) setLoadingAccount(false); });
    return () => { active = false; };
  }, [visible]);

  function handleDailyReward() {
    const reward = claimDailyReward();
    if (!reward) return;
    setNotice(`Günlük ödül alındı: +${reward.coins} altın, +${reward.energy} enerji${reward.gems ? ` ve +${reward.gems} mücevher` : ''}.`);
  }

  async function linkEmail() {
    if (!email.includes('@') || password.length < 8) {
      Alert.alert('Bilgileri kontrol et', 'Geçerli bir e-posta ve en az 8 karakterli şifre gir.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'create') {
        const nextAccount = await linkEmailToGuest(email.trim(), password);
        setAccount(nextAccount);
        setNotice('Doğrulama bağlantısını e-postandan aç. Döndüğünde ada ilerlemen bu hesapta güvenle kalacak.');
      } else {
        const nextAccount = await signInWithEmail(email.trim(), password);
        setAccount(nextAccount);
        Alert.alert('İlerlemen yükleniyor', 'Buluttaki kayıt açılıyor; kaldığın yerden devam edeceksin.');
        onClose();
      }
    } catch (error) {
      Alert.alert('Hesap bağlanamadı', error instanceof Error ? error.message : 'Lütfen tekrar dene.');
    } finally {
      setBusy(false);
    }
  }

  async function handleProvider(provider: 'google' | 'apple') {
    setBusy(true);
    try {
      if (provider === 'google') {
        const completed = mode === 'create' ? await linkNativeGoogleIdentity() : await signInWithNativeGoogle();
        if (!completed) return;
        setAccount(await getCurrentGameAccount());
        if (mode === 'create') setNotice('Google hesabın bağlandı. Ada ilerlemen artık bu hesapla korunuyor.');
        else onClose();
        return;
      }
      if (mode === 'create') await linkOAuthToGuest(provider);
      else await signInWithOAuth(provider);
      setNotice('Apple ile devam etmek için açılan sayfadaki onayı tamamla. Uygulamaya otomatik dönersin.');
    } catch (error) {
      Alert.alert('Giriş başlatılamadı', error instanceof Error ? error.message : 'Sağlayıcı ayarlarını kontrol et.');
    } finally {
      setBusy(false);
    }
  }

  function handleSignOut() {
    Alert.alert('Oturumu kapat?', 'Bu cihazda misafir olarak devam edebilirsin. Buluttaki ilerlemen hesabında güvende kalır.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış yap', style: 'destructive', onPress: () => {
          setBusy(true);
          signOutToGuest()
            .then(nextAccount => {
              setAccount(nextAccount);
              setAuthStep('welcome');
              setNotice('Oturumun kapatıldı. Misafir olarak devam ediyorsun.');
            })
            .catch(error => Alert.alert('Çıkış yapılamadı', error instanceof Error ? error.message : 'Lütfen tekrar dene.'))
            .finally(() => setBusy(false));
        },
      },
    ]);
  }

  const content = <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}><ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled"><View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{account && !account.isAnonymous ? 'Profilin' : authStep === 'welcome' ? 'Profil' : mode === 'create' ? 'Hesap oluştur' : 'Giriş yap'}</Text>
        {loadingAccount ? <Text style={styles.status}>Hesap durumu kontrol ediliyor…</Text> : <><DailyRewardCard streak={dailyStreak} available={canClaimDailyReward()} onClaim={handleDailyReward} />{account && !account.isAnonymous ? <ProfileCard account={account} busy={busy} onSignOut={handleSignOut} /> : <GuestAuthFlow mode={mode} step={authStep} email={email} password={password} busy={busy} onEmailChange={setEmail} onPasswordChange={setPassword} onGoogle={() => handleProvider('google')} onApple={() => handleProvider('apple')} onStartCreate={() => { setMode('create'); setAuthStep('choice'); }} onStartSignIn={() => { setMode('signIn'); setAuthStep('choice'); }} onOpenEmail={() => setAuthStep('email')} onBack={() => setAuthStep(authStep === 'email' ? 'choice' : 'welcome')} onSubmitEmail={linkEmail} />}</>}
        {notice ? <View style={styles.notice}><Text style={styles.noticeText}>{notice}</Text></View> : null}
        <Pressable onPress={onClose} style={styles.later}><Text style={styles.laterText}>{account && !account.isAnonymous ? 'Kapat' : 'Şimdi değil'}</Text></Pressable>
      </View></ScrollView></KeyboardAvoidingView>;

  return <Modal animationType="slide" transparent presentationStyle="overFullScreen" visible={visible} onRequestClose={onClose}>{content}</Modal>;
}

function DailyRewardCard({ streak, available, onClaim }: { streak: number; available: boolean; onClaim: () => void }) {
  const nextDay = Math.min(streak + 1, 7);
  return <View style={styles.dailyCard}><View><Text style={styles.dailyLabel}>GÜNLÜK KIYI ÖDÜLÜ</Text><Text style={styles.dailyTitle}>{available ? `${nextDay}. gün ödülün hazır` : `${streak}. gün ödülü alındı`}</Text><Text style={styles.dailyBody}>{available ? '+ enerji ve altın seni bekliyor.' : 'Yarın yeniden uğra, seri devam etsin.'}</Text></View>{available ? <Pressable accessibilityLabel="Günlük ödülü al" onPress={onClaim} style={styles.dailyButton}><Text style={styles.dailyButtonText}>Al</Text></Pressable> : <Text style={styles.dailyDone}>✓</Text>}</View>;
}

type GuestAuthFlowProps = {
  mode: 'create' | 'signIn'; step: 'welcome' | 'choice' | 'email'; email: string; password: string; busy: boolean;
  onEmailChange: (value: string) => void; onPasswordChange: (value: string) => void; onGoogle: () => void; onApple: () => void;
  onStartCreate: () => void; onStartSignIn: () => void; onOpenEmail: () => void; onBack: () => void; onSubmitEmail: () => void;
};

function GuestAuthFlow({ mode, step, email, password, busy, onEmailChange, onPasswordChange, onGoogle, onApple, onStartCreate, onStartSignIn, onOpenEmail, onBack, onSubmitEmail }: GuestAuthFlowProps) {
  const isCreate = mode === 'create';

  if (step === 'welcome') {
    return <View style={styles.authFlow}>
      <View style={styles.guestHero}><View style={styles.guestAvatar}><Text style={styles.guestAvatarText}>✦</Text></View><View style={styles.guestHeroCopy}><Text style={styles.guestHeroTitle}>Misafir kaşif</Text><Text style={styles.guestHeroText}>İlerlemen şu an yalnızca bu cihazda.</Text></View></View>
      <Text style={styles.authLead}>Bir hesapla bağladığında adan, eşyaların ve görevlerin tüm cihazlarında seninle kalır.</Text>
      <Pressable disabled={busy} onPress={onStartCreate} style={styles.primary}><Text style={styles.primaryText}>Hesap oluştur</Text></Pressable>
      <Pressable disabled={busy} onPress={onStartSignIn} style={styles.loginAction}><Text style={styles.loginActionText}>Zaten hesabın var mı? <Text style={styles.loginActionStrong}>Giriş yap</Text></Text></Pressable>
    </View>;
  }

  if (step === 'email') {
    return <View style={styles.authFlow}>
      <Text style={styles.authLead}>{isCreate ? 'E-posta hesabını bağla; adan her cihazda yanında olsun.' : 'E-posta ve şifrenle buluttaki adana dön.'}</Text>
      <TextInput value={email} onChangeText={onEmailChange} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="E-posta adresi" placeholderTextColor="#A38771" style={styles.input} />
      <TextInput value={password} onChangeText={onPasswordChange} secureTextEntry placeholder={isCreate ? 'Şifre (en az 8 karakter)' : 'Şifren'} placeholderTextColor="#A38771" style={styles.input} />
      <Pressable disabled={busy} onPress={onSubmitEmail} style={[styles.primary, busy && styles.disabled]}><Text style={styles.primaryText}>{busy ? 'Bekle…' : isCreate ? 'Hesabı bağla' : 'Giriş yap'}</Text></Pressable>
      <Pressable disabled={busy} onPress={onBack} style={styles.backAction}><Text style={styles.backActionText}>‹ Diğer giriş yöntemleri</Text></Pressable>
    </View>;
  }

  return <View style={styles.authFlow}>
    <Text style={styles.authLead}>{isCreate ? 'Bir hesap bağlayarak ada ilerlemeni güvene al.' : 'Buluttaki kayıtlarına kaldığın yerden devam et.'}</Text>
    <Pressable disabled={busy} onPress={onGoogle} style={[styles.googleAction, busy && styles.disabled]}><View style={styles.googleMark}><Text style={styles.googleMarkText}>G</Text></View><Text style={styles.googleActionText}>{busy ? 'Google açılıyor…' : `Google ile ${isCreate ? 'bağla' : 'giriş yap'}`}</Text></Pressable>
    {Platform.OS === 'ios' ? <Pressable disabled={busy} onPress={onApple} style={[styles.appleAction, busy && styles.disabled]}><Text style={styles.appleActionText}>  Apple ile {isCreate ? 'bağla' : 'giriş yap'}</Text></Pressable> : null}
    <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>veya</Text><View style={styles.dividerLine} /></View>
    <Pressable disabled={busy} onPress={onOpenEmail} style={[styles.emailAction, busy && styles.disabled]}><Text style={styles.emailActionText}>✉  E-posta ile devam et</Text></Pressable>
    <View style={styles.secureNote}><Text style={styles.secureNoteText}>🔒  İlerlemen güvenli biçimde hesabına bağlanır.</Text></View>
    <Pressable disabled={busy} onPress={onBack} style={styles.switchMode}><Text style={styles.switchText}>‹ Profil ekranına dön</Text></Pressable>
  </View>;
}

function ProfileCard({ account, busy, onSignOut }: { account: GameAccount; busy: boolean; onSignOut: () => void }) {
  const providerName = account.provider === 'google' ? 'Google' : account.provider === 'apple' ? 'Apple' : 'E-posta';
  const displayName = account.displayName || account.email?.split('@')[0] || 'Wondertide Kaşifi';
  const initial = displayName.trim().charAt(0).toLocaleUpperCase('tr-TR');

  return <View style={styles.profile}>
    <View style={styles.profileHero}>
      <View style={[styles.avatarFrame, account.provider === 'google' && styles.googleAvatarFrame]}>{account.avatarUrl ? <Image source={{ uri: account.avatarUrl }} style={styles.avatarImage} /> : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{initial}</Text></View>}</View>
      <View style={styles.profileCopy}><Text numberOfLines={1} style={styles.profileName}>{displayName}</Text><Text numberOfLines={1} style={styles.profileEmail}>{account.email ?? 'Bağlı Wondertide hesabı'}</Text><View style={styles.providerBadge}><Text style={styles.providerBadgeText}>✓ {providerName} ile bağlı</Text></View></View>
    </View>
    <View style={styles.profileStatus}>
      <View style={styles.statusIcon}><Text>☁</Text></View><View style={styles.statusCopy}><Text style={styles.statusTitle}>Bulut kaydı etkin</Text><Text style={styles.statusDetail}>Ada ilerlemen bu hesapla güvenle eşitleniyor.</Text></View>
    </View>
    <View style={styles.profileTip}><Text style={styles.profileTipText}>Yeni bir cihazda aynı {providerName} hesabıyla giriş yaparak macerana kaldığın yerden devam edebilirsin.</Text></View>
    <Pressable disabled={busy} onPress={onSignOut} style={[styles.signOut, busy && styles.disabled]}><Text style={styles.signOutText}>{busy ? 'Çıkış yapılıyor…' : 'Oturumu kapat'}</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'transparent' }, scroll: { flexGrow: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF4D9', padding: 22, paddingBottom: 32, borderTopLeftRadius: 28, borderTopRightRadius: 28 }, handle: { width: 42, height: 5, borderRadius: 5, backgroundColor: '#D6BFA0', alignSelf: 'center', marginBottom: 18 },
  title: { color: '#513C2D', fontSize: 24, fontWeight: '900' }, body: { color: '#81644A', marginTop: 6, marginBottom: 18, lineHeight: 19 }, status: { color: '#81644A', marginTop: 10 }, notice: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: '#E5F2FA', borderWidth: 1, borderColor: '#9FCBE0' }, noticeText: { color: '#2A6683', lineHeight: 18, fontWeight: '700', fontSize: 12 },
  input: { backgroundColor: '#FFFDF7', borderWidth: 1, borderColor: '#E2CBAA', borderRadius: 12, padding: 13, color: '#513C2D', marginBottom: 9 },
  primary: { alignItems: 'center', backgroundColor: '#5EBB42', padding: 14, borderRadius: 13 }, primaryText: { color: '#FFF', fontWeight: '900', fontSize: 16 }, or: { color: '#98795C', alignSelf: 'center', marginVertical: 12, fontWeight: '700' },
  profile: { marginTop: 16 }, profileHero: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 22, backgroundColor: '#E8F3D7', borderWidth: 1, borderColor: '#B9D99B', shadowColor: '#52713A', shadowOpacity: 0.16, shadowRadius: 8, elevation: 3 }, avatarFrame: { width: 68, height: 68, borderRadius: 34, padding: 3, backgroundColor: '#F9FFE9', borderWidth: 2, borderColor: '#7BB95E' }, googleAvatarFrame: { borderColor: '#6FA5FF' }, avatarImage: { width: '100%', height: '100%', borderRadius: 31 }, avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 31, backgroundColor: '#5B9D47' }, avatarText: { color: '#FFF', fontSize: 28, fontWeight: '900' }, profileCopy: { flex: 1, marginLeft: 13 }, profileName: { color: '#304D31', fontSize: 19, fontWeight: '900' }, profileEmail: { color: '#60795A', marginTop: 3, fontSize: 12 }, providerBadge: { alignSelf: 'flex-start', marginTop: 7, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.72)' }, providerBadgeText: { color: '#547B43', fontWeight: '900', fontSize: 10 }, profileStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 16, padding: 14, borderRadius: 17, backgroundColor: '#FFFDF7', borderWidth: 1, borderColor: '#E7D4B6' }, statusIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 11, borderRadius: 20, backgroundColor: '#E0F2FB' }, statusCopy: { flex: 1 }, statusTitle: { color: '#4B6654', fontWeight: '900' }, statusDetail: { color: '#876C53', fontSize: 11, lineHeight: 16, marginTop: 2 }, profileTip: { marginTop: 10, padding: 12, borderRadius: 13, backgroundColor: '#FFF0CF' }, profileTipText: { color: '#8A6636', fontSize: 12, lineHeight: 17, fontWeight: '700' }, signOut: { alignItems: 'center', justifyContent: 'center', minHeight: 46, marginTop: 16, borderRadius: 14, backgroundColor: '#FFF6F3', borderWidth: 1, borderColor: '#F0B9AC' }, signOutText: { color: '#B64E3B', fontWeight: '900' },
  dailyCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, padding: 13, borderRadius: 17, backgroundColor: '#E5F2FA', borderWidth: 1, borderColor: '#9FCBE0' }, dailyLabel: { color: '#39708C', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, dailyTitle: { color: '#28566F', fontSize: 14, fontWeight: '900', marginTop: 2 }, dailyBody: { color: '#5D8496', fontSize: 11, marginTop: 2 }, dailyButton: { minWidth: 48, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 11, borderRadius: 11, backgroundColor: '#4EAD55' }, dailyButtonText: { color: '#FFF', fontWeight: '900' }, dailyDone: { color: '#4B9B50', fontSize: 25, fontWeight: '900', paddingHorizontal: 9 },
  authFlow: { marginTop: 8 }, guestHero: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 16, borderRadius: 18, backgroundColor: '#E8F3D7' }, guestAvatar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#70A957', borderWidth: 3, borderColor: '#F7FFE8' }, guestAvatarText: { color: '#FFF', fontSize: 23, fontWeight: '900' }, guestHeroCopy: { flex: 1, marginLeft: 11 }, guestHeroTitle: { color: '#42613B', fontSize: 16, fontWeight: '900' }, guestHeroText: { color: '#6E8467', fontSize: 12, marginTop: 2 }, authLead: { color: '#81644A', marginTop: 2, marginBottom: 18, lineHeight: 20 }, googleAction: { minHeight: 55, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D7DCE5', shadowColor: '#4B5D73', shadowOpacity: 0.12, shadowRadius: 5, elevation: 2 }, googleMark: { position: 'absolute', left: 13, width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#F5F8FF' }, googleMarkText: { color: '#4285F4', fontWeight: '900', fontSize: 17 }, googleActionText: { color: '#324154', fontSize: 15, fontWeight: '900' }, appleAction: { minHeight: 53, alignItems: 'center', justifyContent: 'center', marginTop: 10, borderRadius: 16, backgroundColor: '#252525' }, appleActionText: { color: '#FFF', fontSize: 15, fontWeight: '900' }, divider: { flexDirection: 'row', alignItems: 'center', gap: 9, marginVertical: 16 }, dividerLine: { flex: 1, height: 1, backgroundColor: '#E5D4BB' }, dividerText: { color: '#A18161', fontSize: 12, fontWeight: '800' }, emailAction: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#F9E7C6', borderWidth: 1, borderColor: '#E5C38C' }, emailActionText: { color: '#755028', fontSize: 15, fontWeight: '900' }, secureNote: { alignItems: 'center', paddingTop: 13 }, secureNoteText: { color: '#79906D', fontSize: 11, fontWeight: '700' }, loginAction: { alignItems: 'center', paddingTop: 17 }, loginActionText: { color: '#6A745D', fontWeight: '700' }, loginActionStrong: { color: '#2A6B8B', fontWeight: '900' }, backAction: { alignItems: 'center', paddingTop: 16 }, backActionText: { color: '#2A6B8B', fontWeight: '800' }, switchMode: { alignItems: 'center', paddingTop: 17 }, switchText: { color: '#2A6B8B', fontWeight: '800' }, later: { alignItems: 'center', padding: 12, marginTop: 1 }, laterText: { color: '#81644A', fontWeight: '800' }, disabled: { opacity: 0.55 },
});
