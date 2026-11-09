import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { CircleHelp, Music2, Sparkles, Volume2 } from 'lucide-react-native';

import { useGameStore } from '../../store/gameStore';

type Props = {
  visible: boolean;
  onClose: () => void;
  onStartTutorial: () => void;
};

export function GameSettingsSheet({ visible, onClose, onStartTutorial }: Props) {
  const musicEnabled = useGameStore(state => state.musicEnabled);
  const effectsEnabled = useGameStore(state => state.effectsEnabled);
  const setAudioSettings = useGameStore(state => state.setAudioSettings);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Oyun ayarlarını kapat"
          onPress={onClose}
          style={styles.dismissArea}
        />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.headerIcon}>
                <Volume2 color="#FFF4DF" size={23} strokeWidth={2.5} />
              </View>
              <View>
              <Text style={styles.eyebrow}>OYUN AYARLARI</Text>
              <Text style={styles.title}>Ses ve deneyim</Text>
              </View>
            </View>
            <Pressable accessibilityLabel="Kapat" onPress={onClose} style={styles.close}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Kıyı macerasını kendi ritmine göre ayarla.</Text>
          <View style={styles.settingsGroup}>
          <AudioToggle
            icon={<Music2 color="#27738E" size={21} strokeWidth={2.4} />}
            label="Oyun müziği"
            description="Arka plandaki atmosferik müzik"
            enabled={musicEnabled}
            onValueChange={value => setAudioSettings({ musicEnabled: value })}
          />
          <AudioToggle
            icon={<Sparkles color="#B27530" size={21} strokeWidth={2.4} />}
            label="Ses efektleri"
            description="Birleşim ve oyun hareketleri"
            enabled={effectsEnabled}
            onValueChange={value => setAudioSettings({ effectsEnabled: value })}
            last
          />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nasıl oynanır rehberini başlat"
            onPress={onStartTutorial}
            style={styles.tutorialAction}
          >
            <View style={styles.tutorialIcon}>
              <CircleHelp color="#2A6B8B" size={21} strokeWidth={2.5} />
            </View>
            <View style={styles.tutorialCopy}>
              <Text style={styles.tutorialTitle}>Nasıl oynanır?</Text>
              <Text style={styles.tutorialBody}>
                Mira, hedefleri ve birleşimleri adım adım göstersin.
              </Text>
            </View>
            <Text style={styles.tutorialArrow}>›</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function AudioToggle({
  icon,
  label,
  description,
  enabled,
  onValueChange,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onValueChange: (value: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.lastRow]}>
      <View style={[styles.rowIcon, !enabled && styles.rowIconOff]}>{icon}</View>
      <View style={styles.rowCopy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <View style={styles.rowControl}>
        <Text style={[styles.state, !enabled && styles.stateOff]}>{enabled ? 'Açık' : 'Kapalı'}</Text>
        <Switch
          accessibilityLabel={`${label} ${enabled ? 'açık' : 'kapalı'}`}
          value={enabled}
          onValueChange={onValueChange}
          trackColor={{ false: '#D5C4AD', true: '#84B8C7' }}
          thumbColor={enabled ? '#24718B' : '#F4E7D4'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(4, 24, 36, 0.62)' },
  dismissArea: { ...StyleSheet.absoluteFill, backgroundColor: 'transparent' },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: 22,
    borderRadius: 30,
    backgroundColor: '#FFF8EC',
    borderWidth: 1.5,
    borderColor: '#E7C98E',
    shadowColor: '#1B4050',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  headerIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#27738E' },
  eyebrow: { color: '#39708C', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: '#68462B', fontSize: 23, fontWeight: '900', marginTop: 3 },
  subtitle: { color: '#8D7154', fontSize: 13, lineHeight: 19, marginTop: 15, marginBottom: 15 },
  close: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#F2DEC0' },
  closeText: { color: '#68462B', fontSize: 25, lineHeight: 28 },
  settingsGroup: { paddingHorizontal: 13, borderRadius: 20, backgroundColor: '#FFF1D9', borderWidth: 1, borderColor: '#F0DDBD' },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EAD8BB' },
  lastRow: { borderBottomWidth: 0 },
  rowIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#DDF0F5' },
  rowIconOff: { opacity: 0.45 },
  rowCopy: { flex: 1, marginHorizontal: 11 },
  label: { color: '#68462B', fontSize: 15, fontWeight: '900' },
  description: { color: '#9A7C5D', fontSize: 11, lineHeight: 15, marginTop: 3 },
  rowControl: { alignItems: 'flex-end', gap: 1 },
  state: { color: '#27738E', fontSize: 10, fontWeight: '900' },
  stateOff: { color: '#A28C76' },
  tutorialAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    padding: 13,
    borderRadius: 17,
    backgroundColor: '#E5F2FA',
    borderWidth: 1,
    borderColor: '#9FCBE0',
  },
  tutorialIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
  },
  tutorialCopy: { flex: 1, marginHorizontal: 10 },
  tutorialTitle: { color: '#2A6683', fontSize: 14, fontWeight: '900' },
  tutorialBody: { color: '#527D91', fontSize: 11, lineHeight: 15, marginTop: 2, fontWeight: '600' },
  tutorialArrow: { color: '#2A6B8B', fontSize: 28, fontWeight: '300' },
});
