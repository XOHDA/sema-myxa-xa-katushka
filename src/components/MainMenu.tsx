import React from 'react';
import { RU } from '../localization/ru';
import { Play, Layers, HelpCircle, Settings as SettingsIcon, Zap, Music, Wrench } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface MainMenuProps {
  onStartGame: () => void;
  onOpenLevelSelect: () => void;
  onOpenControls: () => void;
  onOpenSettings: () => void;
  onOpenGarage: () => void;
  totalVolts: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onOpenLevelSelect,
  onOpenControls,
  onOpenSettings,
  onOpenGarage,
  totalVolts,
}) => {
  return (
    <div
      id="main-menu-screen"
      className="absolute inset-0 z-40 flex flex-col justify-between items-center p-6 bg-gradient-to-b from-[#061e16] via-[#09151c] to-[#04080e] text-white select-none overflow-y-auto"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 24px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
      }}
    >
      {/* ЛОГОТИП ИГРЫ */}
      <div className="flex flex-col items-center text-center mt-2">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-300 text-xs font-bold mb-2">
          <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>ЭЛЕКТРИЧЕСКИЙ ПЛАТФОРМЕР</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-[0_4px_12px_rgba(16,185,129,0.5)]">
          {RU.appName}
        </h1>

        <div className="relative mt-1">
          <span className="text-2xl sm:text-3xl font-black tracking-widest text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]">
            {RU.appSubtitle}
          </span>
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent mt-1" />
        </div>
      </div>

      {/* КРУПНЫЙ ПЕРСОНАЖ: СЁМА МУХА-ХА НА МОНОКОЛЕСЕ */}
      <div className="relative my-auto flex flex-col items-center justify-center">
        {/* Фоновое неоновое кольцо колеса */}
        <div className="absolute w-44 h-44 rounded-full bg-emerald-500/15 filter blur-xl animate-pulse" />

        <div className="relative flex flex-col items-center">
          {/* Стилизованная плашка персонажа */}
          <div className="w-48 h-56 sm:w-52 sm:h-60 rounded-3xl bg-gradient-to-b from-emerald-950/60 to-black/80 border-2 border-emerald-500/50 flex flex-col items-center justify-end p-4 shadow-[0_0_30px_rgba(16,185,129,0.3)] relative overflow-hidden">
            {/* Изображение Сёмы */}
            <div className="w-full flex-1 flex items-center justify-center relative">
              {/* Шлем и лицо */}
              <div className="relative z-10 flex flex-col items-center">
                {/* Шлем */}
                <div className="w-16 h-18 bg-emerald-800 rounded-full border-2 border-emerald-600 relative shadow-inner">
                  {/* Оранжевая полоса */}
                  <div className="w-4 h-8 bg-amber-400 mx-auto rounded-b" />
                  {/* Визор */}
                  <div className="w-14 h-8 bg-black/90 rounded-md mx-auto mt-1 border-t-2 border-sky-400 shadow-md relative overflow-hidden">
                    <div className="w-8 h-1 bg-sky-300 rounded rotate-12 mt-1 ml-2 opacity-80" />
                  </div>
                  {/* Борода и подбородок */}
                  <div className="w-10 h-4 bg-zinc-900 mx-auto rounded-b-lg border-t border-zinc-700" />
                </div>

                {/* Торс в темно-изумрудной экипировке */}
                <div className="w-22 h-16 bg-[#022c22] rounded-xl border border-emerald-700 mt-1 flex justify-center items-center relative shadow-md">
                  <div className="w-2 h-14 bg-amber-400/90 rounded-full" />
                  {/* Наплечники */}
                  <div className="absolute -left-2 top-2 w-5 h-8 bg-black rounded-lg border border-emerald-500" />
                  <div className="absolute -right-2 top-2 w-5 h-8 bg-black rounded-lg border border-emerald-500" />
                </div>

                {/* Моноколесо с неоном */}
                <div className="relative -mt-2 flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-zinc-950 border-4 border-zinc-800 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                    <div className="w-18 h-18 rounded-full border-2 border-dashed border-amber-400 animate-spin flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-zinc-900 border-2 border-emerald-400 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                      </div>
                    </div>
                  </div>
                  {/* Педали */}
                  <div className="absolute top-10 w-28 h-3 bg-zinc-700 rounded-sm border-b-2 border-amber-400 shadow" />
                </div>
              </div>
            </div>

            {/* Подпись персонажа */}
            <div className="mt-2 text-center">
              <span className="text-xs font-black tracking-widest text-emerald-300 uppercase">
                СЁМА НА МОНОКОЛЕСЕ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* КНОПКИ МЕНЮ (БОЛЬШИЕ, ДЛЯ БОЛЬШОГО ПАЛЬЦА) */}
      <div className="w-full max-w-xs flex flex-col gap-2.5 mb-2">
        {/* ГЛАВНАЯ КНОПКА: ИГРАТЬ */}
        <button
          id="btn-menu-play"
          onClick={onStartGame}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black text-xl tracking-wider flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(16,185,129,0.5)] border-2 border-emerald-300 active:scale-95 transition-all cursor-pointer"
        >
          <Play className="w-6 h-6 fill-white stroke-none" />
          <span>{RU.play}</span>
        </button>

        {/* ГАРАЖ & КАСТОМИЗАЦИЯ */}
        <button
          id="btn-menu-garage"
          onClick={onOpenGarage}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-emerald-950/40 backdrop-blur-md text-amber-300 font-black text-sm tracking-wide flex items-center justify-between px-4 border-2 border-amber-400/50 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)] active:scale-95 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>ГАРАЖ И ПРОКАЧКА</span>
          </div>
          <div className="flex items-center gap-1 font-black text-xs bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-300">
            <span>{totalVolts}</span>
            <Zap className="w-3 h-3 fill-amber-400" />
          </div>
        </button>

        {/* ВЫБОР УРОВНЯ */}
        <button
          id="btn-menu-levels"
          onClick={onOpenLevelSelect}
          className="w-full h-11 rounded-xl bg-black/55 backdrop-blur-md text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 border border-emerald-700/50 hover:border-emerald-500 active:scale-95 transition-all cursor-pointer"
        >
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>{RU.selectLevel}</span>
        </button>

        {/* ТРЕК ИГРЫ */}
        <button
          id="btn-menu-music-track"
          onClick={onOpenSettings}
          className="w-full py-2 px-3 rounded-xl bg-black/40 border border-emerald-500/30 hover:border-emerald-500/60 flex items-center justify-between text-xs transition-all active:scale-98"
        >
          <div className="flex items-center gap-2">
            <Music className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-zinc-400 font-medium">Трек:</span>
            <span className="text-emerald-300 font-bold truncate max-w-[150px]">
              {soundManager.getTrackInfo().title}
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700">
            Сменить
          </span>
        </button>

        {/* УПРАВЛЕНИЕ И НАСТРОЙКИ В РЯД */}
        <div className="grid grid-cols-2 gap-2">
          <button
            id="btn-menu-controls"
            onClick={onOpenControls}
            className="h-12 rounded-xl bg-black/55 backdrop-blur-md text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 border border-sky-700/50 active:scale-95 transition-all"
          >
            <HelpCircle className="w-4 h-4 text-sky-400" />
            <span>{RU.controls}</span>
          </button>

          <button
            id="btn-menu-settings"
            onClick={onOpenSettings}
            className="h-12 rounded-xl bg-black/55 backdrop-blur-md text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 border border-zinc-700/60 active:scale-95 transition-all"
          >
            <SettingsIcon className="w-4 h-4 text-zinc-300" />
            <span>{RU.settings}</span>
          </button>
        </div>
      </div>

      <div className="text-center text-[10px] text-zinc-500 font-medium">
        VOLTARZ EUC ADVENTURE • 2026
      </div>
    </div>
  );
};
