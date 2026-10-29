import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCopilot } from 'react-native-copilot';

import { useGameStore } from '../../store/gameStore';

export function CopilotTooltip() {
  const { currentStep, currentStepNumber, totalStepsNumber, isFirstStep, isLastStep, goToNext, goToPrev, stop } = useCopilot();
  const dismissIntro = useGameStore(state => state.dismissIntro);
  const beginGameTutorial = useGameStore(state => state.beginGameTutorial);
  const isWelcomeStep = currentStep?.name === 'start-game';

  async function finishTour() {
    dismissIntro();
    await stop();
  }

  async function advanceTour() {
    if (isWelcomeStep) {
      beginGameTutorial();
      await stop();
      return;
    }
    if (isLastStep) {
      await finishTour();
      return;
    }
    await goToNext();
  }

  return <View style={styles.card}>
    <Text style={styles.eyebrow}>MİRA’NIN KISA REHBERİ · {currentStepNumber}/{totalStepsNumber}</Text>
    <Text style={styles.title}>{isWelcomeStep ? 'Kıyı seni bekliyor' : currentStep?.name === 'mission' ? 'Görevin burada' : currentStep?.name === 'requirements' ? 'İhtiyaçları takip et' : currentStep?.name === 'merge-board' ? 'Parçaları birleştir' : 'Yeni parça üret'}</Text>
    <Text style={styles.body}>{currentStep?.text}</Text>
    <View style={styles.actions}>
      {!isFirstStep ? <Pressable accessibilityRole="button" accessibilityLabel="Önceki tutorial adımı" onPress={goToPrev} style={styles.secondaryButton}><Text style={styles.secondaryText}>Geri</Text></Pressable> : <Pressable accessibilityRole="button" accessibilityLabel="Tutorialı atla" onPress={finishTour} style={styles.secondaryButton}><Text style={styles.secondaryText}>Atla</Text></Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel={isWelcomeStep ? 'Tahtaya geç' : isLastStep ? 'Tutorialı tamamla' : 'Sonraki tutorial adımı'} onPress={advanceTour} style={styles.primaryButton}><Text style={styles.primaryText}>{isWelcomeStep ? 'Tahtaya geç' : isLastStep ? 'Anladım!' : 'Devam et'}</Text></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { width: 286, padding: 17, backgroundColor: '#FFF7E7', borderRadius: 20, borderWidth: 2, borderColor: '#E8BC70', shadowColor: '#071C28', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 10 },
  eyebrow: { color: '#A47639', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 }, title: { marginTop: 5, color: '#563A23', fontSize: 18, fontWeight: '900' }, body: { marginTop: 6, color: '#806148', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }, secondaryButton: { minWidth: 55, paddingVertical: 9, alignItems: 'center' }, secondaryText: { color: '#977451', fontSize: 13, fontWeight: '900' }, primaryButton: { minWidth: 110, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: '#4EB63A', borderRadius: 11, borderWidth: 2, borderColor: '#C5F08B' }, primaryText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
});
