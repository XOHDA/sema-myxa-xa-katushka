import React from 'react';
import { LevelId } from '../types';
import { LEVELS } from '../game/levels';
import { RU } from '../localization/ru';
import { ChevronRight, X, Zap, Gauge, AlertTriangle, Flame } from 'lucide-react';

interface LevelSelectModalProps {
  currentLevel: LevelId;
  onSelectLevel: (levelId: LevelId) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  currentLevel,
  onSelectLevel,
  onClose,
}) => {
  const levels = Object.values(LEVELS);

  const getDifficultyBadge = (id: number) => {
    if (id <= 3) {
      return { text: 'РАЗМИНКА', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    }
    if (id <= 6) {
      return { text: 'СРЕДНИЙ', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' };
    }
    if (id <= 10) {
      return { text: 'СЛОЖНЫЙ', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    }
    if (id <= 13) {
      return { text: 'ЭКСТРИМ', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' };
    }
    return { text: 'VOLTARZ PRO', color: 'bg-rose-500/25 text-rose-300 border-rose-500/50' };
  };

  return (
    <div
      id="level-select-modal"
      className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md text-white select-none animate-fadeIn"
    >
      <div className="w-full max-w-md bg-gradient-to-b from-zinc-900 to-black p-4 sm:p-5 rounded-3xl border-2 border-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.3)] flex flex-col gap-3 max-h-[92vh]">
        {/* Заголовок */}
        <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-wide text-white">
                {RU.selectLevel}
              </h2>
              <p className="text-[11px] text-zinc-400 font-medium">15 уровней с нарастающей скоростью и сложностью</p>
            </div>
          </div>
          <button
            id="btn-close-levels"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Скроллируемый список 15 уровней */}
        <div className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-[62vh] scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {levels.map((lvl) => {
            const isSelected = lvl.id === currentLevel;
            const diff = getDifficultyBadge(lvl.id);
            return (
              <button
                key={lvl.id}
                id={`btn-level-${lvl.id}`}
                onClick={() => onSelectLevel(lvl.id)}
                className={`p-3 sm:p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all duration-150 active:scale-[0.98] ${
                  isSelected
                    ? 'bg-emerald-950/70 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <div className="flex flex-col gap-1 pr-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center border border-emerald-500/40 shrink-0">
                      {lvl.id}
                    </span>
                    <span className="font-black text-sm text-white tracking-wide truncate">
                      {lvl.name}
                    </span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${diff.color}`}>
                      {diff.text}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-snug line-clamp-1">
                    {lvl.subtitle}
                  </p>

                  <div className="flex items-center gap-3 text-[10px] text-zinc-400 font-mono mt-0.5">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Gauge className="w-3 h-3" />
                      ~{lvl.speedRatingKmh} км/ч
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <Flame className="w-3 h-3" />
                      Плотность: {lvl.obstacleDensity.toFixed(1)}x
                    </span>
                    <span className="text-zinc-500">
                      {Math.round(lvl.length / 10)}м
                    </span>
                  </div>
                </div>

                <div className="flex items-center shrink-0 pl-1">
                  <ChevronRight className={`w-5 h-5 ${isSelected ? 'text-emerald-300' : 'text-zinc-500'}`} />
                </div>
              </button>
            );
          })}
        </div>

        <button
          id="btn-levels-back"
          onClick={onClose}
          className="w-full h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-sm flex items-center justify-center border border-zinc-700 mt-1 active:scale-95 transition-all shrink-0"
        >
          {RU.back}
        </button>
      </div>
    </div>
  );
};
