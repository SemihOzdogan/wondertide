import React, { useEffect, useRef } from 'react';
import { Animated, ImageBackground, Modal, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import type { StoryTask } from '../../domain/game';

type Props = { task: StoryTask | null; location: string; scene: ImageSourcePropType; onClose: () => void };

export function TaskRewardModal({ task, location, scene, onClose }: Props) {
  const stars = useRef(new Animated.Value(0)).current;
  const chest = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    if (!task) return;
    stars.setValue(0);
    chest.setValue(0.88);
    Animated.parallel([
      Animated.spring(stars, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.spring(chest, { toValue: 1, friction: 5, delay: 180, useNativeDriver: true }),
    ]).start();
  }, [chest, stars, task]);

  if (!task) return null;
  return <Modal visible animationType="fade" onRequestClose={onClose}>
    <ImageBackground source={scene} style={styles.scene} imageStyle={styles.sceneImage}>
      <View style={styles.titleArea}>
        <Text style={styles.kicker}>{location.toUpperCase()} · GÖREV TAMAMLANDI</Text>
        <Text numberOfLines={2} adjustsFontSizeToFit style={styles.title}>{task.title}</Text>
        <Animated.View style={[styles.stars, { opacity: stars, transform: [{ scale: stars }] }]}>
          <Text style={styles.star}>★</Text><Text style={styles.star}>★</Text><Text style={styles.star}>★</Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.rewardArea, { transform: [{ scale: chest }] }]}>
        <Text style={styles.rewardLabel}>Ödüller</Text>
        <View style={styles.rewardCard}>
          <Reward icon="●" iconStyle={styles.coinIcon} value={`+${task.reward.coins}`} label="Altın" />
          {task.reward.gems ? <Reward icon="◆" iconStyle={styles.gemIcon} value={`+${task.reward.gems}`} label="Mücevher" /> : null}
        </View>
        <Pressable accessibilityLabel="Ödülleri al" onPress={onClose} style={styles.button}>
          <Text style={styles.buttonText}>Harika!</Text>
        </Pressable>
      </Animated.View>
    </ImageBackground>
  </Modal>;
}

function Reward({ icon, value, label, iconStyle }: { icon: string; value: string; label: string; iconStyle: object }) {
  return <View style={styles.reward}><Text style={[styles.rewardIcon, iconStyle]}>{icon}</Text><Text style={styles.rewardValue}>{value}</Text><Text style={styles.rewardName}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  scene: { flex: 1, justifyContent: 'space-between' },
  sceneImage: { resizeMode: 'cover' },
  titleArea: { alignItems: 'center', paddingTop: 78 },
  kicker: { color: '#FFF5D4', fontSize: 12, fontWeight: '900', letterSpacing: 2.4, textShadowColor: '#70411D', textShadowRadius: 5 },
  title: { maxWidth: '90%', color: '#FFF9E8', fontSize: 36, fontWeight: '900', lineHeight: 39, textAlign: 'center', textShadowColor: '#71411D', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 3, marginTop: 4 },
  stars: { flexDirection: 'row', gap: 8, marginTop: 10 }, star: { color: '#FFD342', fontSize: 35, textShadowColor: '#AA6718', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 2 },
  rewardArea: { alignItems: 'center', paddingHorizontal: 21, paddingBottom: 29 },
  rewardLabel: { color: '#6A4829', backgroundColor: '#FFF0C7', borderRadius: 14, paddingHorizontal: 23, paddingVertical: 6, fontWeight: '900', fontSize: 13, zIndex: 1, marginBottom: -8, borderWidth: 2, borderColor: '#E4B76D' },
  rewardCard: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#FFF4DA', borderRadius: 20, paddingTop: 21, paddingBottom: 15, borderWidth: 3, borderColor: '#FCE6B7', shadowColor: '#4A2C17', shadowOpacity: 0.35, shadowRadius: 8, elevation: 8 },
  reward: { alignItems: 'center', minWidth: 73 }, rewardIcon: { fontSize: 35, lineHeight: 38, fontWeight: '900' }, coinIcon: { color: '#F9B923', textShadowColor: '#A96A0D', textShadowRadius: 2 }, gemIcon: { color: '#A65DE4', textShadowColor: '#57298F', textShadowRadius: 2 },
  rewardValue: { color: '#6B4422', fontSize: 16, fontWeight: '900', marginTop: 1 }, rewardName: { color: '#9C7857', fontSize: 10, fontWeight: '800', marginTop: 1 },
  button: { alignSelf: 'stretch', alignItems: 'center', marginTop: 13, paddingVertical: 14, backgroundColor: '#53B939', borderRadius: 15, borderWidth: 3, borderColor: '#C9F08B', shadowColor: '#245D21', shadowOpacity: 0.55, shadowOffset: { width: 0, height: 4 }, shadowRadius: 2, elevation: 8 }, buttonText: { color: '#FFF', fontSize: 21, fontWeight: '900', textShadowColor: '#287724', textShadowRadius: 2 },
});
