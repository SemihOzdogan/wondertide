import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useGameStore } from '../../store/gameStore';
import {
  loadWeeklyLeaderboard,
  submitDailyChallengeScore,
  type DailyLeaderboardEntry,
} from '../../services/supabase/leaderboardService';

type Tile = { id: string; kind: 'Tahta' | 'Cam' | 'Kabuk'; level: 1 | 2 | 3 };
type TileFrame = { x: number; y: number; width: number; height: number };
const challengeResources: Tile['kind'][] = ['Tahta', 'Cam', 'Kabuk'];
const maxMoves = 12;
const targetScore = 1_200;
const challengeItemImages: Record<Tile['kind'], number> = {
  Tahta: require('../../../assets/images/item-driftwood.png'),
  Cam: require('../../../assets/images/item-sea-glass.png'),
  Kabuk: require('../../../assets/images/item-shell.png'),
};

function dailySeed() {
  return new Date()
    .toISOString()
    .slice(0, 10)
    .split('-')
    .reduce((value, part) => value * 31 + Number(part), 7);
}

function shuffledDaily<T>(items: T[], seed: number) {
  const result = [...items];
  let value = seed;
  for (let index = result.length - 1; index > 0; index -= 1) {
    value = (value * 1664525 + 1013904223) >>> 0;
    const other = value % (index + 1);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function createDailyBoard(seed: number): Tile[] {
  const base = [
    ...challengeResources.flatMap(kind =>
      Array.from({ length: 8 }, (_, index) => ({
        kind,
        level: 1 as const,
        key: `${kind}-one-${index}`,
      })),
    ),
    ...challengeResources.map(kind => ({
      kind,
      level: 2 as const,
      key: `${kind}-two`,
    })),
    ...challengeResources.map(kind => ({
      kind,
      level: 3 as const,
      key: `${kind}-project`,
    })),
  ];
  return shuffledDaily(base, seed).map((tile, index) => ({
    ...tile,
    id: `day-${seed}-${index}`,
  }));
}

function createDailyRefill(seed: number) {
  return shuffledDaily(
    Array.from(
      { length: maxMoves },
      (_, index) => challengeResources[index % challengeResources.length],
    ),
    seed + 97,
  );
}

type Props = { visible: boolean; onClose: () => void };

export function DailyChallengeSheet({ visible, onClose }: Props) {
  const recordScore = useGameStore(state => state.recordDailyChallengeScore);
  const bestScore = useGameStore(state => state.dailyChallengeBestScore);
  const [tiles, setTiles] = useState<Tile[]>(() =>
    createDailyBoard(dailySeed()),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState(
    'Aynı tür ve seviyedeki iki taşı birleştir.',
  );
  const [finished, setFinished] = useState(false);
  const [ranking, setRanking] = useState<DailyLeaderboardEntry[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [rankingPeriod, setRankingPeriod] = useState<'weekly' | 'daily'>(
    'weekly',
  );
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [refill, setRefill] = useState<Tile['kind'][]>(() =>
    createDailyRefill(dailySeed()),
  );
  const boardRef = useRef<React.ComponentRef<typeof View>>(null);
  const boardFrameRef = useRef<TileFrame | null>(null);
  const tileFramesRef = useRef(new Map<string, TileFrame>());

  const orderedTiles = useMemo(
    () => [...tiles, ...Array<Tile | null>(30 - tiles.length).fill(null)],
    [tiles],
  );

  useEffect(() => {
    if (!visible) return;
    const seed = dailySeed();
    setTiles(createDailyBoard(seed));
    setRefill(createDailyRefill(seed));
    setSelected(null);
    setMoves(0);
    setScore(0);
    setFinished(false);
    setMessage('12 hamlede 1.200 puana ulaşabilecek birleşim zincirini kur.');
    refreshRanking();
  }, [visible]);

  async function refreshRanking() {
    setLoadingRanking(true);
    try {
      const leaderboard = await loadWeeklyLeaderboard();
      setRanking(leaderboard.entries);
      setTotalPlayers(leaderboard.totalPlayers);
      setRankingPeriod(leaderboard.period);
      setRankingError(null);
    } catch (error) {
      setRanking([]);
      setTotalPlayers(0);
      setRankingPeriod('weekly');
      setRankingError(
        error instanceof Error ? error.message : 'Sıralama şu an yüklenemedi.',
      );
    } finally {
      setLoadingRanking(false);
    }
  }

  async function finish(finalScore: number) {
    setFinished(true);
    const best = recordScore(finalScore);
    setMessage(`Tur tamamlandı! Günün en iyi skorun: ${best}.`);
    try {
      await submitDailyChallengeScore(best);
      await refreshRanking();
    } catch {
      setMessage(
        `Tur tamamlandı! Skorun ${best}; bağlantı gelince sıralamaya gönderilecek.`,
      );
    }
  }

  function attemptMerge(firstId: string, tile: Tile) {
    const first = tiles.find(candidate => candidate.id === firstId);
    if (
      !first ||
      first.kind !== tile.kind ||
      first.level !== tile.level ||
      tile.level === 3
    ) {
      setSelected(tile.id);
      setMessage('Yalnızca aynı tür ve aynı seviyedeki taşlar birleşir.');
      return;
    }
    const nextLevel = (tile.level + 1) as 2 | 3;
    const move = moves + 1;
    const gained = nextLevel === 3 ? 300 : 50;
    const nextTiles = tiles.filter(
      candidate => candidate.id !== first.id && candidate.id !== tile.id,
    );
    nextTiles.push({ id: `merge-${move}`, kind: tile.kind, level: nextLevel });
    if (refill[move - 1] && nextTiles.length < 30)
      nextTiles.push({ id: `new-${move}`, kind: refill[move - 1], level: 1 });
    const nextScore = score + gained;
    setTiles(nextTiles);
    setMoves(move);
    setScore(nextScore);
    setSelected(null);
    setMessage(
      nextLevel === 3
        ? 'Seviye 3 zinciri tamamlandı: +300 puan.'
        : 'Seviye 2 birleşim: +50 puan.',
    );
    if (move >= maxMoves) finish(nextScore);
  }

  function choose(tile: Tile) {
    if (finished || moves >= maxMoves) return;
    if (!selected) {
      setSelected(tile.id);
      return;
    }
    if (selected === tile.id) {
      setSelected(null);
      return;
    }
    attemptMerge(selected, tile);
  }

  function measureBoard() {
    boardRef.current?.measureInWindow((x, y, width, height) => {
      boardFrameRef.current = { x, y, width, height };
    });
  }

  function handleDrop(tileId: string, absoluteX: number, absoluteY: number) {
    if (finished || moves >= maxMoves || !boardFrameRef.current) return;
    const boardFrame = boardFrameRef.current;
    const x = absoluteX - boardFrame.x;
    const y = absoluteY - boardFrame.y;
    const target = tiles.find(tile => {
      if (tile.id === tileId) return false;
      const frame = tileFramesRef.current.get(tile.id);
      return (
        frame &&
        x >= frame.x &&
        x <= frame.x + frame.width &&
        y >= frame.y &&
        y <= frame.y + frame.height
      );
    });
    if (!target) {
      setMessage('Birleştirmek için taşı eşinin üstüne bırak.');
      return;
    }
    attemptMerge(tileId, target);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Pressable
            accessibilityLabel="Meydan okumayı kapat"
            onPress={onClose}
            style={styles.close}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.eyebrow}>GÜNLÜK MEYDAN OKUMA</Text>
            <Text style={styles.title}>Kayıp Mercanlar</Text>
            <Text style={styles.description}>
              Aynı tahta, 12 hamle. Hedef: {targetScore.toLocaleString('tr-TR')}{' '}
              puan.
            </Text>
            <View style={styles.boardSection}>
              <View style={styles.scoreRow}>
                <View>
                  <Text style={styles.scoreLabel}>PUAN</Text>
                  <Text style={styles.scoreValue}>{score}</Text>
                </View>
                <View>
                  <Text style={styles.scoreLabel}>HAMLE</Text>
                  <Text style={styles.scoreValue}>
                    {moves}/{maxMoves}
                  </Text>
                </View>
                <View>
                  <Text style={styles.scoreLabel}>EN İYİ</Text>
                  <Text style={styles.scoreValue}>{bestScore}</Text>
                </View>
              </View>
              <View
                ref={boardRef}
                onLayout={() => requestAnimationFrame(measureBoard)}
                pointerEvents={finished || moves >= maxMoves ? 'none' : 'auto'}
                style={[
                  styles.board,
                  (finished || moves >= maxMoves) && styles.boardDisabled,
                ]}
              >
                {orderedTiles.map((tile, index) =>
                  tile ? (
                    <ChallengeTile
                      key={tile.id}
                      tile={tile}
                      selected={selected === tile.id}
                      onPress={() => choose(tile)}
                      onDrop={handleDrop}
                      onLayout={(id, frame) =>
                        tileFramesRef.current.set(id, frame)
                      }
                    />
                  ) : (
                    <View key={`empty-${index}`} style={styles.emptyTile} />
                  ),
                )}
              </View>
              <LeaguePreview
                ranking={ranking}
                totalPlayers={totalPlayers}
                period={rankingPeriod}
                loading={loadingRanking}
                error={rankingError}
              />
            </View>
            <Text style={styles.message}>{message}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function LeaguePreview({
  ranking,
  totalPlayers,
  period,
  loading,
  error,
}: {
  ranking: DailyLeaderboardEntry[];
  totalPlayers: number;
  period: 'weekly' | 'daily';
  loading: boolean;
  error: string | null;
}) {
  return (
    <View style={styles.ranking}>
      <View style={styles.rankingHeader}>
        <View style={styles.rankingHeading}>
          <Text style={styles.rankingEyebrow}>
            {period === 'weekly' ? 'HAFTALIK LİG' : 'GÜNLÜK SIRALAMA'}
          </Text>
          <Text style={styles.rankingTitle}>Gelgit Ligi</Text>
        </View>
        {totalPlayers ? (
          <Text style={styles.playerCount}>
            {totalPlayers.toLocaleString('tr-TR')} oyuncu
          </Text>
        ) : null}
        {loading ? <ActivityIndicator size="small" color="#2E7D92" /> : null}
      </View>
      {ranking.length ? (
        ranking.map(entry => (
          <View
            key={entry.player_id}
            style={[
              styles.rankRow,
              entry.leaderboard_rank === 1 && styles.firstRankRow,
              entry.is_current_player && styles.currentRankRow,
            ]}
          >
            <View
              style={[
                styles.rankBadge,
                entry.leaderboard_rank === 1 && styles.firstRankBadge,
              ]}
            >
              <Text style={styles.rank}>#{entry.leaderboard_rank}</Text>
            </View>
            <Text numberOfLines={1} style={styles.name}>
              {entry.is_current_player ? 'Sen' : entry.player_name}
            </Text>
            <View style={styles.rankScoreWrap}>
              <Text style={styles.rankScore}>{entry.score}</Text>
              <Text style={styles.rankScoreLabel}>puan</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={[styles.emptyRanking, error && styles.rankingError]}>
          {error
            ? `Sıralama yüklenemedi: ${error}`
            : 'Bugün henüz skor kaydedilmedi.'}
        </Text>
      )}
    </View>
  );
}

function ChallengeTile({
  tile,
  selected,
  onPress,
  onDrop,
  onLayout,
}: {
  tile: Tile;
  selected: boolean;
  onPress: () => void;
  onDrop: (tileId: string, absoluteX: number, absoluteY: number) => void;
  onLayout: (tileId: string, frame: TileFrame) => void;
}) {
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(10)
        .onUpdate(event => {
          dragX.setValue(event.translationX);
          dragY.setValue(event.translationY);
        })
        .onEnd(event => onDrop(tile.id, event.absoluteX, event.absoluteY))
        .onFinalize(() =>
          Animated.parallel([
            Animated.spring(dragX, { toValue: 0, useNativeDriver: true }),
            Animated.spring(dragY, { toValue: 0, useNativeDriver: true }),
            Animated.spring(scale, {
              toValue: selected ? 1.05 : 1,
              useNativeDriver: true,
            }),
          ]).start(),
        ),
    [dragX, dragY, onDrop, scale, selected, tile.id],
  );
  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 1.05 : 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  }, [scale, selected]);
  return (
    <GestureDetector gesture={dragGesture}>
      <Animated.View
        onLayout={event => onLayout(tile.id, event.nativeEvent.layout)}
        style={[
          styles.tile,
          tile.level === 2 && styles.refinedTile,
          tile.level === 3 && styles.projectTile,
          selected && styles.selectedTile,
          {
            transform: [
              { translateX: dragX },
              { translateY: dragY },
              { scale },
            ],
          },
        ]}
      >
        <Pressable onPress={onPress} style={styles.tilePress}>
          <Image
            source={challengeItemImages[tile.kind]}
            style={styles.tileImage}
            resizeMode="contain"
          />
          <View
            pointerEvents="none"
            style={[
              styles.levelBadge,
              tile.level === 3 && styles.levelBadgeMax,
            ]}
          >
            <Text style={styles.levelBadgeText}>●</Text>
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5, 28, 46, 0.72)',
  },
  sheet: {
    height: '92%',
    padding: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#163D54',
  },
  sheetContent: { padding: 14, paddingTop: 25, paddingBottom: 28 },
  close: {
    position: 'absolute',
    right: 15,
    top: 10,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#F5E4C7',
    zIndex: 2,
  },
  closeText: { color: '#795331', fontSize: 25, fontWeight: '800' },
  eyebrow: {
    color: '#A97838',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
    textAlign: 'center',
  },
  title: {
    color: '#FFF6E4',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 3,
    textAlign: 'center',
  },
  description: {
    color: '#CBE9EE',
    lineHeight: 17,
    marginTop: 4,
    textAlign: 'center',
    fontSize: 11,
  },
  boardSection: { marginTop: 10 },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 9,
    borderRadius: 14,
    backgroundColor: '#063D5C',
    borderWidth: 1,
    borderColor: '#2C83AE',
  },
  scoreLabel: { color: '#8FE2FF', fontSize: 8, fontWeight: '900' },
  scoreValue: {
    color: '#FFF8E6',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 1,
  },
  board: {
    height: 266,
    marginTop: 9,
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'space-between',
    justifyContent: 'space-between',
    backgroundColor: '#D7B688',
    borderRadius: 22,
    borderWidth: 4,
    borderColor: '#9E7046',
    shadowColor: '#101F2A',
    shadowOpacity: 0.35,
    shadowRadius: 9,
    elevation: 6,
  },
  boardDisabled: {
    opacity: 0.48,
  },
  tile: {
    width: '15.4%',
    height: '17%',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9E7C5',
    borderWidth: 1,
    borderColor: '#E0C397',
    shadowColor: '#795333',
    shadowOpacity: 0.19,
    shadowRadius: 3,
    elevation: 2,
  },
  tilePress: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  refinedTile: {
    backgroundColor: '#DDEFF5',
    borderColor: '#4B9CC3',
    borderWidth: 2,
  },
  projectTile: {
    backgroundColor: '#FFF1BE',
    borderColor: '#E5A93B',
    borderWidth: 3,
  },
  selectedTile: {
    borderColor: '#F4B128',
    backgroundColor: '#FFF2A6',
    borderWidth: 3,
  },
  emptyTile: {
    width: '15.4%',
    height: '17%',
    borderRadius: 9,
    backgroundColor: 'rgba(110, 71, 43, 0.18)',
  },
  tileImage: { width: '84%', height: '84%' },
  levelBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#397CB2',
    borderWidth: 1,
    borderColor: '#D8F0FF',
  },
  levelBadgeMax: { backgroundColor: '#C77A22', borderColor: '#FFF0A1' },
  levelBadgeText: { color: '#FFF', fontSize: 8, fontWeight: '900' },
  message: {
    minHeight: 30,
    color: '#CBE9EE',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  doneButton: {
    alignItems: 'center',
    padding: 11,
    borderRadius: 13,
    backgroundColor: '#42A936',
    borderWidth: 2,
    borderColor: '#D2F59C',
    marginBottom: 6,
  },
  doneText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  finishButton: { alignItems: 'center', paddingVertical: 7, marginBottom: 5 },
  finishText: {
    color: '#9ADBED',
    fontSize: 11,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  ranking: {
    marginTop: 8,
    padding: 10,
    borderRadius: 17,
    backgroundColor: '#073D59',
    borderWidth: 1,
    borderColor: '#3A91B4',
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankingHeading: {
    flex: 1,
    minWidth: 0,
  },
  rankingTitle: {
    color: '#FFF8E6',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 1,
  },
  rankingEyebrow: {
    color: '#8FE2FF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  playerCount: {
    color: '#D5F699',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 9,
    overflow: 'hidden',
    backgroundColor: 'rgba(78, 188, 53, 0.22)',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    marginTop: 6,
    paddingHorizontal: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
  },
  firstRankRow: {
    backgroundColor: 'rgba(244, 195, 74, 0.2)',
    borderWidth: 1,
    borderColor: '#F4C34A',
  },
  rankBadge: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#1C7197',
    marginRight: 8,
  },
  firstRankBadge: { backgroundColor: '#E5A93B' },
  rank: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  currentRankRow: {
    backgroundColor: 'rgba(213, 246, 153, 0.26)',
    borderWidth: 1,
    borderColor: '#D5F699',
  },
  name: {
    flex: 1,
    minWidth: 0,
    color: '#F4FBFF',
    fontWeight: '800',
    fontSize: 12,
  },
  rankScoreWrap: { alignItems: 'flex-end' },
  rankScore: { color: '#FFF8E6', fontWeight: '900', fontSize: 13 },
  rankScoreLabel: { color: '#8FE2FF', fontSize: 8, fontWeight: '800' },
  emptyRanking: { color: '#CBE9EE', fontSize: 11, marginTop: 7 },
  rankingError: { color: '#FFB5A2' },
});
