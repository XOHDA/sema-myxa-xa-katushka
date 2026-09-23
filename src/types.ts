export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';

export type LevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export type WeatherType = 'clear' | 'light-rain';

export interface LevelConfig {
  id: LevelId;
  name: string;
  subtitle: string;
  theme: 'day-to-night' | 'night-neon' | 'industrial' | 'sunset-highway' | 'storm' | 'cyber';
  weather: WeatherType;
  length: number; // in world coordinates
  gravity: number;
  description: string;
  baseSpeed: number; // cruising speed in px/s
  boostSpeed: number; // boost speed in px/s
  obstacleDensity: number; // obstacle frequency multiplier
  enemySpeed: number; // horizontal speed of oncoming enemies
  speedRatingKmh: number; // approximate target cruising speed in km/h
}

export type SkinType = 'emerald' | 'gold' | 'cyan' | 'ruby' | 'phantom';

export interface GarageUpgrades {
  batteryLevel: number; // 0..3
  controllerLevel: number; // 0..3
  hydroLevel: number; // 0..3
  selectedSkin: SkinType;
  unlockedSkins: SkinType[];
  totalVolts: number;
}

export interface PlayerStats {
  shields: number;
  maxShields: number;
  battery: number; // 0 - 100
  score: number;
  voltsCollected: number;
  distance: number;
  tricksCount: number;
  fallsCount: number;
  elapsedTime: number; // in seconds
  combo: number;
  comboProgress: number; // 0 - 100% to next multiplier tier
  comboTimer: number; // seconds remaining before decay
  comboMaxTimer: number; // base decay window (3.2s)
  activeTrickType: 'jump' | 'grind' | 'balance' | null;
  speedKmh: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
  pwm: number; // 0 - 100%
  maxPwm: number; // 0 - 100%
  isCutout: boolean;
  cutoutReason?: 'speed' | 'boost';
  isOverspeed: boolean;
  isBoosting: boolean;
  boostHoldDuration: number;
  isSuperBoost: boolean;
  isWobbling: boolean;
  isTiltback: boolean;
  weather: WeatherType;
  activeSpeech: string | null;
  trickPopup: string | null;
  currentLevel: LevelId;
  levelName: string;
  levelLength: number;
  // Boss Duel (Фантомас на моноколесе SV)
  bossDuelActive?: boolean;
  bossName?: string;
  bossDistanceLead?: number; // meters player is ahead (+) or behind (-)
  bossStunned?: boolean;
  bossSlipstreamActive?: boolean;
  bossSlipstreamCharge?: number; // 0 - 100%
  isBossLoss?: boolean;
}

export interface GameSettings {
  music: boolean;
  sound: boolean;
  vibration: boolean;
  volume: number; // 0.0 - 1.0
  effects: boolean;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  boost: boolean;
  down: boolean;
}
