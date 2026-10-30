import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Image, ImageBackground, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CopilotStep, useCopilot, walkthroughable } from 'react-native-copilot';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { storyChapters } from '../../content/stories';
import type { MergeTile, ResourceKind, StoryTask } from '../../domain/game';
import { getChapterCompletionReward, getEndlessProject, useGameStore } from '../../store/gameStore';
import { AccountSheet } from './AccountSheet';
import { StoryMapSheet } from './StoryMapSheet';
import { TaskRewardModal } from './TaskRewardModal';
import { showRewardedEnergyAd } from '../../services/ads/rewardedAd';
import type { RootStackParamList } from '../../navigation/types';

const resources: ResourceKind[] = ['driftwood', 'seaGlass', 'shell'];
const defaultIslandImage = require('../../../assets/images/serin-kiyi-home-v2.png');
const islandImages: Record<string, number> = {
  'lighthouse-tales': defaultIslandImage,
  'moonlit-harbor': require('../../../assets/images/moonlit-harbor-bg-v1.png'),
  'coral-cove': require('../../../assets/images/coral-cove-bg-v1.png'),
  'stormwatch-cliffs': require('../../../assets/images/stormwatch-cliffs-bg-v1.png'),
  'kelpwood-grove': require('../../../assets/images/kelpwood-grove-bg-v1.png'),
  'sunken-bazaar': require('../../../assets/images/sunken-bazaar-bg-v1.png'),
  'whispering-reef': require('../../../assets/images/whispering-reef-bg-v1.png'),
  'tideglass-falls': require('../../../assets/images/tideglass-falls-bg-v1.png'),
  'starlit-atoll': require('../../../assets/images/starlit-atoll-bg-v1.png'),
  'aurora-cape': require('../../../assets/images/aurora-cape-bg-v1.png'),
};
const miraQuestImage = require('../../../assets/images/mira-quest-portrait-v1.png');
const logoImage = require('../../../assets/images/wondertide-logo-v1.png');
const hudCoinImage = require('../../../assets/images/hud-coin-v1.png');
const hudGemImage = require('../../../assets/images/hud-gem-v1.png');
const itemImages: Record<ResourceKind, number> = {
  driftwood: require('../../../assets/images/item-driftwood.png'),
  seaGlass: require('../../../assets/images/item-sea-glass.png'),
  shell: require('../../../assets/images/item-shell.png'),
};
let activeMossyTileIds = new Set<string>();
const resourceNames: Record<ResourceKind, string> = { driftwood: 'Tahta', seaGlass: 'Cam', shell: 'Kabuk' };
const CopilotNativeView = React.forwardRef<React.ComponentRef<typeof View>, React.ComponentProps<typeof View>>((props, ref) => <View {...props} ref={ref} collapsable={false} />);
const CopilotView = walkthroughable(CopilotNativeView);
const CopilotPressable = walkthroughable(Pressable);

type Props = { mode: 'island' | 'board'; overlay?: 'tasks' | 'account'; overlayOpenId?: number; onOpenBoard?: () => void; onDismissOverlay?: () => void; hasBottomTab?: boolean };
type TileFrame = { x: number; y: number; width: number; height: number };

