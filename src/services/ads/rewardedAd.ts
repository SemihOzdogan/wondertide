import mobileAds, { AdEventType, RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

export type RewardedAdResult = 'completed' | 'dismissed' | 'unavailable' | 'failed';

export type RewardedAdProvider = {
  isReady: () => Promise<boolean>;
  show: () => Promise<RewardedAdResult>;
};

const productionRewardedAdUnitId = 'ca-app-pub-4537184745410870/9366679468';
const rewardedAdUnitId = __DEV__ ? TestIds.REWARDED : productionRewardedAdUnitId;

let provider: RewardedAdProvider | null = null;
let readyAd: RewardedAd | null = null;
let loadingAd: Promise<RewardedAd | null> | null = null;

export function configureRewardedAdProvider(nextProvider: RewardedAdProvider) {
  provider = nextProvider;
}

function loadRewardedAd(): Promise<RewardedAd | null> {
  const ad = RewardedAd.createForAdRequest(rewardedAdUnitId);
  return new Promise(resolve => {
    const unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => { cleanup(); resolve(ad); });
    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, () => { cleanup(); resolve(null); });
    const cleanup = () => { unsubscribeLoaded(); unsubscribeError(); };
    ad.load();
  });
}

async function prepareRewardedAd(): Promise<RewardedAd | null> {
  if (readyAd) return readyAd;
  loadingAd ??= loadRewardedAd().then(ad => { readyAd = ad; loadingAd = null; return ad; });
  return loadingAd;
}

async function showGoogleRewardedAd(): Promise<RewardedAdResult> {
  const ad = await prepareRewardedAd();
  if (!ad) return 'unavailable';
  readyAd = null;
  return new Promise(resolve => {
    let earnedReward = false;
    let finished = false;
    const finish = (result: RewardedAdResult) => {
      if (finished) return;
      finished = true;
      unsubscribeReward(); unsubscribeClosed(); unsubscribeError();
      void prepareRewardedAd();
      resolve(result);
    };
    const unsubscribeReward = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => { earnedReward = true; });
    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => finish(earnedReward ? 'completed' : 'dismissed'));
    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, () => finish('failed'));
    ad.show().catch(() => finish('failed'));
  });
}

export async function initializeRewardedAds() {
  try {
    await mobileAds().initialize();
    configureRewardedAdProvider({ isReady: async () => Boolean(await prepareRewardedAd()), show: showGoogleRewardedAd });
    void prepareRewardedAd();
  } catch (error) {
    console.warn('AdMob başlatılamadı:', error);
  }
}

export async function showRewardedEnergyAd(): Promise<RewardedAdResult> {
  if (!provider || !(await provider.isReady())) return 'unavailable';
  return provider.show();
}
