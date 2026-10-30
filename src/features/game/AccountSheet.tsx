import React, { useEffect, useState } from 'react';
import { Alert, Animated, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronLeft, ChevronRight, CircleCheck, CircleHelp, Cloud, Gift, LockKeyhole, Mail, UserRound } from 'lucide-react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';

import type { GameAccount } from '../../services/auth/authContract';
import { linkNativeAppleIdentity, signInWithNativeApple } from '../../services/auth/nativeAppleAuth';
import { linkNativeGoogleIdentity, signInWithNativeGoogle } from '../../services/auth/nativeGoogleAuth';
import { deleteCurrentAccount, ensureGameAccount, getCurrentGameAccount, linkEmailToGuest, signInWithEmail, signOutToGuest } from '../../services/supabase/authService';
import { useGameStore } from '../../store/gameStore';
import { useSheetDismissGesture } from './useSheetDismissGesture';

type Props = { visible: boolean; onClose: () => void; onStartTutorial: () => void };

export function AccountSheet({ visible, onClose, onStartTutorial }: Props) {
  const { panGesture, sheetStyle } = useSheetDismissGesture(visible, onClose);
  const dailyStreak = useGameStore(state => state.dailyStreak);
  const canClaimDailyReward = useGameStore(state => state.canClaimDailyReward);
  const claimDailyReward = useGameStore(state => state.claimDailyReward);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeProvider, setActiveProvider] = useState<'google' | 'apple' | null>(null);
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
    setActiveProvider(null);
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
    setActiveProvider(provider);
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
      const completed = mode === 'create' ? await linkNativeAppleIdentity() : await signInWithNativeApple();
      if (!completed) return;
      setAccount(await getCurrentGameAccount());
      if (mode === 'create') setNotice('Apple hesabın bağlandı. Ada ilerlemen artık bu hesapla korunuyor.');
      else onClose();
    } catch (error) {
      Alert.alert('Giriş başlatılamadı', error instanceof Error ? error.message : 'Sağlayıcı ayarlarını kontrol et.');
    } finally {
      setBusy(false);
      setActiveProvider(null);
    }
  }

  function handleSignOut() {
    Alert.alert('Oturumu kapat?', 'Bu cihazda misafir olarak devam edebilirsin. Buluttaki ilerlemen hesabında güvende kalır.', [
      { text: 'Kapat', style: 'cancel' },
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

  function handleDeleteAccount() {
    Alert.alert(
      'Hesabı kalıcı olarak sil?',
      'Buluttaki ada ilerlemen ve bağlı hesap bilgilerin kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Hesabı sil',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            deleteCurrentAccount()
              .then(async () => {
                useGameStore.getState().hydrate({});
                const nextAccount = await ensureGameAccount();
                setAccount(nextAccount);
                setAuthStep('welcome');
                setNotice('Hesabın ve bulut kaydın silindi. Yeni bir misafir olarak devam ediyorsun.');
              })
              .catch(error => Alert.alert('Hesap silinemedi', error instanceof Error ? error.message : 'Lütfen tekrar dene.'))
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  }

  const content = <GestureHandlerRootView style={styles.gestureRoot}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}><View style={styles.sheetBackdrop}><Pressable accessibilityLabel="Profil ekranını kapat" onPress={onClose} style={styles.dismissArea} /><GestureDetector gesture={panGesture}><Animated.View style={[styles.sheet, sheetStyle]}>
        <View accessibilityLabel="Profili kapatmak için aşağı sürükle" style={styles.handleTouchArea}><View style={styles.handle} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Profili kapat" hitSlop={8} onPress={onClose} style={styles.closeButton}><Text style={styles.closeButtonText}>×</Text></Pressable>
        <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled" style={styles.contentScroll}>
        <Text style={styles.title}>{account && !account.isAnonymous ? 'Profilin' : authStep === 'welcome' ? 'Profil' : mode === 'create' ? 'Hesabını güvene al' : 'Tekrar hoş geldin'}</Text>
        {loadingAccount ? <Text style={styles.status}>Hesap durumu kontrol ediliyor…</Text> : <><DailyRewardCard streak={dailyStreak} available={canClaimDailyReward()} onClaim={handleDailyReward} />{account && !account.isAnonymous ? <ProfileCard account={account} busy={busy} onSignOut={handleSignOut} onDeleteAccount={handleDeleteAccount} /> : <GuestAuthFlow mode={mode} step={authStep} email={email} password={password} busy={busy} activeProvider={activeProvider} onEmailChange={setEmail} onPasswordChange={setPassword} onGoogle={() => handleProvider('google')} onApple={() => handleProvider('apple')} onStartCreate={() => { setMode('create'); setAuthStep('choice'); }} onStartSignIn={() => { setMode('signIn'); setAuthStep('choice'); }} onOpenEmail={() => setAuthStep('email')} onBack={() => setAuthStep(authStep === 'email' ? 'choice' : 'welcome')} onSubmitEmail={linkEmail} />}</>}
        <Pressable accessibilityRole="button" accessibilityLabel="Nasıl oynanır rehberini başlat" onPress={onStartTutorial} style={styles.tutorialAction}>
          <View style={styles.tutorialIcon}><CircleHelp color="#2A6B8B" size={22} strokeWidth={2.5} /></View>
          <View style={styles.tutorialCopy}><Text style={styles.tutorialTitle}>Nasıl oynanır?</Text><Text style={styles.tutorialBody}>Mira, hedefleri ve birleşimleri adım adım göstersin.</Text></View>
          <ChevronRight color="#2A6B8B" size={21} strokeWidth={2.8} />
        </Pressable>
        {notice ? <View style={styles.notice}><Text style={styles.noticeText}>{notice}</Text></View> : null}
        </ScrollView>
      </Animated.View></GestureDetector></View></KeyboardAvoidingView></GestureHandlerRootView>;

  return <Modal animationType="slide" transparent presentationStyle="overFullScreen" visible={visible} onRequestClose={onClose}>{content}</Modal>;
}

function DailyRewardCard({ streak, available, onClaim }: { streak: number; available: boolean; onClaim: () => void }) {
  const nextDay = Math.min(streak + 1, 7);
  return <View style={styles.dailyCard}><View style={styles.dailyIcon}><Gift color="#39708C" size={20} strokeWidth={2.4} /></View><View style={styles.dailyCopy}><Text style={styles.dailyLabel}>GÜNLÜK KIYI ÖDÜLÜ</Text><Text style={styles.dailyTitle}>{available ? `${nextDay}. gün ödülün hazır` : `${streak}. gün ödülü alındı`}</Text><Text style={styles.dailyBody}>{available ? '+ enerji ve altın seni bekliyor.' : 'Yarın yeniden uğra, seri devam etsin.'}</Text></View>{available ? <Pressable accessibilityLabel="Günlük ödülü al" onPress={onClaim} style={styles.dailyButton}><Text style={styles.dailyButtonText}>Al</Text></Pressable> : <CircleCheck color="#4B9B50" size={25} strokeWidth={2.7} />}</View>;
}

type GuestAuthFlowProps = {
  mode: 'create' | 'signIn'; step: 'welcome' | 'choice' | 'email'; email: string; password: string; busy: boolean; activeProvider: 'google' | 'apple' | null;
  onEmailChange: (value: string) => void; onPasswordChange: (value: string) => void; onGoogle: () => void; onApple: () => void;
  onStartCreate: () => void; onStartSignIn: () => void; onOpenEmail: () => void; onBack: () => void; onSubmitEmail: () => void;
};

function GuestAuthFlow({ mode, step, email, password, busy, activeProvider, onEmailChange, onPasswordChange, onGoogle, onApple, onStartCreate, onStartSignIn, onOpenEmail, onBack, onSubmitEmail }: GuestAuthFlowProps) {
  const isCreate = mode === 'create';

  if (step === 'welcome') {
    return <View style={styles.authFlow}>
      <View style={styles.welcomeHero}><View style={styles.heroIcon}><UserRound color="#FFF" size={28} strokeWidth={2.4} /></View><Text style={styles.welcomeTitle}>Misafir olarak oynuyorsun</Text><Text style={styles.welcomeText}>İlerlemen şu an yalnızca bu cihazda. Bir hesap bağlayarak adanı tüm cihazlarında yanında taşı.</Text></View>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onStartCreate} style={[styles.primaryAction, styles.welcomePrimaryAction]}><Text style={styles.primaryText}>Hesap oluştur</Text><ChevronRight color="#FFF" size={20} strokeWidth={2.8} /></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onStartSignIn} style={styles.loginActionModern}><Text style={styles.loginActionText}>Zaten hesabın var mı?</Text><Text style={styles.loginActionStrong}>Giriş yap</Text></Pressable>
    </View>;
  }

  if (step === 'email') {
    return <View style={styles.authFlow}>
      <Text style={styles.authLead}>{isCreate ? 'E-posta hesabını bağla; ilerlemen her cihazda yanında olsun.' : 'E-posta ve şifrenle buluttaki adana dön.'}</Text>
      <Text style={styles.fieldLabel}>E-posta adresi</Text><View style={styles.inputWrap}><Mail color="#8A735C" size={20} /><TextInput accessibilityLabel="E-posta adresi" value={email} onChangeText={onEmailChange} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="ornek@eposta.com" placeholderTextColor="#A38771" style={styles.input} /></View>
      <Text style={styles.fieldLabel}>Şifre</Text><View style={styles.inputWrap}><LockKeyhole color="#8A735C" size={20} /><TextInput accessibilityLabel="Şifre" value={password} onChangeText={onPasswordChange} secureTextEntry placeholder={isCreate ? 'En az 8 karakter' : 'Şifreni gir'} placeholderTextColor="#A38771" style={styles.input} /></View>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onSubmitEmail} style={[styles.primaryAction, busy && styles.disabled]}><Text style={styles.primaryText}>{busy ? 'Bekle…' : isCreate ? 'Hesabı bağla' : 'Giriş yap'}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onBack} style={styles.backActionModern}><ChevronLeft color="#2A6B8B" size={17} strokeWidth={2.8} /><Text style={styles.backActionText}>Diğer giriş yöntemleri</Text></Pressable>
    </View>;
  }

  return <View style={styles.authFlow}>
    <Pressable accessibilityRole="button" disabled={busy} onPress={onGoogle} style={[styles.googleAction, busy && styles.disabled]}><View style={styles.googleMark}><GoogleMark /></View><Text style={styles.googleActionText}>{activeProvider === 'google' ? 'Google açılıyor…' : `Google ile ${isCreate ? 'devam et' : 'giriş yap'}`}</Text></Pressable>
    {Platform.OS === 'ios' ? <Pressable accessibilityRole="button" accessibilityLabel={activeProvider === 'apple' ? 'Apple açılıyor' : `Apple ile ${isCreate ? 'devam et' : 'giriş yap'}`} disabled={busy} onPress={onApple} style={[styles.appleAction, busy && styles.disabled]}><Text style={styles.appleLogo}></Text><Text style={styles.appleActionText}>{activeProvider === 'apple' ? 'Apple açılıyor…' : `Apple ile ${isCreate ? 'devam et' : 'giriş yap'}`}</Text></Pressable> : null}
    <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>veya</Text><View style={styles.dividerLine} /></View>
    <Pressable accessibilityRole="button" disabled={busy} onPress={onOpenEmail} style={[styles.emailActionModern, busy && styles.disabled]}><Mail color="#755028" size={20} strokeWidth={2.4} /><Text style={styles.emailActionText}>E-posta ile devam et</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={busy} onPress={onBack} style={styles.switchModeModern}><ChevronLeft color="#2A6B8B" size={17} strokeWidth={2.8} /><Text style={styles.switchText}>Profil ekranına dön</Text></Pressable>
  </View>;
}