export function GameScreen({ mode, overlay, overlayOpenId, onOpenBoard, onDismissOverlay, hasBottomTab = false }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const [accountVisible, setAccountVisible] = useState(overlay === 'account');
  const [storyMapVisible, setStoryMapVisible] = useState(overlay === 'tasks');
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [boardMessage, setBoardMessage] = useState('Aynı tür ve seviyedeki iki parçayı birleştir.');
  const [clock, setClock] = useState(() => Date.now());
  const [showBurst, setShowBurst] = useState(false);
  const [rewardTask, setRewardTask] = useState<StoryTask | null>(null);
  const [boardTutorialReady, setBoardTutorialReady] = useState(false);
  const [playerHydrated, setPlayerHydrated] = useState(() => useGameStore.persist.hasHydrated());
  const burst = useRef(new Animated.Value(0)).current;
  const mergeFlash = useRef(new Animated.Value(0)).current;
  const sparkle = useRef(new Animated.Value(0)).current;
  const boardRef = useRef<React.ComponentRef<typeof View>>(null);
  const boardFrameRef = useRef<TileFrame | null>(null);
  const tileFramesRef = useRef(new Map<string, TileFrame>());
  const tutorialStarted = useRef(false);
  const { start } = useCopilot();
  const store = useGameStore();
  const { energy, maxEnergy, lastEnergyRefreshAt, coins, gems, inventory, board, storyProgress, endlessProjectCount, generationQueue, generatedTileCount, mossyCellIndices, tutorialPhase } = store;
  activeMossyTileIds = new Set(board.flatMap((tile, index) => tile && mossyCellIndices.includes(index) ? [tile.id] : []));
  const occupiedTileCount = board.filter(Boolean).length;
  const activeChapter = storyChapters.find(chapter => chapter.id === storyProgress.chapterId) ?? storyChapters[0];
  const activeIndex = storyChapters.findIndex(chapter => chapter.id === activeChapter.id);
  const nextChapter = storyChapters[activeIndex + 1];
  const islandImage = islandImages[activeChapter.id] ?? defaultIslandImage;
  const chapterTask = useMemo(() => activeChapter.tasks.find(task => !storyProgress.completedTaskIds.includes(task.id)), [activeChapter, storyProgress.completedTaskIds]);
  const isEndlessMode = !nextChapter && !chapterTask;
  const activeTask = useMemo(() => chapterTask ?? (isEndlessMode ? getEndlessProject(endlessProjectCount) : undefined), [chapterTask, endlessProjectCount, isEndlessMode]);
  const chapterComplete = !chapterTask;
  const taskReady = activeTask ? store.canComplete(activeTask) : false;
  const selectedTile = board.find(tile => tile?.id === selectedTileId) ?? null;
  const nextGeneratedResource = generationQueue[0] ?? resources[generatedTileCount % resources.length];
  const nextEnergy = useMemo(() => {
    if (energy >= maxEnergy) return 'Enerji dolu';
    const elapsed = Math.max(0, clock - new Date(lastEnergyRefreshAt).getTime());
    const remaining = 300_000 - (elapsed % 300_000);
    return `${Math.floor(remaining / 60_000)}:${Math.floor((remaining % 60_000) / 1000).toString().padStart(2, '0')} sonra +1 enerji`;
  }, [clock, energy, lastEnergyRefreshAt, maxEnergy]);

  useEffect(() => { const timer = setInterval(() => { store.refreshEnergy(); setClock(Date.now()); }, 1_000); return () => clearInterval(timer); }, [store]);
  useEffect(() => {
    if (useGameStore.persist.hasHydrated()) {
      setPlayerHydrated(true);
      return;
    }
    return useGameStore.persist.onFinishHydration(() => setPlayerHydrated(true));
  }, []);
  useEffect(() => {
    const shouldStart = mode === 'board' && isFocused && boardTutorialReady && tutorialPhase === 'board';
    if (!shouldStart) {
      tutorialStarted.current = false;
      return;
    }
    if (tutorialStarted.current) return;
    tutorialStarted.current = true;
    const frame = requestAnimationFrame(() => {
      start('mission')
        .then(() => store.dismissIntro())
        .catch(error => console.warn('Tutorial başlatılamadı:', error));
    });
    return () => cancelAnimationFrame(frame);
  }, [boardTutorialReady, isFocused, mode, start, store, tutorialPhase]);
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

  function animateMerge(firstTileId: string, secondTileId: string) {
    const targetIndex = board.findIndex(candidate => candidate?.id === secondTileId);
    if (!store.mergeTiles(firstTileId, secondTileId)) return false;
    const clearedMoss = mossyCellIndices.includes(targetIndex);
    if (clearedMoss) store.clearMossAt(targetIndex);
    const selectedLevel = board.find(candidate => candidate?.id === firstTileId)?.level ?? 1;
    setSelectedTileId(null); setBoardMessage(clearedMoss ? 'Yosun temizlendi! Hücre yeniden açıldı.' : `Birleşim tamamlandı! +${selectedLevel * 5} altın`); setShowBurst(true); burst.setValue(0.55); mergeFlash.setValue(0); sparkle.setValue(0);
    Animated.parallel([
      Animated.sequence([Animated.spring(burst, { toValue: 1, friction: 4, useNativeDriver: true }), Animated.timing(burst, { toValue: 1.45, duration: 360, useNativeDriver: true })]),
      Animated.sequence([Animated.timing(mergeFlash, { toValue: 0.75, duration: 90, useNativeDriver: true }), Animated.timing(mergeFlash, { toValue: 0, duration: 420, useNativeDriver: true })]),
      Animated.timing(sparkle, { toValue: 1, duration: 480, useNativeDriver: true }),
    ]).start(() => setShowBurst(false));
    return true;
  }

  function selectTile(tileId: string) {
    const tile = board.find(candidate => candidate?.id === tileId);
    const tileIndex = board.findIndex(candidate => candidate?.id === tileId);
    if (!selectedTileId && mossyCellIndices.includes(tileIndex)) { setBoardMessage('Yosunlu hücreyi temizlemek için başka bir parçayı bunun üzerine birleştir.'); return; }
    if (!selectedTileId) { setSelectedTileId(tileId); setBoardMessage(tile?.level === 3 ? 'Proje parçası hazır. Aşağıdaki Teslim Et düğmesine dokun.' : 'Şimdi eşleşen ikinci parçayı seç.'); return; }
    if (selectedTileId === tileId) { setSelectedTileId(null); setBoardMessage('Seçim kaldırıldı.'); return; }
    if (animateMerge(selectedTileId, tileId)) return;
    setSelectedTileId(tileId); setBoardMessage('Yalnızca aynı tür ve aynı aşamadaki parçalar birleşir.');
  }

  function measureBoard() {
    boardRef.current?.measureInWindow((x, y, width, height) => { boardFrameRef.current = { x, y, width, height }; });
  }

  function handleTileLayout(tileId: string, frame: TileFrame) {
    tileFramesRef.current.set(tileId, frame);
  }

  function handleTileDrop(tileId: string, absoluteX: number, absoluteY: number) {
    const boardFrame = boardFrameRef.current;
    if (!boardFrame) return;
    const x = absoluteX - boardFrame.x;
    const y = absoluteY - boardFrame.y;
    const targetId = board.find(tile => {
      if (!tile || tile.id === tileId) return false;
      const frame = tileFramesRef.current.get(tile.id);
      return frame && x >= frame.x && x <= frame.x + frame.width && y >= frame.y && y <= frame.y + frame.height;
    })?.id;
    if (!targetId) { setBoardMessage('Birleştirmek için parçayı eşinin üzerine bırak.'); return; }
    if (!animateMerge(tileId, targetId)) {
      setSelectedTileId(targetId);
      setBoardMessage('Yalnızca aynı tür ve aynı aşamadaki parçalar birleşir.');
    }
  }

  function deliverSelectedTile() {
    if (!selectedTileId || !store.deliverProjectTile(selectedTileId)) return;
    setSelectedTileId(null);
    if (activeTask && store.canComplete(activeTask)) {
      const completed = isEndlessMode
        ? store.completeEndlessProject(activeTask)
        : store.completeTask(activeTask);
      if (completed) {
        setRewardTask(activeTask);
        setBoardMessage('Proje tamamlandı!');
        return;
      }
    }
    setBoardMessage('Proje parçası göreve yerleştirildi. Yeni alan açıldı!');
    setShowBurst(true); burst.setValue(0.55);
    Animated.sequence([Animated.spring(burst, { toValue: 1, friction: 4, useNativeDriver: true }), Animated.timing(burst, { toValue: 1.45, duration: 360, useNativeDriver: true })]).start(() => setShowBurst(false));
  }

  function selectEmptyCell(index: number) {
    if (!selectedTileId) { setBoardMessage('Bir parçayı seç, sonra boş bir kareye dokun.'); return; }
    if (store.moveTile(selectedTileId, index)) {
      setSelectedTileId(null);
      setBoardMessage('Parça taşındı. Eşini bulup birleştir!');
    }
  }

  function handleTaskAction() {
    if (isEndlessMode && activeTask) {
      if (!taskReady) {
        if (onOpenBoard) onOpenBoard();
        else navigation.navigate('Board');
        return;
      }
      if (store.completeEndlessProject(activeTask)) setRewardTask(activeTask);
      return;
    }
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

  function advanceFromCompletedChapter() {
    if (nextChapter) {
      store.selectChapter(nextChapter.id);
      setSelectedTileId(null);
      setBoardMessage(`${nextChapter.location} için yeni proje planı açıldı.`);
      return;
    }
    setStoryMapVisible(true);
  }

  function closeAccountSheet() {
    setAccountVisible(false);
    onDismissOverlay?.();
  }

  function closeStoryMapSheet() {
    setStoryMapVisible(false);
    onDismissOverlay?.();
  }

  return <View style={styles.root}>
    {mode === 'island' ? <ImageBackground source={islandImage} style={styles.islandScreen} imageStyle={styles.islandBackground}>
      <View style={styles.darkVeil} />
      <TopBar topInset={insets.top} energy={energy} maxEnergy={maxEnergy} coins={coins} gems={gems} />
      <View style={[styles.islandQuest, { bottom: 87 + insets.bottom }]}><Image source={miraQuestImage} style={styles.islandMira} resizeMode="contain" /><View style={[styles.questSpeech, { position: 'relative', zIndex: 1 }]}><View style={styles.questHeader}><Text style={styles.questLocation}>{isEndlessMode ? 'KIYI SÖZLEŞMELERİ' : activeChapter.location.toUpperCase()}</Text><Text style={styles.questProgress}>{isEndlessMode ? `Sözleşme ${endlessProjectCount + 1}` : `${activeChapter.tasks.filter(task => storyProgress.completedTaskIds.includes(task.id)).length}/${activeChapter.tasks.length}`}</Text></View><Text numberOfLines={1} style={styles.questTitle}>{isEndlessMode ? activeTask?.title : chapterComplete ? nextChapter ? 'Bölüm tamamlandı!' : 'Tüm görevler tamamlandı!' : activeTask?.title}</Text>{activeTask ? <><Text numberOfLines={2} style={styles.questDescription}>{activeTask.description}</Text><View style={styles.questActions}><RequirementLine task={activeTask} inventory={inventory} />{(!chapterComplete || nextChapter || isEndlessMode) ? <Pressable hitSlop={12} pressRetentionOffset={12} onPress={handleTaskAction} style={[styles.questButton, taskReady && styles.questCompleteButton]}><View pointerEvents="none" style={styles.questButtonGloss} /><Text style={styles.questButtonText}>{chapterComplete && !isEndlessMode ? 'Başla' : taskReady ? 'Tamamla' : 'Yap'}</Text></Pressable> : null}</View></> : nextChapter ? <View style={styles.chapterCompleteActions}><Text style={styles.chapterCompleteText}>Yeni kıyı seni bekliyor.</Text><Pressable accessibilityRole="button" accessibilityLabel="Yeni bölüme başla" hitSlop={12} pressRetentionOffset={12} onPress={handleTaskAction} style={styles.chapterStartButton}><View pointerEvents="none" style={styles.questButtonGloss} /><Text style={styles.questButtonText}>Başla</Text></Pressable></View> : <Text style={styles.chapterCompleteText}>Yeni maceralar yakında burada olacak.</Text>}</View></View>
    </ImageBackground> : <View onLayout={() => setBoardTutorialReady(true)} style={[styles.boardScreen, hasBottomTab && { paddingBottom: 87 + insets.bottom }]}>
      <TopBar topInset={insets.top} energy={energy} maxEnergy={maxEnergy} coins={coins} gems={gems} />
      <CopilotStep name="mission" order={1} text="Her onarım bir görevle başlar. Üstteki başlık aktif hedefini, Mira’nın notu ise sıradaki hamleni gösterir."><CopilotView style={styles.boardIntro}><View style={styles.boardPortrait}><Image source={miraQuestImage} style={styles.boardPortraitImage} resizeMode="contain" /></View><View style={styles.boardDialogueBubble}><View style={styles.boardBubbleTail} /><View style={styles.boardMissionCopy}><Text style={styles.boardMissionEyebrow}>{isEndlessMode ? 'KIYI SÖZLEŞMELERİ' : activeChapter.location.toUpperCase()}</Text><Text numberOfLines={1} style={styles.boardSpeechTitle}>{isEndlessMode ? activeTask?.title : chapterComplete ? 'Bölüm tamamlandı' : activeTask?.title}</Text></View><Text numberOfLines={1} style={styles.boardMissionHint}>{isEndlessMode ? `${endlessProjectCount + 1}. sözleşme` : chapterComplete ? 'Yeni kıyı yakında' : boardMessage}</Text></View></CopilotView></CopilotStep>
      {activeTask ? <CopilotStep name="requirements" order={2} text="Görevin için gereken proje parçalarını burada takip et. Her parça tamamlandığında sayaç ilerler."><CopilotView style={styles.boardTaskCard}><BoardRequirements task={activeTask} inventory={inventory} /></CopilotView></CopilotStep> : <View style={styles.chapterCompleteCard}><View><Text style={styles.boardTaskLabel}>{nextChapter ? 'KIYI YENİLENDİ' : 'TÜM KIYILAR YENİLENDİ'}</Text><Text style={styles.chapterCompleteTitle}>{nextChapter ? `${nextChapter.location} seni bekliyor` : 'Harika iş çıkardın, deniz yeniden ışıldıyor.'}</Text></View><Pressable accessibilityLabel={nextChapter ? 'Yeni bölüme başla' : 'Hikâye haritasını aç'} onPress={advanceFromCompletedChapter} style={styles.boardCompleteButton}><Text style={styles.boardCompleteButtonText}>{nextChapter ? 'Başla' : 'Harita'}</Text></Pressable></View>}
      <CopilotStep name="merge-board" order={3} text="Aynı tür ve seviyedeki iki parçaya sırayla dokun veya birini eşinin üstüne sürükle. Yeterince birleştirdiğinde teslim edebileceğin bir eşya oluşur."><CopilotView ref={boardRef} onLayout={() => { setBoardTutorialReady(true); requestAnimationFrame(measureBoard); }} style={styles.gameBoard}>{Array.from({ length: 30 }, (_, index) => { const tile = board[index]; return tile ? <MergeTileButton key={tile.id} tile={tile} selected={tile.id === selectedTileId} onDrop={handleTileDrop} onLayout={handleTileLayout} onPress={() => selectTile(tile.id)} /> : <Pressable key={`empty-${index}`} accessibilityRole="button" accessibilityLabel={`Boş tahta hücresi ${index + 1}`} onPress={() => selectEmptyCell(index)} style={styles.emptyCell} />; })}{showBurst ? <><Animated.View pointerEvents="none" style={[styles.mergeFlash, { opacity: mergeFlash }]} /><Animated.Text pointerEvents="none" style={[styles.sparkle, styles.sparkleOne, { opacity: sparkle, transform: [{ translateY: sparkle.interpolate({ inputRange: [0, 1], outputRange: [4, -18] }) }, { scale: sparkle.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] }) }] }]}>✦</Animated.Text><Animated.Text pointerEvents="none" style={[styles.sparkle, styles.sparkleTwo, { opacity: sparkle, transform: [{ translateY: sparkle.interpolate({ inputRange: [0, 1], outputRange: [3, -24] }) }, { scale: sparkle.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}>✦</Animated.Text><Animated.Text pointerEvents="none" style={[styles.sparkle, styles.sparkleThree, { opacity: sparkle, transform: [{ translateY: sparkle.interpolate({ inputRange: [0, 1], outputRange: [2, -14] }) }, { scale: sparkle.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.1] }) }] }]}>✦</Animated.Text><Animated.View pointerEvents="none" style={[styles.burst, { transform: [{ scale: burst }] }]}><Text style={styles.burstText}>✨ Birleşim! ✨</Text></Animated.View></> : null}</CopilotView></CopilotStep>
      <View style={styles.boardFooter}><View style={styles.energyStatus}><View style={[styles.energyStatusIcon, energy >= maxEnergy && styles.energyStatusIconFull]}><Text style={styles.energyStatusBolt}>⚡</Text></View><Text style={styles.energyStatusText}>{energy >= maxEnergy ? 'Enerji dolu' : nextEnergy}</Text><Text style={styles.energyStatusValue}>{energy}/{maxEnergy}</Text></View><View style={styles.recipeBar}><View style={styles.recipeSlot}><Image source={itemImages[nextGeneratedResource]} style={styles.nextResourceImage} /></View><Text style={styles.recipeText}>{selectedTile?.level === 3 ? projectPartNames[selectedTile.kind] + ' hazır' : selectedTileId ? 'Eş seviyeyi bul' : `Sıradaki: ${resourceNames[nextGeneratedResource]}`}</Text>{selectedTile?.level === 3 ? <Pressable accessibilityLabel="Proje parçasını göreve yerleştir" onPress={deliverSelectedTile} style={styles.deliverAction}><Text style={styles.deliverActionText}>Göreve teslim et</Text></Pressable> : null}<CopilotStep name="generate" order={4} text="Üret düğmesi, yeterli enerjin varsa boş kareleri tek dokunuşta doldurur; her parça 1 enerji harcar. Proje aşamasına ulaşınca Teslim düğmesi görünür; parçayı göreve yerleştirip ödülünü alabilirsin."><CopilotPressable accessibilityLabel="Boş kareleri üret" disabled={energy < 1 || occupiedTileCount >= 30} onPress={store.generateTiles} style={[styles.recipeAction, (energy < 1 || occupiedTileCount >= 30) && styles.disabled]}><Text style={styles.recipeActionText}>Üret +</Text></CopilotPressable></CopilotStep></View></View>
    </View>}
    <AccountSheet visible={accountVisible} onClose={closeAccountSheet} onStartTutorial={() => { setAccountVisible(false); store.beginGameTutorial(); if (onOpenBoard) onOpenBoard(); else navigation.navigate('Board'); }} />
    <StoryMapSheet visible={storyMapVisible} chapters={storyChapters} activeChapterId={activeChapter.id} unlockedChapterIds={storyProgress.unlockedChapterIds} completedTaskIds={storyProgress.completedTaskIds} inventory={inventory} onChoose={store.selectChapter} onClose={closeStoryMapSheet} />
    <TaskRewardModal task={rewardTask} location={activeChapter.location} scene={islandImage} chapterReward={rewardTask && activeChapter.tasks.at(-1)?.id === rewardTask.id ? getChapterCompletionReward(activeChapter.id) : null} onClose={() => setRewardTask(null)} />
    <Modal transparent visible={playerHydrated && mode === 'island' && isFocused && tutorialPhase === 'welcome'} animationType="fade" onRequestClose={store.dismissIntro}><View style={styles.tutorialFallbackBackdrop}><View style={styles.tutorialFallbackCard}><Text style={styles.tutorialFallbackEyebrow}>MİRA’NIN REHBERİ</Text><Text style={styles.tutorialFallbackTitle}>Kıyıyı birlikte onaralım</Text><Text style={styles.tutorialFallbackBody}>Önce oyun tahtasına geçelim. Sonraki adımlarda Copilot görevini, ihtiyaçlarını ve birleşim hareketini sırayla gösterecek.</Text><Pressable accessibilityRole="button" onPress={() => { store.beginGameTutorial(); if (onOpenBoard) onOpenBoard(); else navigation.navigate('Board'); }} style={styles.tutorialFallbackButton}><Text style={styles.tutorialFallbackButtonText}>Tahtaya geç</Text></Pressable></View></View></Modal>
  </View>;
}

