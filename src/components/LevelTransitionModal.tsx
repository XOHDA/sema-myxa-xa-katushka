import React, { useEffect, useState } from 'react';
import { LevelId } from '../types';
import { LEVELS } from '../game/levels';
import { RU } from '../localization/ru';
import { ArrowRight, Compass, Gauge, AlertTriangle, BatteryCharging, Zap } from 'lucide-react';

interface LevelTransitionModalProps {
  targetLevelId: LevelId;
  onStart: () => void;
}

export const LevelTransitionModal: React.FC<LevelTransitionModalProps> = ({
  targetLevelId,
  onStart,
}) => {
  const levelConfig = LEVELS[targetLevelId];
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Auto advance progress over 2.4 seconds
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 4;
      });
    }, 90);

    const timeout = setTimeout(() => {
      onStart();
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onStart]);

  return (
    <div
      id="level-transition-modal"
      className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md text-white select-none animate-fadeIn"
    >
      <div className="w-full max-w-sm bg-gradient-to-b from-[#081b2e] via-zinc-950 to-black p-5 sm:p-6 rounded-3xl border-2 border-sky-400 shadow-[0_0_40px_rgba(14,165,233,0.6)] flex flex-col items-center gap-4 text-center my-auto">
        {/* Анимированная иконка перехода */}
        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-sky-500/20 border-2 border-sky-400 flex items-center justify-center shadow-[0_0_25px_rgba(14,165,233,0.5)]">
          <Zap className="w-9 h-9 text-sky-400 fill-sky-400 animate-pulse" />
        </div>

        {/* Заголовок перехода */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] sm:text-xs font-black uppercase text-sky-400 tracking-widest px-2.5 py-0.5 rounded-full bg-sky-950/80 border border-sky-500/50">
            {RU.levelTransitionTitle || 'ПЕРЕХОД НА СЛЕДУЮЩИЙ УРОВЕНЬ'}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-md mt-1">
            УРОВЕНЬ {targetLevelId}
          </h2>
          <p className="text-base font-bold text-sky-300">
            {levelConfig?.name || `Уровень ${targetLevelId}`}
          </p>
          <p className="text-xs text-zinc-300 italic max-w-xs mt-0.5">
            «{levelConfig?.subtitle}»
          </p>
        </div>

        {/* Инфо-карточки уровня */}
        <div className="w-full bg-black/60 rounded-2xl border border-sky-600/40 p-3 grid grid-cols-2 gap-2 text-left">
          <div className="bg-zinc-900/80 rounded-xl p-2 border border-zinc-800 flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[9px] text-zinc-400 font-bold uppercase">Длина трассы</div>
              <div className="text-xs font-black text-white">{levelConfig?.length || 6000} м</div>
            </div>
          </div>

          <div className="bg-zinc-900/80 rounded-xl p-2 border border-zinc-800 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <div className="text-[9px] text-zinc-400 font-bold uppercase">Крейсерская</div>
              <div className="text-xs font-black text-white">~{levelConfig?.speedRatingKmh || 45} км/ч</div>
            </div>
          </div>

          <div className="col-span-2 bg-rose-950/40 rounded-xl p-2 border border-rose-500/30 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-[10px] text-zinc-200">
              <span className="font-bold text-amber-300">Внимание:</span> Буст больше 3 сек вызовет продав!
            </div>
          </div>
        </div>

        {/* Прогресс-бар загрузки уровня */}
        <div className="w-full flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold text-sky-300 px-1">
            <span className="flex items-center gap-1">
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              Подготовка трассы и зарядка...
            </span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
            <div
              className="h-full bg-gradient-to-r from-teal-400 via-sky-400 to-emerald-400 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Кнопка мгновенного старта */}
        <button
          id="btn-level-transition-start"
          type="button"
          onClick={onStart}
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 text-white font-black text-base tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.7)] border-2 border-emerald-300 active:scale-95 transition-all cursor-pointer"
        >
          <span>{RU.startNextLevelBtn || 'ПОЕХАЛИ!'}</span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
