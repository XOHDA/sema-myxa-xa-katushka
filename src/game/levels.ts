import { LevelConfig, LevelId } from '../types';
import { RU } from '../localization/ru';

export const LEVELS: Record<LevelId, LevelConfig> = {
  1: {
    id: 1,
    name: RU.level1Name,
    subtitle: 'Разминка: парки, бордюры и сходка VOLTARZ',
    theme: 'day-to-night',
    weather: 'clear',
    length: 16800,
    gravity: 1200,
    description: RU.level1Desc,
    baseSpeed: 300, // ~44 km/h
    boostSpeed: 580, // ~85 km/h
    obstacleDensity: 1.0,
    enemySpeed: -110,
    speedRatingKmh: 45,
  },
  2: {
    id: 2,
    name: RU.level2Name,
    subtitle: 'Неоновые крыши, трамплины и огни ночного мегаполиса',
    theme: 'night-neon',
    weather: 'clear',
    length: 18000,
    gravity: 1220,
    description: RU.level2Desc,
    baseSpeed: 320, // ~47 km/h
    boostSpeed: 610, // ~90 km/h
    obstacleDensity: 1.1,
    enemySpeed: -125,
    speedRatingKmh: 50,
  },
  3: {
    id: 3,
    name: RU.level3Name,
    subtitle: 'Контейнеры, трубы, металлоконструкции и перепады высот',
    theme: 'industrial',
    weather: 'clear',
    length: 19200,
    gravity: 1240,
    description: RU.level3Desc,
    baseSpeed: 340, // ~50 km/h
    boostSpeed: 640, // ~94 km/h
    obstacleDensity: 1.2,
    enemySpeed: -140,
    speedRatingKmh: 55,
  },
  4: {
    id: 4,
    name: RU.level4Name,
    subtitle: 'Плотный поток самокатчиков, скамейки и брошенные препятствия',
    theme: 'sunset-highway',
    weather: 'clear',
    length: 20400,
    gravity: 1250,
    description: RU.level4Desc,
    baseSpeed: 360, // ~53 km/h
    boostSpeed: 670, // ~99 km/h
    obstacleDensity: 1.3,
    enemySpeed: -155,
    speedRatingKmh: 60,
  },
  5: {
    id: 5,
    name: RU.level5Name,
    subtitle: 'Скоростные прямые эстакады, трамплины и прыжки на 100+ км/ч',
    theme: 'day-to-night',
    weather: 'clear',
    length: 21600,
    gravity: 1260,
    description: RU.level5Desc,
    baseSpeed: 380, // ~56 km/h
    boostSpeed: 700, // ~103 km/h
    obstacleDensity: 1.4,
    enemySpeed: -170,
    speedRatingKmh: 65,
  },
  6: {
    id: 6,
    name: RU.level6Name,
    subtitle: 'Глубокие лужи, воблинг на мокром асфальте и решетки ливнёвки',
    theme: 'storm',
    weather: 'light-rain',
    length: 22800,
    gravity: 1270,
    description: RU.level6Desc,
    baseSpeed: 400, // ~59 km/h
    boostSpeed: 730, // ~107 km/h
    obstacleDensity: 1.5,
    enemySpeed: -185,
    speedRatingKmh: 70,
  },
  7: {
    id: 7,
    name: RU.level7Name,
    subtitle: 'Опасные обрывы, узкие балки над пропастью и агрессивные зацеперы',
    theme: 'industrial',
    weather: 'clear',
    length: 24000,
    gravity: 1280,
    description: RU.level7Desc,
    baseSpeed: 420, // ~62 km/h
    boostSpeed: 760, // ~112 km/h
    obstacleDensity: 1.6,
    enemySpeed: -200,
    speedRatingKmh: 75,
  },
  8: {
    id: 8,
    name: RU.level8Name,
    subtitle: 'Широкие многополосные прямые, скоростные разъезды и затяжной разгон',
    theme: 'sunset-highway',
    weather: 'clear',
    length: 25200,
    gravity: 1290,
    description: RU.level8Desc,
    baseSpeed: 440, // ~65 km/h
    boostSpeed: 790, // ~116 km/h
    obstacleDensity: 1.7,
    enemySpeed: -215,
    speedRatingKmh: 80,
  },
  9: {
    id: 9,
    name: RU.level9Name,
    subtitle: 'Головокружительная высота крыш, мостки над бездной и трамплины',
    theme: 'night-neon',
    weather: 'clear',
    length: 26400,
    gravity: 1300,
    description: RU.level9Desc,
    baseSpeed: 460, // ~68 km/h
    boostSpeed: 820, // ~121 km/h
    obstacleDensity: 1.8,
    enemySpeed: -230,
    speedRatingKmh: 85,
  },
  10: {
    id: 10,
    name: RU.level10Name,
    subtitle: 'Подземные своды, мигающие фонари и плотные завалы на 115+ км/ч',
    theme: 'cyber',
    weather: 'clear',
    length: 27600,
    gravity: 1310,
    description: RU.level10Desc,
    baseSpeed: 480, // ~71 km/h
    boostSpeed: 850, // ~125 km/h
    obstacleDensity: 1.9,
    enemySpeed: -245,
    speedRatingKmh: 92,
  },
  11: {
    id: 11,
    name: RU.level11Name,
    subtitle: 'Скоростной мост, встречный ветер, узкая проезжая часть и лабиринт конусов',
    theme: 'storm',
    weather: 'clear',
    length: 28800,
    gravity: 1320,
    description: RU.level11Desc,
    baseSpeed: 500, // ~74 km/h
    boostSpeed: 880, // ~129 km/h
    obstacleDensity: 2.0,
    enemySpeed: -260,
    speedRatingKmh: 100,
  },
  12: {
    id: 12,
    name: RU.level12Name,
    subtitle: 'Кибер-магистраль: встречный транспорт и реактивный темп',
    theme: 'cyber',
    weather: 'clear',
    length: 30000,
    gravity: 1330,
    description: RU.level12Desc,
    baseSpeed: 520, // ~76 km/h
    boostSpeed: 910, // ~134 km/h
    obstacleDensity: 2.1,
    enemySpeed: -275,
    speedRatingKmh: 110,
  },
  13: {
    id: 13,
    name: RU.level13Name,
    subtitle: 'Бешеный ночной трафик, молниеносные маневры на 130+ км/ч',
    theme: 'night-neon',
    weather: 'clear',
    length: 31500,
    gravity: 1340,
    description: RU.level13Desc,
    baseSpeed: 540, // ~79 km/h
    boostSpeed: 940, // ~138 km/h
    obstacleDensity: 2.2,
    enemySpeed: -290,
    speedRatingKmh: 120,
  },
  14: {
    id: 14,
    name: RU.level14Name,
    subtitle: 'ШИМ 90%! Опасность продава колеса на 145+ км/ч',
    theme: 'sunset-highway',
    weather: 'clear',
    length: 33000,
    gravity: 1350,
    description: RU.level14Desc,
    baseSpeed: 560, // ~82 km/h
    boostSpeed: 970, // ~143 km/h
    obstacleDensity: 2.3,
    enemySpeed: -305,
    speedRatingKmh: 135,
  },
  15: {
    id: 15,
    name: RU.level15Name,
    subtitle: 'Ультимативный заезд VOLTARZ: максимум скорости до 150 км/ч, адреналина и преград!',
    theme: 'cyber',
    weather: 'clear',
    length: 36000,
    gravity: 1360,
    description: RU.level15Desc,
    baseSpeed: 580, // ~85 km/h
    boostSpeed: 990, // ~146 km/h
    obstacleDensity: 2.4,
    enemySpeed: -320,
    speedRatingKmh: 150,
  },
};