function GoogleMark() {
  return <Svg accessibilityLabel="Google" height={20} width={20} viewBox="0 0 24 24">
    <Path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.21-2.27H12v4.3h5.22a4.46 4.46 0 0 1-1.93 2.93v2.79h3.59c2.1-1.94 3.31-4.8 3.31-7.75Z" />
    <Path fill="#34A853" d="M12 21.82c2.64 0 4.86-.87 6.48-2.36l-3.59-2.79c-1 .67-2.28 1.07-3.78 1.07-2.9 0-5.36-1.96-6.24-4.59H1.16v2.88A9.78 9.78 0 0 0 12 21.82Z" />
    <Path fill="#FBBC05" d="M4.87 13.15a5.88 5.88 0 0 1 0-3.75V6.52H1.16a9.81 9.81 0 0 0 0 9.51l3.71-2.88Z" />
    <Path fill="#EA4335" d="M12 5.81c1.61 0 3.06.55 4.2 1.63l3.15-3.15C16.85 1.96 14.64 1 12 1A9.78 9.78 0 0 0 1.16 6.52l3.71 2.88C5.75 7.77 8.21 5.81 12 5.81Z" />
  </Svg>;
}

function ProfileCard({ account, busy, onSignOut, onDeleteAccount }: { account: GameAccount; busy: boolean; onSignOut: () => void; onDeleteAccount: () => void }) {
  const providerName = account.provider === 'google' ? 'Google' : account.provider === 'apple' ? 'Apple' : 'E-posta';
  const displayName = account.displayName || account.email?.split('@')[0] || 'Wondertide Kaşifi';
  const initial = displayName.trim().charAt(0).toLocaleUpperCase('tr-TR');

  return <View style={styles.profile}>
    <View style={styles.profileHero}>
      <View style={[styles.avatarFrame, account.provider === 'google' && styles.googleAvatarFrame]}>{account.avatarUrl ? <Image source={{ uri: account.avatarUrl }} style={styles.avatarImage} /> : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{initial}</Text></View>}</View>
      <View style={styles.profileCopy}><Text numberOfLines={1} style={styles.profileName}>{displayName}</Text><Text numberOfLines={1} style={styles.profileEmail}>{account.email ?? 'Bağlı Wondertide hesabı'}</Text><View style={styles.providerBadge}><Text style={styles.providerBadgeText}>✓ {providerName} ile bağlı</Text></View></View>
    </View>
    <View style={styles.profileStatus}>
      <View style={styles.statusIcon}><Cloud color="#39708C" size={20} strokeWidth={2.4} /></View><View style={styles.statusCopy}><Text style={styles.statusTitle}>Bulut kaydı etkin</Text><Text style={styles.statusDetail}>Ada ilerlemen bu hesapla güvenle eşitleniyor.</Text></View><CircleCheck color="#4B9B50" size={21} strokeWidth={2.7} />
    </View>
    <View style={styles.profileTip}><Text style={styles.profileTipText}>Yeni bir cihazda aynı {providerName} hesabıyla giriş yaparak macerana kaldığın yerden devam edebilirsin.</Text></View>
    <Pressable disabled={busy} onPress={onSignOut} style={[styles.signOut, busy && styles.disabled]}><Text style={styles.signOutText}>{busy ? 'Çıkış yapılıyor…' : 'Oturumu kapat'}</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={busy} onPress={onDeleteAccount} style={[styles.deleteAccount, busy && styles.disabled]}><Text style={styles.deleteAccountText}>Hesabı kalıcı olarak sil</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 }, backdrop: { flex: 1, backgroundColor: 'transparent' }, sheetBackdrop: { flex: 1, justifyContent: 'flex-end' }, dismissArea: { ...StyleSheet.absoluteFill },
  sheet: { maxHeight: '88%', backgroundColor: '#FFF4D9', borderTopLeftRadius: 28, borderTopRightRadius: 28 }, contentScroll: { flexShrink: 1 }, sheetContent: { padding: 22, paddingTop: 0, paddingBottom: 32 }, handleTouchArea: { width: 96, height: 36, alignSelf: 'center', justifyContent: 'center', marginTop: 2, marginBottom: 2 }, handle: { width: 42, height: 5, borderRadius: 5, backgroundColor: '#D6BFA0', alignSelf: 'center' }, closeButton: { position: 'absolute', top: 12, right: 14, width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#F2E2C5', zIndex: 1 }, closeButtonText: { color: '#795331', fontSize: 25, lineHeight: 27, fontWeight: '700' },
  title: { color: '#513C2D', fontSize: 24, fontWeight: '900' }, body: { color: '#81644A', marginTop: 6, marginBottom: 18, lineHeight: 19 }, status: { color: '#81644A', marginTop: 10 }, notice: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: '#E5F2FA', borderWidth: 1, borderColor: '#9FCBE0' }, noticeText: { color: '#2A6683', lineHeight: 18, fontWeight: '700', fontSize: 12 },
  tutorialAction: { flexDirection: 'row', alignItems: 'center', marginTop: 16, padding: 13, borderRadius: 17, backgroundColor: '#E5F2FA', borderWidth: 1, borderColor: '#9FCBE0' }, tutorialIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#FFF' }, tutorialCopy: { flex: 1, marginHorizontal: 11 }, tutorialTitle: { color: '#2A6683', fontSize: 14, fontWeight: '900' }, tutorialBody: { color: '#527D91', fontSize: 11, lineHeight: 15, marginTop: 2, fontWeight: '600' },
  input: { flex: 1, paddingVertical: 13, paddingRight: 13, paddingLeft: 10, color: '#513C2D', fontSize: 15 }, inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFDF7', borderWidth: 1, borderColor: '#E2CBAA', borderRadius: 14, paddingLeft: 13, marginBottom: 14 }, fieldLabel: { color: '#5E4838', fontWeight: '800', fontSize: 12, marginBottom: 6 },
  primary: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4AA63A', paddingHorizontal: 16, borderRadius: 16, shadowColor: '#326D28', shadowOpacity: 0.24, shadowOffset: { width: 0, height: 3 }, shadowRadius: 5, elevation: 3 }, primaryText: { color: '#FFF', fontWeight: '900', fontSize: 16 }, or: { color: '#98795C', alignSelf: 'center', marginVertical: 12, fontWeight: '700' },
  profile: { marginTop: 16 }, profileHero: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 22, backgroundColor: '#E8F3D7', borderWidth: 1, borderColor: '#B9D99B', shadowColor: '#52713A', shadowOpacity: 0.16, shadowRadius: 8, elevation: 3 }, avatarFrame: { width: 68, height: 68, borderRadius: 34, padding: 3, backgroundColor: '#F9FFE9', borderWidth: 2, borderColor: '#7BB95E' }, googleAvatarFrame: { borderColor: '#6FA5FF' }, avatarImage: { width: '100%', height: '100%', borderRadius: 31 }, avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 31, backgroundColor: '#5B9D47' }, avatarText: { color: '#FFF', fontSize: 28, fontWeight: '900' }, profileCopy: { flex: 1, marginLeft: 13 }, profileName: { color: '#304D31', fontSize: 19, fontWeight: '900' }, profileEmail: { color: '#60795A', marginTop: 3, fontSize: 12 }, providerBadge: { alignSelf: 'flex-start', marginTop: 7, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.72)' }, providerBadgeText: { color: '#547B43', fontWeight: '900', fontSize: 10 }, profileStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 16, padding: 14, borderRadius: 17, backgroundColor: '#FFFDF7', borderWidth: 1, borderColor: '#E7D4B6' }, statusIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 11, borderRadius: 20, backgroundColor: '#E0F2FB' }, statusCopy: { flex: 1 }, statusTitle: { color: '#4B6654', fontWeight: '900' }, statusDetail: { color: '#876C53', fontSize: 11, lineHeight: 16, marginTop: 2 }, profileTip: { marginTop: 10, padding: 12, borderRadius: 13, backgroundColor: '#FFF0CF' }, profileTipText: { color: '#8A6636', fontSize: 12, lineHeight: 17, fontWeight: '700' }, signOut: { alignItems: 'center', justifyContent: 'center', minHeight: 46, marginTop: 16, borderRadius: 14, backgroundColor: '#FFF6F3', borderWidth: 1, borderColor: '#F0B9AC' }, signOutText: { color: '#B64E3B', fontWeight: '900' }, deleteAccount: { alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 10, borderRadius: 14, backgroundColor: '#FFE9E5', borderWidth: 1, borderColor: '#DF7665' }, deleteAccountText: { color: '#A64032', fontSize: 13, fontWeight: '900' },
  dailyCard: { flexDirection: 'row', alignItems: 'center', marginTop: 14, padding: 13, borderRadius: 17, backgroundColor: '#E5F2FA', borderWidth: 1, borderColor: '#9FCBE0' }, dailyIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#F5FCFF', marginRight: 10 }, dailyCopy: { flex: 1 }, dailyLabel: { color: '#39708C', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, dailyTitle: { color: '#28566F', fontSize: 14, fontWeight: '900', marginTop: 2 }, dailyBody: { color: '#5D8496', fontSize: 11, marginTop: 2 }, dailyButton: { minWidth: 48, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 11, borderRadius: 11, backgroundColor: '#4EAD55' }, dailyButtonText: { color: '#FFF', fontWeight: '900' }, dailyDone: { color: '#4B9B50', fontSize: 25, fontWeight: '900', paddingHorizontal: 9 },
  authFlow: { marginTop: 8 }, guestHero: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 16, borderRadius: 18, backgroundColor: '#E8F3D7' }, guestAvatar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#70A957', borderWidth: 3, borderColor: '#F7FFE8' }, guestAvatarText: { color: '#FFF', fontSize: 23, fontWeight: '900' }, guestHeroCopy: { flex: 1, marginLeft: 11 }, guestHeroTitle: { color: '#42613B', fontSize: 16, fontWeight: '900' }, guestHeroText: { color: '#6E8467', fontSize: 12, marginTop: 2 }, authLead: { color: '#81644A', marginTop: 2, marginBottom: 18, lineHeight: 20 }, googleAction: { minHeight: 55, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D7DCE5', shadowColor: '#4B5D73', shadowOpacity: 0.12, shadowRadius: 5, elevation: 2 }, googleMark: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#F5F8FF', marginRight: 9 }, googleActionText: { color: '#324154', fontSize: 15, fontWeight: '900' }, appleAction: { minHeight: 55, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, marginTop: 10, backgroundColor: '#111827' }, appleLogo: { color: '#FFF', fontSize: 22, lineHeight: 24, marginRight: 9 }, appleActionText: { color: '#FFF', fontSize: 15, fontWeight: '900' }, divider: { flexDirection: 'row', alignItems: 'center', gap: 9, marginVertical: 16 }, dividerLine: { flex: 1, height: 1, backgroundColor: '#E5D4BB' }, dividerText: { color: '#A18161', fontSize: 12, fontWeight: '800' }, emailAction: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#F9E7C6', borderWidth: 1, borderColor: '#E5C38C' }, emailActionText: { color: '#755028', fontSize: 15, fontWeight: '900' }, secureNote: { alignItems: 'center', paddingTop: 13 }, secureNoteText: { color: '#79906D', fontSize: 11, fontWeight: '700' }, loginAction: { alignItems: 'center', paddingTop: 17 }, loginActionText: { color: '#6A745D', fontWeight: '700' }, loginActionStrong: { color: '#2A6B8B', fontWeight: '900' }, backAction: { alignItems: 'center', paddingTop: 16 }, backActionText: { color: '#2A6B8B', fontWeight: '800' }, switchMode: { alignItems: 'center', paddingTop: 17 }, switchText: { color: '#2A6B8B', fontWeight: '800' }, disabled: { opacity: 0.55 },
  welcomeHero: { alignItems: 'center', paddingHorizontal: 19, paddingVertical: 21, borderRadius: 22, backgroundColor: '#E8F3D7', borderWidth: 1, borderColor: '#C4DEAA' },
  welcomePrimaryAction: { marginTop: 10 },
  heroIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: '#5C9B4D', shadowColor: '#3B6E31', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 3 }, shadowRadius: 5, elevation: 3 },
  welcomeTitle: { marginTop: 11, color: '#385631', fontSize: 19, fontWeight: '900' },
  welcomeText: { marginTop: 6, color: '#647E5E', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  primaryAction: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4AA63A', paddingHorizontal: 16, borderRadius: 16, shadowColor: '#326D28', shadowOpacity: 0.24, shadowOffset: { width: 0, height: 3 }, shadowRadius: 5, elevation: 3 },
  loginActionModern: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingTop: 17 },
  backActionModern: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, paddingTop: 16 },
  choiceIntro: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  choiceIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#E5F2FA' },
  choiceLead: { flex: 1, color: '#81644A', lineHeight: 20, marginTop: 1 },
  emailActionModern: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 16, backgroundColor: '#F9E7C6', borderWidth: 1, borderColor: '#E5C38C' },
  switchModeModern: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, paddingTop: 17 },
});
