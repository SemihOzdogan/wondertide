import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ResourceKind, StoryChapter, StoryTask } from '../../domain/game';

type Props = {
  visible: boolean;
  chapters: StoryChapter[];
  activeChapterId: string;
  unlockedChapterIds: string[];
  completedTaskIds: string[];
  inventory: Record<ResourceKind, number>;
  onChoose: (chapterId: string) => void;
  onClose: () => void;
};

const resourceLabels: Record<ResourceKind, string> = { driftwood: 'Odun', seaGlass: 'Deniz camı', shell: 'Kabuk' };

export function StoryMapSheet({ visible, chapters, activeChapterId, unlockedChapterIds, completedTaskIds, inventory, onChoose, onClose }: Props) {
  const activeChapter = chapters.find(chapter => chapter.id === activeChapterId) ?? chapters[0];
  return <Modal animationType="slide" transparent presentationStyle="overFullScreen" visible={visible} onRequestClose={onClose}>
    <View style={styles.backdrop}><View style={styles.sheet}>
      <View style={styles.handle} />
      <Text style={styles.title}>Hikâye haritası</Text>
      <Text style={styles.body}>{activeChapter.theme}</Text>
      <ScrollView contentContainerStyle={styles.chapterList} showsVerticalScrollIndicator={false}>{chapters.map((chapter, index) => {
        const unlocked = unlockedChapterIds.includes(chapter.id);
        const active = chapter.id === activeChapterId;
        const completedCount = chapter.tasks.filter(task => completedTaskIds.includes(task.id)).length;
        return <Pressable key={chapter.id} disabled={!unlocked} onPress={() => { onChoose(chapter.id); onClose(); }} style={[styles.chapter, active && styles.active, !unlocked && styles.locked]}>
          <Text style={styles.icon}>{unlocked ? chapter.mapIcon : '🔒'}</Text>
          <View style={styles.chapterCopy}><Text style={styles.chapterLabel}>BÖLÜM {index + 1}</Text><Text style={styles.chapterTitle}>{chapter.title}</Text><Text style={styles.chapterBody}>{unlocked ? `${chapter.location} · ${completedCount}/${chapter.tasks.length} görev` : 'Önceki hikâyeyi tamamla'}</Text></View>
          {active ? <Text style={styles.playing}>Oynanıyor</Text> : completedCount === chapter.tasks.length ? <Text style={styles.done}>✓</Text> : null}
        </Pressable>;
      })}{<TaskList chapter={activeChapter} completedTaskIds={completedTaskIds} inventory={inventory} />}</ScrollView>
      <Pressable accessibilityRole="button" accessibilityLabel="Hikâye haritasını kapat" onPress={onClose} style={styles.close}><Text style={styles.closeText}>Haritayı kapat</Text></Pressable>
    </View></View>
  </Modal>;
}

function TaskList({ chapter, completedTaskIds, inventory }: { chapter: StoryChapter; completedTaskIds: string[]; inventory: Record<ResourceKind, number> }) {
  return <View style={styles.taskSection}><Text style={styles.taskSectionTitle}>{chapter.title} görevleri</Text>{chapter.tasks.map((task, index) => <TaskRow key={task.id} task={task} index={index} completed={completedTaskIds.includes(task.id)} locked={index > 0 && !completedTaskIds.includes(chapter.tasks[index - 1].id)} inventory={inventory} />)}</View>;
}

function TaskRow({ task, index, completed, locked, inventory }: { task: StoryTask; index: number; completed: boolean; locked: boolean; inventory: Record<ResourceKind, number> }) {
  const requirements = Object.entries(task.requirements).map(([kind, amount]) => `${inventory[kind as ResourceKind]}/${amount} ${resourceLabels[kind as ResourceKind]}`).join(' · ');
  const reward = `+${task.reward.coins} altın${task.reward.gems ? ` · +${task.reward.gems} mücevher` : ''}`;
  return <View style={[styles.taskRow, completed && styles.taskRowDone, locked && styles.taskRowLocked]}><View style={[styles.taskBadge, completed && styles.taskBadgeDone]}><Text style={styles.taskBadgeText}>{completed ? '✓' : index + 1}</Text></View><View style={styles.taskCopy}><Text style={styles.taskTitle}>{task.title}</Text><Text style={styles.taskDescription}>{locked ? 'Önceki görevi tamamla' : task.description}</Text>{!locked && !completed ? <Text style={styles.taskRequirements}>{requirements}</Text> : null}<Text style={styles.taskReward}>{completed ? 'Tamamlandı' : reward}</Text></View></View>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16, 35, 45, 0.42)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', backgroundColor: '#FFF4D9', padding: 22, paddingBottom: 30, borderTopLeftRadius: 28, borderTopRightRadius: 28 }, handle: { width: 42, height: 5, borderRadius: 5, backgroundColor: '#D6BFA0', alignSelf: 'center', marginBottom: 18 },
  title: { color: '#513C2D', fontSize: 24, fontWeight: '900' }, body: { color: '#81644A', marginTop: 5, marginBottom: 16, lineHeight: 19 },
  chapterList: { paddingBottom: 2 }, chapter: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFDF7', padding: 14, borderRadius: 17, borderWidth: 1, borderColor: '#E5CEAD', marginBottom: 10 }, active: { borderColor: '#EF9C37', borderWidth: 2, backgroundColor: '#FFF0C8' }, locked: { opacity: 0.55 }, icon: { fontSize: 32, marginRight: 12 }, chapterCopy: { flex: 1 }, chapterLabel: { color: '#A6825C', fontSize: 10, fontWeight: '900', letterSpacing: 1 }, chapterTitle: { color: '#513C2D', fontWeight: '900', fontSize: 17, marginTop: 1 }, chapterBody: { color: '#81644A', fontSize: 12, marginTop: 2 }, playing: { color: '#348D39', fontWeight: '900', fontSize: 11 }, done: { color: '#348D39', fontSize: 18, fontWeight: '900' },
  taskSection: { marginTop: 8, padding: 14, borderRadius: 18, backgroundColor: '#F7E7C9', borderWidth: 1, borderColor: '#E6C48C' }, taskSectionTitle: { color: '#5E3C22', fontSize: 16, fontWeight: '900', marginBottom: 10 }, taskRow: { flexDirection: 'row', padding: 10, backgroundColor: '#FFFDF7', borderRadius: 13, marginTop: 7, borderWidth: 1, borderColor: '#E8D4B6' }, taskRowDone: { backgroundColor: '#E8F5DA', borderColor: '#A9D78B' }, taskRowLocked: { opacity: 0.55 }, taskBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E99D37', alignItems: 'center', justifyContent: 'center', marginRight: 9 }, taskBadgeDone: { backgroundColor: '#49A84B' }, taskBadgeText: { color: '#FFF', fontWeight: '900', fontSize: 13 }, taskCopy: { flex: 1 }, taskTitle: { color: '#593B22', fontWeight: '900', fontSize: 14 }, taskDescription: { color: '#806148', fontSize: 11, marginTop: 2, lineHeight: 15 }, taskRequirements: { color: '#9C6930', fontSize: 10, fontWeight: '800', marginTop: 5 }, taskReward: { color: '#378440', fontSize: 10, fontWeight: '900', marginTop: 4 },
  close: { alignItems: 'center', paddingTop: 10 }, closeText: { color: '#2A6B8B', fontWeight: '900' },
});
