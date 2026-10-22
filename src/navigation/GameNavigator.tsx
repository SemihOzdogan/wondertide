import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import type { BottomTabBarProps, BottomTabNavigationProp, BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameScreen } from '../features/game/GameScreen';
import type { MainTabParamList, RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();
const tabArt = {
  Island: require('../../assets/images/nav-island-v1.png'),
  Tasks: require('../../assets/images/nav-tasks-v1.png'),
  Bag: require('../../assets/images/nav-bag-v1.png'),
  Shop: require('../../assets/images/nav-shop-v1.png'),
} as const;
const tabLabels: Record<keyof MainTabParamList, string> = { Island: 'Ada', Tasks: 'Görevler', Bag: 'Profil', Shop: 'Tahta' };

function GameTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.bar, { height: 87 + insets.bottom }]}><View style={styles.tabSurface}>{state.routes.map((route, index) => {
    const tabName = route.name as keyof MainTabParamList;
    const active = state.index === index;
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (event.defaultPrevented) return;
      if (tabName === 'Tasks' || tabName === 'Bag') {
        navigation.navigate(tabName, { openId: Date.now() });
        return;
      }
      if (!active) navigation.navigate(route.name);
    };
    return <Pressable key={route.key} accessibilityRole="button" accessibilityState={active ? { selected: true } : {}} accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel} onPress={onPress} style={[styles.item, index === 0 && styles.first, index === state.routes.length - 1 && styles.last, active && styles.active, active && index === 0 && styles.activeFirst, active && index === state.routes.length - 1 && styles.activeLast]}>
      <Image source={tabArt[tabName]} style={styles.icon} resizeMode="contain" />
      <Text style={[styles.label, active && styles.activeLabel]}>{tabLabels[tabName]}</Text>
    </Pressable>;
  })}</View></View>;
}

function renderGameTabBar(props: BottomTabBarProps) { return <GameTabBar {...props} />; }

function IslandTabScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  return <GameScreen mode="island" onOpenBoard={() => navigation.navigate('Shop')} />;
}
function TasksTabScreen({ route }: BottomTabScreenProps<MainTabParamList, 'Tasks'>) {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  return <GameScreen mode="island" overlay="tasks" overlayOpenId={route.params?.openId} onOpenBoard={() => navigation.navigate('Shop')} />;
}
function BagTabScreen({ route }: BottomTabScreenProps<MainTabParamList, 'Bag'>) { return <GameScreen mode="island" overlay="account" overlayOpenId={route.params?.openId} />; }
function ShopTabScreen() { return <GameScreen mode="board" hasBottomTab />; }
function BoardScreen() { return <GameScreen mode="board" />; }

function MainTabs() {
  return <Tabs.Navigator initialRouteName="Island" tabBar={renderGameTabBar} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' }, tabBarStyle: { position: 'absolute', backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 } }}>
    <Tabs.Screen name="Island" component={IslandTabScreen} />
    <Tabs.Screen name="Tasks" component={TasksTabScreen} />
    <Tabs.Screen name="Bag" component={BagTabScreen} />
    <Tabs.Screen name="Shop" component={ShopTabScreen} />
  </Tabs.Navigator>;
}

export function GameNavigator() {
  return <NavigationContainer>
    <RootStack.Navigator initialRouteName="MainTabs" screenOptions={{ headerShown: false, animation: 'fade' }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen name="Board" component={BoardScreen} />
    </RootStack.Navigator>
  </NavigationContainer>;
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, paddingHorizontal: 7, right: 0, bottom: 0, alignItems: 'stretch', paddingTop: 20, backgroundColor: 'transparent', shadowColor: '#1D2E3A', shadowOpacity: 0.3, shadowRadius: 9, elevation: 10 },
  tabSurface: { flex: 1, flexDirection: 'row', alignItems: 'stretch', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.25, shadowOffset: { width: 0, height: -2 }, shadowRadius: 4, elevation: 5 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 6, backgroundColor: '#F2E6DC', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 2, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#D9C0AB' },
  first: { borderLeftWidth: 2 }, last: { borderRightWidth: 2 },
  active: { backgroundColor: '#FFE6AC', borderWidth: 2, borderColor: '#D7A85C', zIndex: 1 }, activeFirst: { borderTopLeftRadius: 24 }, activeLast: { borderTopRightRadius: 24 },
  icon: { width: 55, height: 52 }, label: { color: '#442919', fontWeight: '900', fontSize: 14, marginTop: -1 }, activeLabel: { color: '#3A2619' },
});
