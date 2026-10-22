export type RootStackParamList = {
  MainTabs: undefined;
  Board: undefined;
};

export type MainTabParamList = {
  Island: undefined;
  Tasks: { openId?: number } | undefined;
  Bag: { openId?: number } | undefined;
  Shop: undefined;
};
