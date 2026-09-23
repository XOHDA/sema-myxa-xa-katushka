import React from 'react';
import { GarageUpgrades, SkinType } from '../types';
import { soundManager } from '../audio/soundManager';
import { Wrench, Zap, BatteryCharging, Gauge, ShieldCheck, Palette, Check, ArrowLeft, Sparkles, ChevronRight } from 'lucide-react';

interface GarageModalProps {
  isOpen: boolean;
  onClose: () => void;
  upgrades: GarageUpgrades;
  onSaveUpgrades: (newUpgrades: GarageUpgrades) => void;
}

const BATTERY_TIERS = [
  { level: 0, name: 'Базовая батарея 100%', desc: 'Стандартная емкость и базовый расход энергии', cost: 0 },
  { level: 1, name: 'Energy Cell Pro (120%)', desc: '+20% емкости, расход энергии на 25% медленнее', cost: 150 },
  { level: 2, name: 'Li-Ion Overcharged (140%)', desc: '+40% емкости, устойчивость к холоду и разряду', cost: 350 },
  { level: 3, name: 'Quantum Solid-State (160%)', desc: '+60% емкости и регенерация энергии при трюках!', cost: 700 },
];

const CONTROLLER_TIERS = [
  { level: 0, name: 'ШИМ Сток (до 3.0 сек буста)', desc: 'Стандартный предел буста 3.0с (до 140 км/ч)', cost: 0 },
  { level: 1, name: 'MOSFET Pro (до 3.6 сек буста)', desc: 'Повышенный порог токов и буст до 148 км/ч', cost: 200 },
  { level: 2, name: 'Форсированный ШИМ (до 4.3 сек)', desc: 'Охлаждение радиаторов и буст до 156 км/ч', cost: 450 },
  { level: 3, name: 'Гипер-ШИМ 24-MOSFET (до 5.0 сек)', desc: 'Предельный буст до 165 км/ч и 5.0 сек без перегрева!', cost: 850 },
];

const HYDRO_TIERS = [
  { level: 0, name: 'Сток (без гидроизоляции)', desc: 'Скольжение и снос в лужах и под дождем', cost: 0 },
  { level: 1, name: 'Силиконовая герметизация IP54', desc: '-40% скольжения в лужах, лучшая устойчивость', cost: 120 },
  { level: 2, name: 'Компаундная заливка IP67', desc: '-75% скольжения в лужах, защита разъемов', cost: 300 },
  { level: 3, name: 'Полная нано-броня IP68', desc: '100% иммунитет к лужам + турбо-сцепление с мокрым асфальтом!', cost: 600 },
];

const SKINS: Array<{
  id: SkinType;
  name: string;
  desc: string;
  cost: number;
  color: string;
  glow: string;
  badge: string;
}> = [
  {
    id: 'emerald',
    name: 'Изумрудный Кибер',
    desc: 'Классическая легендарная экипировка Сёмы',
    cost: 0,
    color: 'from-emerald-600 to-teal-800',
    glow: 'border-emerald-500 shadow-emerald-500/30',
    badge: 'СТАНДАРТ',
  },
  {
    id: 'gold',
    name: 'Золотая Молния',
    desc: 'Шлем и колесо из анодированного золота со вспышками молний',
    cost: 400,
    color: 'from-amber-400 to-yellow-600',
    glow: 'border-amber-400 shadow-amber-400/40',
    badge: 'ЛЕГЕНДАРНЫЙ',
  },
  {
    id: 'cyan',
    name: 'Неоновый Циан Tron',
    desc: 'Футуристичный световой экзокостюм с ледяным свечением',
    cost: 550,
    color: 'from-cyan-400 to-blue-600',
    glow: 'border-cyan-400 shadow-cyan-400/40',
    badge: 'КИБЕРПАНК',
  },
  {
    id: 'ruby',
    name: 'Красный SV-Киллер',
    desc: 'Гоночный карбоновый костюм с пламенным шлейфом скорости',
    cost: 750,
    color: 'from-rose-500 to-red-700',
    glow: 'border-rose-500 shadow-rose-500/40',
    badge: 'ГОНОЧНЫЙ',
  },
  {
    id: 'phantom',
    name: 'Фиолетовый Фантом',
    desc: 'Трофейная расцветка поверженного Фантомаса',
    cost: 1000,
    color: 'from-purple-500 to-indigo-700',
    glow: 'border-purple-500 shadow-purple-500/40',
    badge: 'ТРОФЕЙ',
  },
];

