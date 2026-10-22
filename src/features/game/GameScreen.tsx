import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { storyChapters } from '../../content/stories';
import type { MergeTile, ResourceKind, StoryTask } from '../../domain/game';
import { useGameStore } from '../../store/gameStore';
import { AccountSheet } from './AccountSheet';
import { StoryMapSheet } from './StoryMapSheet';
import { TaskRewardModal } from './TaskRewardModal';
import type { RootStackParamList } from '../../navigation/types';

const resources: ResourceKind[] = ['driftwood', 'seaGlass', 'shell'];
const defaultIslandImage = require('../../../assets/images/serin-kiyi-home-v2.png');
const islandImages: Record<string, number> = {
  'lighthouse-tales': defaultIslandImage,
  'moonlit-harbor': require('../../../assets/images/moonlit-harbor-bg-v1.png'),
  'coral-cove': require('../../../assets/images/coral-cove-bg-v1.png'),
  'stormwatch-cliffs': require('../../../assets/images/stormwatch-cliffs-bg-v1.png'),
};
const miraImage = require('../../../assets/images/mira-guide.png');
const miraQuestImage = require('../../../assets/images/mira-quest-portrait-v1.png');
const logoImage = require('../../../assets/images/wondertide-logo-v1.png');
const hudCoinImage = require('../../../assets/images/hud-coin-v1.png');
const hudGemImage = require('../../../assets/images/hud-gem-v1.png');
const itemImages: Record<ResourceKind, number> = {
  driftwood: require('../../../assets/images/item-driftwood.png'),
  seaGlass: require('../../../assets/images/item-sea-glass.png'),
  shell: require('../../../assets/images/item-shell.png'),
};

type Props = { mode: 'island' | 'board'; overlay?: 'tasks' | 'account'; overlayOpenId?: number; onOpenBoard?: () => void; hasBottomTab?: boolean };

