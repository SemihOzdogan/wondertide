import Sound from 'react-native-sound';

Sound.setCategory('Playback', true);

const theme = require('../../assets/audio/wondertide-theme.wav');
let player: Sound | null = null;
let loading = false;
let enabled = true;
let effectsEnabled = true;
const musicVolume = 0.28;
const effectsVolume = 0.65;

export function configureGameAudio(
  nextEnabled: boolean,
  nextEffectsEnabled: boolean,
) {
  enabled = nextEnabled;
  effectsEnabled = nextEffectsEnabled;
  if (player) {
    player.setVolume(enabled ? musicVolume : 0);
  }
}

export function playGameEffect() {
  if (!effectsEnabled) return;
  let effect: Sound;
  effect = new Sound(theme, error => {
    if (error) return;
    effect.setVolume(effectsVolume);
    effect.setCurrentTime(0);
    effect.play(() => effect.release());
    setTimeout(() => effect.stop(() => effect.release()), 220);
  });
}

export function startGameMusic() {
  if (player || loading || !enabled) return;
  loading = true;
  let nextPlayer: Sound;
  nextPlayer = new Sound(theme, (error: unknown) => {
    loading = false;
    if (error) {
      console.warn('Oyun müziği yüklenemedi:', error);
      nextPlayer.release();
      return;
    }
    player = nextPlayer;
    nextPlayer.setNumberOfLoops(-1);
    nextPlayer.setVolume(musicVolume);
    nextPlayer.play(success => {
      if (!success) console.warn('Oyun müziği oynatılamadı.');
    });
  });
}

export function stopGameMusic() {
  loading = false;
  player?.stop(() => player?.release());
  player = null;
}