export const GarageModal: React.FC<GarageModalProps> = ({
  isOpen,
  onClose,
  upgrades,
  onSaveUpgrades,
}) => {
  if (!isOpen) return null;

  const handleUpgrade = (type: 'battery' | 'controller' | 'hydro') => {
    let nextLevel = 0;
    let cost = 0;

    if (type === 'battery' && upgrades.batteryLevel < 3) {
      nextLevel = upgrades.batteryLevel + 1;
      cost = BATTERY_TIERS[nextLevel].cost;
    } else if (type === 'controller' && upgrades.controllerLevel < 3) {
      nextLevel = upgrades.controllerLevel + 1;
      cost = CONTROLLER_TIERS[nextLevel].cost;
    } else if (type === 'hydro' && upgrades.hydroLevel < 3) {
      nextLevel = upgrades.hydroLevel + 1;
      cost = HYDRO_TIERS[nextLevel].cost;
    }

    if (cost > 0 && upgrades.totalVolts >= cost) {
      soundManager.playTrickSuccess();
      const updated: GarageUpgrades = {
        ...upgrades,
        totalVolts: upgrades.totalVolts - cost,
        [type === 'battery' ? 'batteryLevel' : type === 'controller' ? 'controllerLevel' : 'hydroLevel']: nextLevel,
      };
      onSaveUpgrades(updated);
    } else {
      soundManager.playPuddleSlip();
    }
  };

  const handleSelectSkin = (skin: SkinType, cost: number) => {
    const isUnlocked = upgrades.unlockedSkins.includes(skin);

    if (isUnlocked) {
      soundManager.playCollectVolt();
      onSaveUpgrades({
        ...upgrades,
        selectedSkin: skin,
      });
    } else if (upgrades.totalVolts >= cost) {
      soundManager.playTrickSuccess();
      onSaveUpgrades({
        ...upgrades,
        totalVolts: upgrades.totalVolts - cost,
        unlockedSkins: [...upgrades.unlockedSkins, skin],
        selectedSkin: skin,
      });
    } else {
      soundManager.playPuddleSlip();
    }
  };

  const nextBattery = upgrades.batteryLevel < 3 ? BATTERY_TIERS[upgrades.batteryLevel + 1] : null;
  const nextController = upgrades.controllerLevel < 3 ? CONTROLLER_TIERS[upgrades.controllerLevel + 1] : null;
  const nextHydro = upgrades.hydroLevel < 3 ? HYDRO_TIERS[upgrades.hydroLevel + 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-gradient-to-b from-[#0f172a] via-[#09101d] to-[#050912] border-2 border-emerald-500/40 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden text-white">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/20 bg-emerald-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-wide text-white flex items-center gap-2">
                ГАРАЖ & КАСТОМИЗАЦИЯ
              </h2>
              <p className="text-xs text-emerald-400 font-semibold">Прокачка моноколеса и скины Сёмы</p>
            </div>
          </div>

          {/* VOLT BALANCE */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-400/40 shadow-inner">
            <Zap className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
            <div className="flex flex-col items-end">
              <span className="text-xs text-amber-300 font-bold uppercase tracking-wider">БАЛАНС VOLT</span>
              <span className="text-lg font-black text-amber-400 leading-none">{upgrades.totalVolts} ⚡</span>
            </div>
          </div>
        </div>

        {/* CONTENT SCROLL */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. UPGRADES SECTION */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-black tracking-wider text-emerald-300 uppercase">
                ТЕХНИЧЕСКИЕ АПГРЕЙДЫ
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* BATTERY UPGRADE */}
              <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/50 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <BatteryCharging className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      УРОВЕНЬ {upgrades.batteryLevel}/3
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white">{BATTERY_TIERS[upgrades.batteryLevel].name}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    {BATTERY_TIERS[upgrades.batteryLevel].desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800">
                  {nextBattery ? (
                    <button
                      onClick={() => handleUpgrade('battery')}
                      disabled={upgrades.totalVolts < nextBattery.cost}
                      className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-between transition-all ${
                        upgrades.totalVolts >= nextBattery.cost
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 hover:brightness-110 shadow-md shadow-emerald-500/20 active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <span>УЛУЧШИТЬ</span>
                      <span className="flex items-center gap-1 font-black">
                        {nextBattery.cost} <Zap className="w-3 h-3 fill-current" />
                      </span>
                    </button>
                  ) : (
                    <div className="w-full py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs text-center">
                      МАКС. УРОВЕНЬ
                    </div>
                  )}
                </div>
              </div>

              {/* CONTROLLER & BOOST UPGRADE */}
              <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-500/50 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                      УРОВЕНЬ {upgrades.controllerLevel}/3
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white">{CONTROLLER_TIERS[upgrades.controllerLevel].name}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    {CONTROLLER_TIERS[upgrades.controllerLevel].desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800">
                  {nextController ? (
                    <button
                      onClick={() => handleUpgrade('controller')}
                      disabled={upgrades.totalVolts < nextController.cost}
                      className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-between transition-all ${
                        upgrades.totalVolts >= nextController.cost
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 hover:brightness-110 shadow-md shadow-amber-500/20 active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <span>УЛУЧШИТЬ</span>
                      <span className="flex items-center gap-1 font-black">
                        {nextController.cost} <Zap className="w-3 h-3 fill-current" />
                      </span>
                    </button>
                  ) : (
                    <div className="w-full py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs text-center">
                      МАКС. УРОВЕНЬ
                    </div>
                  )}
                </div>
              </div>

              {/* HYDRO IP68 UPGRADE */}
              <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between hover:border-sky-500/50 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/30">
                      УРОВЕНЬ {upgrades.hydroLevel}/3
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white">{HYDRO_TIERS[upgrades.hydroLevel].name}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    {HYDRO_TIERS[upgrades.hydroLevel].desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800">
                  {nextHydro ? (
                    <button
                      onClick={() => handleUpgrade('hydro')}
                      disabled={upgrades.totalVolts < nextHydro.cost}
                      className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-between transition-all ${
                        upgrades.totalVolts >= nextHydro.cost
                          ? 'bg-gradient-to-r from-sky-400 to-blue-600 text-slate-950 hover:brightness-110 shadow-md shadow-sky-500/20 active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <span>УЛУЧШИТЬ</span>
                      <span className="flex items-center gap-1 font-black">
                        {nextHydro.cost} <Zap className="w-3 h-3 fill-current" />
                      </span>
                    </button>
                  ) : (
                    <div className="w-full py-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold text-xs text-center">
                      МАКС. УРОВЕНЬ
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. SKINS & CUSTOMIZATION SECTION */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-black tracking-wider text-amber-300 uppercase">
                СВЕТОВЫЕ НЕОНОВЫЕ СКИНЫ СЁМЫ
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {SKINS.map((skin) => {
                const isSelected = upgrades.selectedSkin === skin.id;
                const isUnlocked = upgrades.unlockedSkins.includes(skin.id);

                return (
                  <div
                    key={skin.id}
                    onClick={() => handleSelectSkin(skin.id, skin.cost)}
                    className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `${skin.glow} bg-slate-900 shadow-lg`
                        : isUnlocked
                        ? 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
                        : 'border-slate-800 bg-slate-950/80 opacity-85 hover:opacity-100 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top badge */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {skin.badge}
                        </span>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-xs font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/40">
                            <Check className="w-3 h-3" /> ВЫБРАН
                          </span>
                        )}
                      </div>

                      {/* Color Bar Preview */}
                      <div className={`h-3 w-full rounded-full bg-gradient-to-r ${skin.color} shadow-md mb-2`} />

                      <h4 className="font-bold text-sm text-white">{skin.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 leading-snug">{skin.desc}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                      {isUnlocked ? (
                        <span className="text-xs font-bold text-emerald-400">
                          {isSelected ? 'АКТИВЕН В ИГРЕ' : 'НАЖМИ ДЛЯ ВЫБОРА'}
                        </span>
                      ) : (
                        <button
                          disabled={upgrades.totalVolts < skin.cost}
                          className={`w-full py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-between ${
                            upgrades.totalVolts >= skin.cost
                              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <span>РАЗБЛОКИРОВАТЬ</span>
                          <span className="flex items-center gap-1 font-black">
                            {skin.cost} <Zap className="w-3 h-3 fill-current" />
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-emerald-500/20 bg-slate-950 flex justify-between items-center">
          <button
            onClick={() => {
              soundManager.playPuddleSlip();
              onClose();
            }}
            className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center gap-2 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>НАЗАД В МЕНЮ</span>
          </button>

          <button
            onClick={() => {
              soundManager.playTrickSuccess();
              onClose();
            }}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span>ПРИМЕНИТЬ И ИГРАТЬ</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