function TopBar({ energy, maxEnergy, coins, gems, topInset }: { energy: number; maxEnergy: number; coins: number; gems: number; topInset: number }) { const buyEnergyWithCoins = useGameStore(state => state.buyEnergyWithCoins); const buyEnergyWithGems = useGameStore(state => state.buyEnergyWithGems); const [offer, setOffer] = useState<'coins' | 'gems' | null>(null); const [offerMessage, setOfferMessage] = useState(''); const closeOffer = () => { setOffer(null); setOfferMessage(''); }; const isCoinOffer = offer === 'coins'; const hasEnough = isCoinOffer ? coins >= 100 : gems >= 1; const canBuy = energy < maxEnergy && hasEnough; const confirmOffer = () => { const purchased = isCoinOffer ? buyEnergyWithCoins() : buyEnergyWithGems(); if (purchased) closeOffer(); else setOfferMessage(energy >= maxEnergy ? 'Enerjin zaten dolu.' : `Yeterli ${isCoinOffer ? 'altının' : 'elmasın'} yok.`); }; return <><View style={[styles.topBar, { height: topInset + 94, paddingTop: topInset + 2 }]}><Image source={logoImage} style={[styles.logoImage, { top: topInset - 5 }]} resizeMode="contain" /><View style={[styles.currencies, { top: topInset + 12 }]}><Pill icon="⚡" tone="energy" value={`${energy}`} /><Pill icon="●" tone="coin" value={coins.toLocaleString('tr-TR')} onPress={() => setOffer('coins')} /><Pill icon="◆" tone="gem" value={gems} onPress={() => setOffer('gems')} /></View></View><Modal transparent visible={offer !== null} animationType="fade" onRequestClose={closeOffer}><View style={styles.offerBackdrop}><Pressable accessibilityLabel="Satın alma penceresini kapat" onPress={closeOffer} style={styles.offerDismissArea} /><View style={styles.offerCard}><Pressable accessibilityLabel="Kapat" onPress={closeOffer} style={styles.offerClose}><Text style={styles.offerCloseText}>×</Text></Pressable><Text style={styles.offerEyebrow}>ENERJİ DEPOSU</Text><Text style={styles.offerTitle}>Enerjin azaldı mı?</Text><Text style={styles.offerBody}>Mevcut enerji: {energy}/{maxEnergy}</Text><View style={styles.offerExchange}><View style={styles.offerResource}><Image source={isCoinOffer ? hudCoinImage : hudGemImage} style={styles.offerResourceImage} /><Text style={styles.offerResourceValue}>{isCoinOffer ? '100' : '1'}</Text><Text style={styles.offerResourceLabel}>{isCoinOffer ? 'altın' : 'elmas'}</Text></View><Text style={styles.offerArrow}>→</Text><View style={styles.offerEnergy}><Text style={styles.offerEnergyIcon}>⚡</Text><Text style={styles.offerEnergyValue}>{isCoinOffer ? '+5' : '+10'}</Text><Text style={styles.offerResourceLabel}>enerji</Text></View></View>{offerMessage ? <Text style={styles.offerMessage}>{offerMessage}</Text> : null}<Pressable accessibilityRole="button" accessibilityLabel="Enerji satın al" disabled={!canBuy} onPress={confirmOffer} style={[styles.offerConfirm, !canBuy && styles.offerConfirmDisabled]}><Text style={styles.offerConfirmText}>{energy >= maxEnergy ? 'Enerji dolu' : hasEnough ? 'Değiş tokuş yap' : 'Bakiye yetersiz'}</Text></Pressable><Pressable accessibilityRole="button" onPress={closeOffer} style={styles.offerCancel}><Text style={styles.offerCancelText}>Şimdilik vazgeç</Text></Pressable></View></View></Modal></>; }
function Pill({ icon, value, tone, onPress }: { icon: string; value: string | number; tone: 'energy' | 'coin' | 'gem'; onPress?: () => void }) {
  const canClaimRewardedGem = useGameStore(state => state.canClaimRewardedGem);
  const claimRewardedGem = useGameStore(state => state.claimRewardedGem);
  const toneStyle = tone === 'energy' ? styles.energyIcon : tone === 'coin' ? styles.coinIcon : styles.gemIcon;
  const iconNode = tone === 'coin' ? <Image source={hudCoinImage} style={styles.currencyImage} /> : tone === 'gem' ? <Image source={hudGemImage} style={styles.currencyImage} /> : <Text style={[styles.pillIcon, toneStyle]}>{icon}</Text>;
  const handlePress = async () => {
    if (tone !== 'gem' || Number(value) > 0) { onPress?.(); return; }
    if (!canClaimRewardedGem()) { Alert.alert('Reklam ödülü hazır değil', 'Günlük hakkın bitmiş olabilir ya da bekleme süresi devam ediyor.'); return; }
    const result = await showRewardedEnergyAd();
    if (result === 'completed' && claimRewardedGem()) { Alert.alert('Elmas kazandın!', '+1 elmas hesabına eklendi.'); return; }
    Alert.alert('Reklam hazır değil', result === 'unavailable' ? 'Şu an gösterilecek reklam yok. Biraz sonra yeniden dene.' : 'Reklam tamamlanmadığı için ödül eklenmedi.');
  };
  return <Pressable accessibilityRole="button" accessibilityLabel={tone === 'coin' ? 'Altınla enerji al' : tone === 'gem' ? 'Elmas al' : 'Enerji'} onPress={handlePress} disabled={!onPress && tone !== 'gem'} style={[styles.pill, tone === 'energy' && styles.energyPill, tone === 'coin' && styles.coinPill, tone === 'gem' && styles.gemPill]}>{iconNode}<Text style={styles.pillText}>{value}</Text>{tone !== 'energy' ? <Text style={styles.pillPlus}>+</Text> : null}</Pressable>;
}
function RequirementLine({ task, inventory }: { task: StoryTask; inventory: Record<ResourceKind, number> }) { return <View style={styles.requirements}>{resources.map(kind => task.requirements[kind] ? <View key={kind} style={styles.requirement}><Image source={itemImages[kind]} style={styles.requirementIcon} /><Text style={styles.requirementText}>{inventory[kind]}/{task.requirements[kind]}</Text></View> : null)}</View>; }
const projectPartNames: Record<ResourceKind, string> = { driftwood: 'Kiriş', seaGlass: 'Mercek', shell: 'Mühür' };
function BoardRequirements({ task, inventory }: { task: StoryTask; inventory: Record<ResourceKind, number> }) { return <View style={styles.boardRequirements}>{resources.map(kind => task.requirements[kind] ? <View key={kind} style={[styles.boardRequirement, inventory[kind] >= (task.requirements[kind] ?? 0) && styles.boardRequirementReady]}><Image source={itemImages[kind]} style={styles.boardRequirementIcon} /><View><Text numberOfLines={1} style={styles.boardRequirementName}>{projectPartNames[kind]}</Text><Text style={styles.boardRequirementText}>{inventory[kind]}/{task.requirements[kind]} {inventory[kind] >= (task.requirements[kind] ?? 0) ? '✓' : ''}</Text></View></View> : null)}</View>; }
function MergeTileButton({ tile, selected, onDrop, onLayout, onPress }: { tile: MergeTile; selected: boolean; onDrop: (tileId: string, absoluteX: number, absoluteY: number) => void; onLayout: (tileId: string, frame: TileFrame) => void; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const dragGesture = useMemo(() => Gesture.Pan().minDistance(10).onUpdate(event => { dragX.setValue(event.translationX); dragY.setValue(event.translationY); }).onEnd(event => onDrop(tile.id, event.absoluteX, event.absoluteY)).onFinalize(() => Animated.parallel([Animated.spring(dragX, { toValue: 0, useNativeDriver: true }), Animated.spring(dragY, { toValue: 0, useNativeDriver: true })]).start()), [dragX, dragY, onDrop, tile.id]);
  useEffect(() => { Animated.spring(scale, { toValue: selected ? 1.08 : 1, friction: 5, useNativeDriver: true }).start(); }, [scale, selected]);
  const mossy = activeMossyTileIds.has(tile.id);
  return <GestureDetector gesture={dragGesture}><Animated.View onLayout={event => onLayout(tile.id, event.nativeEvent.layout)} style={[styles.tile, tile.level === 2 && styles.refinedTile, tile.level === 3 && styles.projectTile, selected && styles.selectedTile, { transform: [{ translateX: dragX }, { translateY: dragY }, { scale }] }]}><Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${resourceNames[tile.kind]}, seviye ${tile.level}${mossy ? ', yosunlu hücre' : ''}`} onPress={onPress} onPressIn={() => Animated.spring(scale, { toValue: 0.93, friction: 7, useNativeDriver: true }).start()} onPressOut={() => Animated.spring(scale, { toValue: selected ? 1.08 : 1, friction: 7, useNativeDriver: true }).start()} style={styles.tilePress}><Image source={itemImages[tile.kind]} style={styles.tileImage} resizeMode="contain" />{mossy ? <View pointerEvents="none" style={styles.mossOverlay}><Text style={styles.mossText}>✦</Text></View> : null}<View pointerEvents="none" style={[styles.levelBadge, tile.level === 3 && styles.levelBadgeMax]}><Text style={styles.levelBadgeText}>●</Text></View></Pressable></Animated.View></GestureDetector>;
}

const effectStyles = {
  mergeFlash: { position: 'absolute' as const, left: 3, right: 3, top: 3, bottom: 3, borderRadius: 18, backgroundColor: '#FFF3B0', borderWidth: 3, borderColor: '#FFF9D6' },
  sparkle: { position: 'absolute' as const, color: '#FFF5A8', fontSize: 28, fontWeight: '900' as const, textShadowColor: '#B76D20', textShadowRadius: 4 },
  sparkleOne: { left: '37%' as const, top: '34%' as const }, sparkleTwo: { left: '55%' as const, top: '37%' as const, fontSize: 21 }, sparkleThree: { left: '48%' as const, top: '50%' as const, fontSize: 18 },
  mossOverlay: { position: 'absolute' as const, left: 2, right: 2, top: 2, bottom: 2, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 7, backgroundColor: 'rgba(48, 125, 55, 0.72)', borderWidth: 2, borderColor: '#9DDA72' },
  mossText: { color: '#E7FFB1', fontSize: 22, fontWeight: '900' as const, textShadowColor: '#225D2A', textShadowRadius: 3 },
};
const styles = StyleSheet.create({
  ...effectStyles,
  offerMessage: { color: '#B05842', fontSize: 12, fontWeight: '800', textAlign: 'center', marginBottom: 10 }, offerConfirmDisabled: { opacity: 0.55, shadowOpacity: 0 },
  root: { flex: 1, backgroundColor: '#F4E9DD' }, islandScreen: { flex: 1 }, islandBackground: { resizeMode: 'cover' }, darkVeil: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(4, 26, 42, 0.02)' },
  topBar: { height: 94, paddingHorizontal: 12, paddingTop: 2, zIndex: 2 }, logoImage: { position: 'absolute', left: -7, top: -5, width: 126, height: 94 }, currencies: { position: 'absolute', left: 122, right: 9, top: 12, height: 47, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 3, backgroundColor: '#063D5C', borderRadius: 15, borderWidth: 1, borderColor: '#2C83AE', shadowColor: '#021B2C', shadowOpacity: 0.38, shadowOffset: { width: 0, height: 3 }, shadowRadius: 5, elevation: 5 }, energyMeter: { flex: 1.55, minWidth: 78, height: 39, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, borderRadius: 11, backgroundColor: 'rgba(10, 83, 111, 0.72)', borderWidth: 1, borderColor: 'rgba(154, 225, 246, 0.3)' }, energyBolt: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#226E91', borderWidth: 1, borderColor: '#5FC9EE' }, energyBoltFull: { backgroundColor: '#E6A628', borderColor: '#FFE695' }, energyBoltText: { color: '#FFF3A3', fontSize: 16, lineHeight: 19, fontWeight: '900' }, energyCopy: { flex: 1, marginLeft: 4 }, energyLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }, energyValue: { color: '#F6FCFF', fontSize: 12, fontWeight: '900' }, energyMaximum: { color: '#A7D8E9', fontSize: 9, fontWeight: '800' }, energyState: { color: '#8FE2FF', fontSize: 8, fontWeight: '900', letterSpacing: 0.3 }, energyStateFull: { color: '#FFE58D' }, energyTrack: { height: 5, marginTop: 2, overflow: 'hidden', borderRadius: 4, backgroundColor: '#032B43' }, energyFill: { height: '100%', minWidth: 4, borderRadius: 4, backgroundColor: '#49C8ED' }, energyFillFull: { backgroundColor: '#F4C34A' }, pill: { flex: 1, minWidth: 0, height: 39, paddingHorizontal: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }, energyPill: { flex: 0.93 }, coinPill: { flex: 1.05, marginLeft: 2, borderRightWidth: 1, borderRightColor: 'rgba(111, 190, 220, 0.25)' }, gemPill: { flex: 0.84 }, currencyImage: { width: 27, height: 27, resizeMode: 'contain' }, pillIcon: { fontSize: 22, fontWeight: '900', lineHeight: 23, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 1 }, energyIcon: { color: '#FFD137' }, coinIcon: { color: '#FFCA35' }, gemIcon: { color: '#EF56EC' }, pillText: { color: '#FFF8E6', fontSize: 11, fontWeight: '900' }, pillPlus: { color: '#EEFFE6', backgroundColor: '#4EBE3D', width: 17, height: 17, overflow: 'hidden', textAlign: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#B8EE89', fontSize: 14, lineHeight: 15, fontWeight: '900' },
  sideActions: { position: 'absolute', right: 13, top: 148, gap: 9 }, roundButton: { width: 53, height: 53, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#07527A', borderWidth: 3, borderColor: '#1A78A5', shadowColor: '#12364B', shadowOpacity: 0.42, shadowOffset: { width: 0, height: 3 }, shadowRadius: 3, elevation: 5 }, roundIcon: { color: '#FFF3D3', fontSize: 31, fontWeight: '900', textShadowColor: '#06364F', textShadowRadius: 2 },
  islandQuest: { position: 'absolute', left: 0, right: 4, bottom: 0, height: 237, justifyContent: 'flex-end' }, islandMira: { position: 'absolute', left: -2, bottom: -4, width: 126, height: 218, zIndex: 3 }, questSpeech: { height: 217, marginLeft: 75, backgroundColor: '#FFF8E8', borderRadius: 25, paddingTop: 11, paddingLeft: 17, paddingRight: 11, borderWidth: 3, borderColor: '#E6B66F', shadowColor: '#442D1E', shadowOpacity: 0.32, shadowOffset: { width: 0, height: 5 }, shadowRadius: 8, elevation: 7 }, questHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 55, marginRight: 104 }, questLocation: { color: '#A96E2E', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, questProgress: { color: '#6B9B4C', backgroundColor: '#EAF5D4', borderRadius: 10, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 2, fontSize: 10, fontWeight: '900' }, questTitle: { color: '#59381D', fontSize: 18, lineHeight: 20, fontWeight: '900', marginTop: 5, marginLeft: 55, marginRight: 12 }, questDescription: { color: '#89674A', fontSize: 11, lineHeight: 15, marginTop: 3, marginLeft: 55, marginRight: 12 }, chapterCompleteText: { color: '#81644A', fontWeight: '700', textAlign: 'center' }, chapterCompleteActions: { marginTop: 12, marginLeft: 55, marginRight: 10 }, chapterStartButton: { height: 48, marginTop: 9, overflow: 'hidden', backgroundColor: '#4EBC35', borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#D5F699', shadowColor: '#2E6F25', shadowOpacity: 0.42, shadowOffset: { width: 0, height: 4 }, shadowRadius: 3, elevation: 5 }, questActions: { position: 'absolute', left: 66, right: 10, bottom: 12, height: 75, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, requirements: { height: 75, flexDirection: 'row', alignItems: 'center', gap: 5 }, requirement: { alignItems: 'center', justifyContent: 'center', width: 44, height: 75, backgroundColor: '#F8E6C4', paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: '#E8CFA5' }, requirementIcon: { width: 34, height: 34 }, requirementText: { color: '#5B3721', fontWeight: '900', fontSize: 11, marginTop: 3 }, questButton: { width: 94, height: 75, overflow: 'hidden', backgroundColor: '#4EBC35', borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#D5F699', shadowColor: '#2E6F25', shadowOpacity: 0.42, shadowOffset: { width: 0, height: 4 }, shadowRadius: 3, elevation: 5 }, questCompleteButton: { backgroundColor: '#DE8B28', borderColor: '#FFE29A' }, questButtonGloss: { position: 'absolute', top: 4, left: 7, right: 7, height: 18, borderRadius: 10, backgroundColor: 'rgba(232,255,181,0.38)' }, questButtonText: { color: '#FFF', fontSize: 18, fontWeight: '900', textShadowColor: '#287724', textShadowRadius: 2 },
  boardScreen: { flex: 1, backgroundColor: '#163D54' }, boardIntro: { height: 76, marginHorizontal: 13, marginTop: 3, marginBottom: 5, flexDirection: 'row', alignItems: 'center' }, boardPortrait: { width: 92, height: 78, overflow: 'visible', borderRadius: 0, backgroundColor: 'transparent', zIndex: 3, elevation: 4 }, boardPortraitImage: { position: 'absolute', width: 126, height: 194, left: -18, top: -12 }, boardDialogueBubble: { flex: 1, minWidth: 0, height: 52, marginLeft: -10, paddingLeft: 18, paddingRight: 10, flexDirection: 'row', alignItems: 'center', borderRadius: 18, backgroundColor: '#FFF6E4', borderWidth: 2, borderColor: '#E7C47F', shadowColor: '#071C28', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 3 }, shadowRadius: 4, elevation: 3 }, boardBubbleTail: { position: 'absolute', left: 12, bottom: -6, width: 13, height: 13, backgroundColor: '#FFF6E4', borderRightWidth: 2, borderBottomWidth: 2, borderColor: '#E7C47F', transform: [{ rotate: '45deg' }] }, boardMissionCopy: { flex: 1, minWidth: 0 }, boardMissionEyebrow: { color: '#A97838', fontSize: 8, fontWeight: '900', letterSpacing: 1 }, boardSpeechTitle: { color: '#56391E', fontWeight: '900', fontSize: 13, marginTop: 1 }, boardMissionHint: { maxWidth: 86, marginLeft: 7, color: '#8A6948', fontSize: 9, lineHeight: 12, fontWeight: '700', textAlign: 'right' }, boardTaskCard: { marginLeft: 120, marginRight: 13, marginBottom: 6, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: '#F4F8EE', borderRadius: 14, borderWidth: 1, borderColor: '#BFD89D', shadowColor: '#071C28', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 3 }, shadowRadius: 4, elevation: 3 }, chapterCompleteCard: { minHeight: 53, marginHorizontal: 13, marginBottom: 8, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: '#FFF0C9', borderRadius: 14, borderWidth: 1, borderColor: '#E9B85D' }, chapterCompleteTitle: { color: '#765324', fontSize: 11, fontWeight: '900', marginTop: 2, maxWidth: 225 }, boardTaskHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, boardTaskLabel: { color: '#668B46', fontSize: 8, fontWeight: '900', letterSpacing: 1 }, boardTaskState: { zIndex: 6, elevation: 6, color: '#63844A', backgroundColor: '#E2F0D2', borderRadius: 8, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 3, fontSize: 8, fontWeight: '900' }, boardRequirements: { flexDirection: 'row', gap: 5, marginTop: 3 }, boardRequirement: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 3, padding: 4, borderRadius: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D8E5C8' }, boardRequirementReady: { backgroundColor: '#DDF2D0', borderColor: '#82BF63' }, boardRequirementIcon: { width: 18, height: 18 }, boardRequirementName: { color: '#58723A', fontSize: 8, fontWeight: '800' }, boardRequirementText: { color: '#40592B', fontSize: 10, fontWeight: '900' }, boardCompleteButton: { backgroundColor: '#D7792B', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#FFE49A' }, boardCompleteButtonText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  gameBoard: { flex: 1, marginHorizontal: 0, padding: 8, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'space-between', justifyContent: 'space-between', gap: 4, backgroundColor: '#D7B688', borderRadius: 22, borderWidth: 4, borderColor: '#9E7046', shadowColor: '#101F2A', shadowOpacity: 0.35, shadowRadius: 9, elevation: 6, position: 'relative' }, tile: { width: '15.4%', height: '17%', borderRadius: 9, backgroundColor: '#F9E7C5', borderWidth: 1, borderColor: '#E0C397', shadowColor: '#795333', shadowOpacity: 0.19, shadowRadius: 3, elevation: 2 }, refinedTile: { backgroundColor: '#DDEFF5', borderColor: '#4B9CC3', borderWidth: 2 }, projectTile: { backgroundColor: '#FFF1BE', borderColor: '#E5A93B', borderWidth: 3, shadowColor: '#E19A28', shadowOpacity: 0.75, shadowRadius: 7, elevation: 7 }, tilePress: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, selectedTile: { borderColor: '#F4B128', backgroundColor: '#FFF2A6', borderWidth: 3 }, tileImage: { width: '84%', height: '84%' }, levelBadge: { position: 'absolute', right: 2, bottom: 2, minWidth: 19, height: 19, paddingHorizontal: 3, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#397CB2', borderWidth: 1, borderColor: '#D8F0FF' }, levelBadgeMax: { backgroundColor: '#C77A22', borderColor: '#FFF0A1' }, levelBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' }, emptyCell: { width: '15.4%', height: '17%', borderRadius: 9, backgroundColor: 'rgba(110, 71, 43, 0.18)' }, burst: { position: 'absolute', left: 0, right: 0, alignItems: 'center', top: '43%', backgroundColor: 'transparent' }, burstText: { color: '#A55E18', backgroundColor: '#FFF4C5', borderRadius: 17, paddingHorizontal: 12, paddingVertical: 7, fontWeight: '900', textAlign: 'center', lineHeight: 20 }, boardFooter: { marginTop: 10, paddingHorizontal: 13 }, energyHint: { color: '#CBE9EE', textAlign: 'center', fontSize: 11, fontWeight: '700', marginBottom: 5 }, energyStatus: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 14, backgroundColor: 'rgba(5, 30, 45, 0.72)', borderWidth: 1, borderColor: 'rgba(126, 215, 239, 0.34)' }, energyStatusIcon: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#227FA5' }, energyStatusIconFull: { backgroundColor: '#E9B433' }, energyStatusBolt: { color: '#FFF6AF', fontSize: 13, fontWeight: '900' }, energyStatusText: { color: '#EAFBFF', fontSize: 11, fontWeight: '800' }, energyStatusValue: { color: '#9ADBED', fontSize: 10, fontWeight: '900' }, recipeBar: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 7, backgroundColor: '#FFF1D4', borderRadius: 16, borderWidth: 2, borderColor: '#E3B56B' }, recipeSlot: { width: 45, height: 45, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2D7A9', borderWidth: 1, borderColor: '#D2A16B' }, recipeIcon: { fontSize: 23 }, nextResourceImage: { width: 31, height: 31, resizeMode: 'contain' }, recipeText: { color: '#654426', fontWeight: '900', fontSize: 12, flex: 1 }, recipeArrow: { color: '#E3952A', fontWeight: '900', fontSize: 20 }, recipeAction: { minWidth: 68, height: 45, paddingHorizontal: 9, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#42A936', borderWidth: 2, borderColor: '#D2F59C', shadowColor: '#173D21', shadowOpacity: 0.32, shadowOffset: { width: 0, height: 3 }, shadowRadius: 3, elevation: 4 }, recipeActionText: { color: '#FFF', fontSize: 13, fontWeight: '900', lineHeight: 18 }, deliverAction: { height: 39, borderRadius: 10, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D7792B', borderWidth: 2, borderColor: '#FFE49A' }, deliverActionText: { color: '#FFF', fontSize: 11, fontWeight: '900' }, disabled: { opacity: 0.5 },
  bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#F1E5DB', borderTopWidth: 2, borderTopColor: '#D7B49A', shadowColor: '#1D2E3A', shadowOpacity: 0.3, shadowRadius: 9, elevation: 10 }, navItem: { alignItems: 'center', justifyContent: 'flex-start', flex: 1, paddingTop: 5, backgroundColor: '#F2E6DC', borderTopWidth: 2, borderBottomWidth: 1, borderLeftWidth: 1, borderColor: '#D9C0AB' }, navItemFirst: { borderTopLeftRadius: 22 }, navItemLast: { borderTopRightRadius: 22, borderRightWidth: 1 }, navItemActive: { backgroundColor: '#FFE6AC', borderColor: '#D7A85C', borderWidth: 2, borderBottomWidth: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22, zIndex: 1 }, navIcon: { width: 58, height: 57, alignItems: 'center', justifyContent: 'center' }, navImage: { width: 56, height: 53 }, navEmoji: { fontSize: 27, color: '#B47630', fontWeight: '900' }, navLabel: { color: '#442919', fontWeight: '900', fontSize: 13, marginTop: -1 }, navLabelActive: { color: '#3A2619' },
  offerBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(4, 24, 36, 0.72)' }, offerDismissArea: { ...StyleSheet.absoluteFill }, offerCard: { width: '100%', maxWidth: 360, alignItems: 'center', paddingHorizontal: 22, paddingTop: 24, paddingBottom: 18, backgroundColor: '#FFF7E8', borderRadius: 28, borderWidth: 2, borderColor: '#E7B866', shadowColor: '#071C28', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 12 }, offerClose: { position: 'absolute', top: 10, right: 12, width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#F5E4C7' }, offerCloseText: { color: '#795331', fontSize: 26, lineHeight: 28, fontWeight: '700' }, offerEyebrow: { color: '#A97838', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }, offerTitle: { color: '#503421', fontSize: 23, fontWeight: '900', marginTop: 5, textAlign: 'center' }, offerBody: { color: '#886B4C', fontSize: 13, fontWeight: '600', marginTop: 5, textAlign: 'center' }, offerExchange: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 18, paddingVertical: 13, borderRadius: 18, backgroundColor: '#F8E8C9', borderWidth: 1, borderColor: '#E8CC98' }, offerResource: { minWidth: 82, alignItems: 'center' }, offerResourceImage: { width: 42, height: 42, resizeMode: 'contain' }, offerResourceValue: { color: '#563A23', fontSize: 18, fontWeight: '900', marginTop: 1 }, offerResourceLabel: { color: '#94704A', fontSize: 11, fontWeight: '800' }, offerArrow: { color: '#D28A2D', fontSize: 30, fontWeight: '900', marginHorizontal: 18 }, offerEnergy: { minWidth: 82, alignItems: 'center' }, offerEnergyIcon: { fontSize: 36, lineHeight: 42, color: '#F4B92A' }, offerEnergyValue: { color: '#3B8D32', fontSize: 18, fontWeight: '900', marginTop: -1 }, offerConfirm: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 14, borderRadius: 15, backgroundColor: '#45B936', borderWidth: 2, borderColor: '#B9EF7C', shadowColor: '#2C7627', shadowOpacity: 0.28, shadowOffset: { width: 0, height: 3 }, shadowRadius: 3, elevation: 4 }, offerConfirmText: { color: '#FFF', fontSize: 16, fontWeight: '900' }, offerCancel: { paddingVertical: 10 }, offerCancelText: { color: '#987451', fontSize: 12, fontWeight: '800' }, introBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 25, backgroundColor: 'transparent' }, introCard: { width: '100%', alignItems: 'center', backgroundColor: '#FFF4D9', borderRadius: 28, padding: 23 }, introMira: { width: 120, height: 145, marginTop: -48 }, introTitle: { color: '#513C2D', fontSize: 23, fontWeight: '900', textAlign: 'center' }, introBody: { color: '#81644A', textAlign: 'center', lineHeight: 20, marginTop: 8 }, introButton: { alignSelf: 'stretch', backgroundColor: '#54B83C', borderRadius: 13, padding: 14, alignItems: 'center', marginTop: 18 }, introButtonText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  tutorialFallbackBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(4, 24, 36, 0.78)' }, tutorialFallbackCard: { width: '100%', maxWidth: 350, padding: 24, backgroundColor: '#FFF7E7', borderRadius: 26, borderWidth: 2, borderColor: '#E8BC70' }, tutorialFallbackEyebrow: { color: '#A47639', fontSize: 10, fontWeight: '900', letterSpacing: 1 }, tutorialFallbackTitle: { marginTop: 7, color: '#563A23', fontSize: 24, fontWeight: '900' }, tutorialFallbackBody: { marginTop: 9, color: '#806148', fontSize: 14, lineHeight: 20 }, tutorialFallbackButton: { marginTop: 20, paddingVertical: 14, alignItems: 'center', backgroundColor: '#4EB63A', borderRadius: 13 }, tutorialFallbackButtonText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});
