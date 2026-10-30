import { Animated } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useEffect, useMemo, useRef } from 'react';

const DISMISS_DISTANCE = 48;
const DISMISS_VELOCITY = 0.85;
const DISMISS_TRANSLATE_Y = 520;

/** Makes a bottom sheet follow a native downward-pan gesture and dismiss once it crosses the threshold. */
export function useSheetDismissGesture(visible: boolean, onDismiss: () => void) {
  const translateY = useRef(new Animated.Value(0)).current;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [translateY, visible]);

  const panGesture = useMemo(() => Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-24, 24])
    .onUpdate(event => translateY.setValue(Math.max(0, event.translationY)))
    .onEnd(event => {
      if (event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY * 1000) {
        Animated.timing(translateY, { toValue: DISMISS_TRANSLATE_Y, duration: 180, useNativeDriver: true }).start(({ finished }) => {
          if (finished) onDismissRef.current();
        });
        return;
      }
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    })
    .onFinalize((_, success) => {
      if (!success) Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    }), [translateY]);

  return {
    panGesture,
    sheetStyle: { transform: [{ translateY }] },
  };
}