export function GameScreen({ mode, overlay, overlayOpenId, onOpenBoard, hasBottomTab = false }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [accountVisible, setAccountVisible] = useState(overlay === 'account');
  const [storyMapVisible, setStoryMapVisible] = useState(overlay === 'tasks');
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [boardMessage, setBoardMessage] = useState('İki aynı türdeki parçayı seçerek birleştir.');
  const [clock, setClock] = useState(() => Date.now());
  const [showBurst, setShowBurst] = useState(false);
  const [rewardTask, setRewardTask] = useState<StoryTask | null>(null);
  const burst = useRef(new Animated.Value(0)).current;
  const store = useGameStore();
  const { energy, maxEnergy, lastEnergyRefreshAt, coins, gems, inventory, board, storyProgress } = store;
  const occupiedTileCount = board.filter(Boolean).length;
  const activeChapter = storyChapters.find(chapter => chapter.id === storyProgress.chapterId) ?? storyChapters[0];
  const activeIndex = storyChapters.findIndex(chapter => chapter.id === activeChapter.id);
  const nextChapter = storyChapters[activeIndex + 1];
  const islandImage = islandImages[activeChapter.id] ?? defaultIslandImage;
  const activeTask = useMemo(() => activeChapter.tasks.find(task => !storyProgress.completedTaskIds.includes(task.id)), [activeChapter, storyProgress.completedTaskIds]);
  const chapterComplete = !activeTask;
  const taskReady = activeTask ? store.canComplete(activeTask) : false;
  const nextEnergy = useMemo(() => {
    if (energy >= maxEnergy) return 'Enerji dolu';
    const elapsed = Math.max(0, clock - new Date(lastEnergyRefreshAt).getTime());
    const remaining = 300_000 - (elapsed % 300_000);
    return `${Math.floor(remaining / 60_000)}:${Math.floor((remaining % 60_000) / 1000).toString().padStart(2, '0')} sonra +1 enerji`;
  }, [clock, energy, lastEnergyRefreshAt, maxEnergy]);

  useEffect(() => { const timer = setInterval(() => { store.refreshEnergy(); setClock(Date.now()); }, 1_000); return () => clearInterval(timer); }, [store]);
  useEffect(() => {
    if (!overlay) return;
    const onFocus = navigation.addListener('focus', () => {
      if (overlay === 'tasks') setStoryMapVisible(true);
      if (overlay === 'account') setAccountVisible(true);
    });
    const onBlur = navigation.addListener('blur', () => {
      setStoryMapVisible(false);
      setAccountVisible(false);
    });
    return () => { onFocus(); onBlur(); };
  }, [navigation, overlay]);
  useEffect(() => {
    if (overlay === 'tasks') setStoryMapVisible(true);
    if (overlay === 'account') setAccountVisible(true);
  }, [overlay, overlayOpenId]);

  function selectTile(tileId: string) {
    if (!selectedTileId) { setSelectedTileId(tileId); setBoardMessage('Şimdi eşleşen ikinci parçayı seç.'); return; }
    if (selectedTileId === tileId) { setSelectedTileId(null); setBoardMessage('Seçim kaldırıldı.'); return; }
    if (store.mergeTiles(selectedTileId, tileId)) {
      setSelectedTileId(null); setBoardMessage('Birleşim tamamlandı!'); setShowBurst(true); burst.setValue(0.55);
      Animated.sequence([Animated.spring(burst, { toValue: 1, friction: 4, useNativeDriver: true }), Animated.timing(burst, { toValue: 1.45, duration: 360, useNativeDriver: true })]).start(() => setShowBurst(false));
      return;
    }
    setSelectedTileId(tileId); setBoardMessage('Aynı türdeki iki parçayı eşleştir.');
  }

  function selectEmptyCell(index: number) {
    if (!selectedTileId) { setBoardMessage('Bir parçayı seç, sonra boş bir kareye dokun.'); return; }
    if (store.moveTile(selectedTileId, index)) {
      setSelectedTileId(null);
      setBoardMessage('Parça taşındı. Eşini bulup birleştir!');
    }
  }

  function handleTaskAction() {
    if (!activeTask) {
      if (nextChapter) store.selectChapter(nextChapter.id);
      return;
    }
    if (!taskReady) {
      if (onOpenBoard) onOpenBoard();
      else navigation.navigate('Board');
      return;
    }
    if (store.completeTask(activeTask)) setRewardTask(activeTask);
  }

  return <View style={styles.root}>
    {mode === 'island' ? <ImageBackground source={islandImage} style={styles.islandScreen} imageStyle={styles.islandBackground}>
      <View style={styles.darkVeil} />
      <TopBar topInset={insets.top} energy={energy} coins={coins} gems={gems} />
      <View style={[styles.sideActions, { top: insets.top + 148 }]}><RoundButton icon="⚙" label="Hesap" onPress={() => setAccountVisible(true)} /><RoundButton icon="✦" label="Hikâye haritası" onPress={() => setStoryMapVisible(true)} /></View>
      <View style={[styles.islandQuest, { bottom: 87 + insets.bottom }]}><Image source={miraQuestImage} style={styles.islandMira} resizeMode="contain" /><View style={styles.questSpeech}><View style={styles.questHeader}><Text style={styles.questLocation}>{activeChapter.location.toUpperCase()}</Text><Text style={styles.questProgress}>{activeChapter.tasks.filter(task => storyProgress.completedTaskIds.includes(task.id)).length}/{activeChapter.tasks.length}</Text></View><Text numberOfLines={2} style={styles.questTitle}>{chapterComplete ? nextChapter ? 'Bölüm tamamlandı!' : 'Tüm görevler tamamlandı!' : activeTask?.title}</Text>{activeTask ? <><Text numberOfLines={2} style={styles.questDescription}>{activeTask.description}</Text><RequirementLine task={activeTask} inventory={inventory} /></> : <Text style={styles.chapterCompleteText}>{nextChapter ? 'Yeni kıyı seni bekliyor.' : 'Yeni maceralar yakında burada olacak.'}</Text>}{(!chapterComplete || nextChapter) ? <Pressable onPress={handleTaskAction} style={[styles.questButton, taskReady && styles.questCompleteButton]}><View pointerEvents="none" style={styles.questButtonGloss} /><Text style={styles.questButtonText}>{chapterComplete ? 'Başla' : taskReady ? 'Tamamla' : 'Yap'}</Text></Pressable> : null}</View></View>
    </ImageBackground> : <View style={[styles.boardScreen, hasBottomTab && { paddingBottom: 87 + insets.bottom }]}>
      <TopBar topInset={insets.top} energy={energy} coins={coins} gems={gems} />
      <View style={styles.boardIntro}><Image source={miraImage} style={styles.boardMira} resizeMode="contain" /><View style={styles.boardSpeech}><Text style={styles.boardSpeechTitle}>{chapterComplete ? 'Tüm görevler tamamlandı!' : activeTask?.title}</Text><Text style={styles.boardSpeechBody}>{chapterComplete ? 'Yeni maceralar yakında burada olacak.' : boardMessage}</Text></View></View>
      <View style={styles.gameBoard}>{Array.from({ length: 30 }, (_, index) => { const tile = board[index]; return tile ? <MergeTileButton key={tile.id} tile={tile} selected={tile.id === selectedTileId} onPress={() => selectTile(tile.id)} /> : <Pressable key={`empty-${index}`} onPress={() => selectEmptyCell(index)} style={styles.emptyCell} />; })}{showBurst ? <Animated.View pointerEvents="none" style={[styles.burst, { transform: [{ scale: burst }] }]}><Text style={styles.burstText}>✨ Birleşim! ✨</Text></Animated.View> : null}</View>
      <View style={styles.boardFooter}><Text style={styles.energyHint}>{nextEnergy}</Text><View style={styles.recipeBar}><View style={styles.recipeSlot}><Text style={styles.recipeIcon}>{selectedTileId ? '✨' : '?'}</Text></View><Text style={styles.recipeText}>Birleştir</Text><Text style={styles.recipeArrow}>➜</Text><View style={styles.recipeSlot}><Text style={styles.recipeIcon}>🏮</Text></View><Pressable disabled={energy < 1 || occupiedTileCount >= 30} onPress={store.generateTile} style={[styles.recipeAction, (energy < 1 || occupiedTileCount >= 30) && styles.disabled]}><Text style={styles.recipeActionText}>+</Text></Pressable></View></View>
    </View>}
    <AccountSheet visible={accountVisible} onClose={() => setAccountVisible(false)} />
    <StoryMapSheet visible={storyMapVisible} chapters={storyChapters} activeChapterId={activeChapter.id} unlockedChapterIds={storyProgress.unlockedChapterIds} completedTaskIds={storyProgress.completedTaskIds} inventory={inventory} onChoose={store.selectChapter} onClose={() => setStoryMapVisible(false)} />
    <TaskRewardModal task={rewardTask} location={activeChapter.location} scene={islandImage} onClose={() => setRewardTask(null)} />
    <Modal transparent presentationStyle="overFullScreen" visible={!store.hasSeenIntro} animationType="fade"><View style={styles.introBackdrop}><View style={styles.introCard}><Image source={miraImage} style={styles.introMira} resizeMode="contain" /><Text style={styles.introTitle}>Serin Kıyı’ya hoş geldin!</Text><Text style={styles.introBody}>Ben Mira. Tahtada eşyaları birleştirip feneri yeniden yakacağız.</Text><Pressable onPress={store.dismissIntro} style={styles.introButton}><Text style={styles.introButtonText}>Maceraya başla</Text></Pressable></View></View></Modal>
  </View>;
}

function TopBar({ energy, coins, gems, topInset }: { energy: number; coins: number; gems: number; topInset: number }) { return <View style={[styles.topBar, { height: topInset + 94, paddingTop: topInset + 2 }]}><Image source={logoImage} style={[styles.logoImage, { top: topInset - 5 }]} resizeMode="contain" /><View style={[styles.currencies, { top: topInset + 12 }]}><Pill icon="⚡" tone="energy" value={`${energy}`} /><Pill icon="●" tone="coin" value={coins.toLocaleString('tr-TR')} /><Pill icon="◆" tone="gem" value={gems} /></View></View>; }
function Pill({ icon, value, tone }: { icon: string; value: string | number; tone: 'energy' | 'coin' | 'gem' }) { const toneStyle = tone === 'energy' ? styles.energyIcon : tone === 'coin' ? styles.coinIcon : styles.gemIcon; const iconNode = tone === 'coin' ? <Image source={hudCoinImage} style={styles.currencyImage} /> : tone === 'gem' ? <Image source={hudGemImage} style={styles.currencyImage} /> : <Text style={[styles.pillIcon, toneStyle]}>{icon}</Text>; return <View style={[styles.pill, tone === 'energy' && styles.energyPill, tone === 'coin' && styles.coinPill, tone === 'gem' && styles.gemPill]}>{iconNode}<Text style={styles.pillText}>{value}</Text><Text style={styles.pillPlus}>+</Text></View>; }
function RoundButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) { return <Pressable accessibilityLabel={label} onPress={onPress} style={styles.roundButton}><Text style={styles.roundIcon}>{icon}{'︎'}</Text></Pressable>; }
function RequirementLine({ task, inventory }: { task: StoryTask; inventory: Record<ResourceKind, number> }) { return <View style={styles.requirements}>{resources.map(kind => task.requirements[kind] ? <View key={kind} style={styles.requirement}><Image source={itemImages[kind]} style={styles.requirementIcon} /><Text style={styles.requirementText}>{inventory[kind]}/{task.requirements[kind]}</Text></View> : null)}</View>; }
function MergeTileButton({ tile, selected, onPress }: { tile: MergeTile; selected: boolean; onPress: () => void }) { const scale = useRef(new Animated.Value(1)).current; useEffect(() => { Animated.spring(scale, { toValue: selected ? 1.08 : 1, friction: 5, useNativeDriver: true }).start(); }, [scale, selected]); return <Animated.View style={[styles.tile, selected && styles.selectedTile, { transform: [{ scale }] }]}><Pressable onPress={onPress} onPressIn={() => Animated.spring(scale, { toValue: 0.93, friction: 7, useNativeDriver: true }).start()} style={styles.tilePress}><Image source={itemImages[tile.kind]} style={styles.tileImage} resizeMode="contain" /></Pressable></Animated.View>; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4E9DD' }, islandScreen: { flex: 1 }, islandBackground: { resizeMode: 'cover' }, darkVeil: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(4, 26, 42, 0.02)' },
  topBar: { height: 94, paddingHorizontal: 12, paddingTop: 2, zIndex: 2 }, logoImage: { position: 'absolute', left: -7, top: -5, width: 126, height: 94 }, currencies: { position: 'absolute', left: 122, right: 9, top: 12, height: 43, flexDirection: 'row', overflow: 'hidden', backgroundColor: '#07537D', borderRadius: 11, borderWidth: 2, borderColor: '#1B83B5', shadowColor: '#063754', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 2 }, shadowRadius: 2, elevation: 3 }, pill: { flex: 1, minWidth: 0, height: 39, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 }, energyPill: { flex: 0.93 }, coinPill: { flex: 1.38, borderLeftWidth: 1, borderLeftColor: '#0B6C98', borderRightWidth: 1, borderRightColor: '#0B6C98' }, gemPill: { flex: 1.1 }, currencyImage: { width: 31, height: 31, resizeMode: 'contain' }, pillIcon: { fontSize: 25, fontWeight: '900', lineHeight: 25, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 1 }, energyIcon: { color: '#FFD137' }, coinIcon: { color: '#FFCA35' }, gemIcon: { color: '#EF56EC' }, pillText: { color: '#FFF8E6', fontSize: 12, fontWeight: '900' }, pillPlus: { color: '#EEFFE6', backgroundColor: '#4EBE3D', width: 19, height: 19, overflow: 'hidden', textAlign: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#B8EE89', fontSize: 16, lineHeight: 17, fontWeight: '900' },
  sideActions: { position: 'absolute', right: 13, top: 148, gap: 9 }, roundButton: { width: 53, height: 53, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#07527A', borderWidth: 3, borderColor: '#1A78A5', shadowColor: '#12364B', shadowOpacity: 0.42, shadowOffset: { width: 0, height: 3 }, shadowRadius: 3, elevation: 5 }, roundIcon: { color: '#FFF3D3', fontSize: 31, fontWeight: '900', textShadowColor: '#06364F', textShadowRadius: 2 },
  islandQuest: { position: 'absolute', left: 0, right: 4, bottom: 0, height: 207, justifyContent: 'flex-end' }, islandMira: { position: 'absolute', left: -2, bottom: -4, width: 126, height: 194, zIndex: 2 }, questSpeech: { height: 187, marginLeft: 75, backgroundColor: '#FFF8E8', borderRadius: 25, paddingTop: 11, paddingLeft: 17, paddingRight: 11, borderWidth: 3, borderColor: '#E6B66F', shadowColor: '#442D1E', shadowOpacity: 0.32, shadowOffset: { width: 0, height: 5 }, shadowRadius: 8, elevation: 7 }, questHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 55, marginRight: 104 }, questLocation: { color: '#A96E2E', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, questProgress: { color: '#6B9B4C', backgroundColor: '#EAF5D4', borderRadius: 10, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 2, fontSize: 10, fontWeight: '900' }, questTitle: { color: '#59381D', fontSize: 18, lineHeight: 20, fontWeight: '900', marginTop: 5, marginLeft: 55, marginRight: 103 }, questDescription: { color: '#89674A', fontSize: 11, lineHeight: 15, marginTop: 3, marginLeft: 55, marginRight: 103 }, chapterCompleteText: { color: '#81644A', fontWeight: '700', textAlign: 'center', marginTop: 20, marginRight: 95 }, requirements: { position: 'absolute', left: 66, bottom: 20, height: 67, flexDirection: 'row', alignItems: 'center', gap: 4 }, requirement: { alignItems: 'center', justifyContent: 'center', width: 39, height: 62, backgroundColor: '#F8E6C4', paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: '#E8CFA5' }, requirementIcon: { width: 28, height: 28 }, requirementText: { color: '#5B3721', fontWeight: '900', fontSize: 11, marginTop: 3 }, questButton: { position: 'absolute', right: 10, bottom: 20, width: 94, height: 67, overflow: 'hidden', backgroundColor: '#4EBC35', borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#D5F699', shadowColor: '#2E6F25', shadowOpacity: 0.42, shadowOffset: { width: 0, height: 4 }, shadowRadius: 3, elevation: 5 }, questCompleteButton: { backgroundColor: '#DE8B28', borderColor: '#FFE29A' }, questButtonGloss: { position: 'absolute', top: 4, left: 7, right: 7, height: 18, borderRadius: 10, backgroundColor: 'rgba(232,255,181,0.38)' }, questButtonText: { color: '#FFF', fontSize: 18, fontWeight: '900', textShadowColor: '#287724', textShadowRadius: 2 },
  boardScreen: { flex: 1, backgroundColor: '#244E67' }, boardIntro: { flexDirection: 'row', alignItems: 'flex-end', marginHorizontal: 14, height: 100, marginTop: 2 }, boardMira: { width: 92, height: 120, marginBottom: -15, zIndex: 2 }, boardSpeech: { flex: 1, backgroundColor: '#FFF2D4', borderRadius: 18, padding: 12, marginBottom: 9, marginLeft: -4, borderWidth: 2, borderColor: '#FFFDF3' }, boardSpeechTitle: { color: '#593B22', fontWeight: '900', fontSize: 16 }, boardSpeechBody: { color: '#85664B', marginTop: 2, fontSize: 11 },
  gameBoard: { marginHorizontal: 13, padding: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 4, backgroundColor: '#D7B688', borderRadius: 22, borderWidth: 4, borderColor: '#9E7046', shadowColor: '#101F2A', shadowOpacity: 0.35, shadowRadius: 9, elevation: 6, position: 'relative' }, tile: { width: '15.4%', aspectRatio: 1, borderRadius: 9, backgroundColor: '#F9E7C5', borderWidth: 1, borderColor: '#E0C397', shadowColor: '#795333', shadowOpacity: 0.19, shadowRadius: 3, elevation: 2 }, tilePress: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, selectedTile: { borderColor: '#F4B128', backgroundColor: '#FFF2A6', borderWidth: 3 }, tileImage: { width: '84%', height: '84%' }, emptyCell: { width: '15.4%', aspectRatio: 1, borderRadius: 9, backgroundColor: 'rgba(110, 71, 43, 0.18)' }, burst: { position: 'absolute', alignSelf: 'center', top: '43%', backgroundColor: '#FFF4C5', borderRadius: 17, paddingHorizontal: 12, paddingVertical: 7, elevation: 8 }, burstText: { color: '#A55E18', fontWeight: '900' }, boardFooter: { marginTop: 10, paddingHorizontal: 13 }, energyHint: { color: '#CBE9EE', textAlign: 'center', fontSize: 11, fontWeight: '700', marginBottom: 5 }, recipeBar: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 7, backgroundColor: '#FFF1D4', borderRadius: 16, borderWidth: 2, borderColor: '#E3B56B' }, recipeSlot: { width: 45, height: 45, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2D7A9', borderWidth: 1, borderColor: '#D2A16B' }, recipeIcon: { fontSize: 23 }, recipeText: { color: '#654426', fontWeight: '900', fontSize: 14 }, recipeArrow: { color: '#E3952A', fontWeight: '900', fontSize: 20 }, recipeAction: { marginLeft: 'auto', width: 45, height: 45, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#54B83C', borderWidth: 2, borderColor: '#BAF185' }, recipeActionText: { color: '#FFF', fontSize: 28, fontWeight: '900', lineHeight: 31 }, disabled: { opacity: 0.5 },
  bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#F1E5DB', borderTopWidth: 2, borderTopColor: '#D7B49A', shadowColor: '#1D2E3A', shadowOpacity: 0.3, shadowRadius: 9, elevation: 10 }, navItem: { alignItems: 'center', justifyContent: 'flex-start', flex: 1, paddingTop: 5, backgroundColor: '#F2E6DC', borderTopWidth: 2, borderBottomWidth: 1, borderLeftWidth: 1, borderColor: '#D9C0AB' }, navItemFirst: { borderTopLeftRadius: 22 }, navItemLast: { borderTopRightRadius: 22, borderRightWidth: 1 }, navItemActive: { backgroundColor: '#FFE6AC', borderColor: '#D7A85C', borderWidth: 2, borderBottomWidth: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22, zIndex: 1 }, navIcon: { width: 58, height: 57, alignItems: 'center', justifyContent: 'center' }, navImage: { width: 56, height: 53 }, navEmoji: { fontSize: 27, color: '#B47630', fontWeight: '900' }, navLabel: { color: '#442919', fontWeight: '900', fontSize: 13, marginTop: -1 }, navLabelActive: { color: '#3A2619' },
  introBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 25, backgroundColor: 'transparent' }, introCard: { width: '100%', alignItems: 'center', backgroundColor: '#FFF4D9', borderRadius: 28, padding: 23 }, introMira: { width: 120, height: 145, marginTop: -48 }, introTitle: { color: '#513C2D', fontSize: 23, fontWeight: '900', textAlign: 'center' }, introBody: { color: '#81644A', textAlign: 'center', lineHeight: 20, marginTop: 8 }, introButton: { alignSelf: 'stretch', backgroundColor: '#54B83C', borderRadius: 13, padding: 14, alignItems: 'center', marginTop: 18 }, introButtonText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});
