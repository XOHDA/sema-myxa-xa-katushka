import React from 'react';
import { RU } from '../localization/ru';
import { RotateCcw, Home } from 'lucide-react';

interface GameOverModalProps {
  isCutout?: boolean;
  cutoutReason?: 'speed' | 'boost';
  isBossLoss?: boolean;
  onRetry: () => void;
  onRestartLevel?: () => void;
  onToMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isCutout = false,
  cutoutReason,
  isBossLoss = false,
  onRetry,
  onRestartLevel,
  onToMenu,
}) => {
  return (
    <div
      id="game-over-modal"
      className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md text-white select-none animate-fadeIn"
    >
      <div className="w-full max-w-xs bg-gradient-to-b from-zinc-950 via-zinc-900 to-black p-6 rounded-3xl border-2 border-rose-500/70 shadow-[0_0_35px_rgba(244,63,94,0.4)] flex flex-col items-center gap-3.5 text-center">
        {/* Иконка падения */}
        <div className="w-18 h-18 rounded-full bg-rose-950/50 border-2 border-rose-500/80 flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(244,63,94,0.5)]">
          {isBossLoss ? '😈' : '💥'}
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black tracking-wider text-rose-400 drop-shadow-[0_2px_10px_rgba(244,63,94,0.6)]">
            {isBossLoss
              ? (RU.bossLossTitle || 'ФАНТОМАС ПРИШЁЛ ПЕРВЫМ!')
              : isCutout
              ? cutoutReason === 'boost'
                ? 'ПРОДАВ! БУСТ > 3 СЕК!'
                : 'ПРОДАВ 150+ КМ/Ч!'
              : RU.gameOverTitle}
          </h2>
          <p className="text-xs text-zinc-300 font-medium leading-relaxed">
            {isBossLoss
              ? (RU.bossLossDesc || 'Моноколесо SV опередило тебя на финише! Держись в слипстриме за SV для мега-буста или сбивай Фантомаса прыжком сверху!')
              : isCutout
              ? cutoutReason === 'boost'
                ? (RU.cutoutBoostDesc || 'Кнопка буста удерживалась дольше 3 секунд подряд! Контроллер моноколеса не выдержал токовой перегрузки и отключился.')
                : RU.cutoutDesc
              : RU.gameOverDesc}
          </p>
        </div>

        <div className="w-full flex flex-col gap-2 mt-1">
          {/* ПРОДОЛЖИТЬ С ЧЕКПОИНТА */}
          <button
            id="btn-gameover-retry"
            type="button"
            onClick={onRetry}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-base tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95 transition-all cursor-pointer pointer-events-auto touch-manipulation"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            <span>С ЧЕКПОИНТА</span>
          </button>

          {/* ЗАНОВО С НАЧАЛА */}
          {onRestartLevel && (
            <button
              id="btn-gameover-restart"
              type="button"
              onClick={onRestartLevel}
              className="w-full h-11 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-amber-300 font-bold text-sm flex items-center justify-center gap-2 border border-zinc-700 active:scale-95 transition-all cursor-pointer pointer-events-auto touch-manipulation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>НАЧАТЬ ЗАНОВО</span>
            </button>
          )}

          {/* В МЕНЮ */}
          <button
            id="btn-gameover-menu"
            type="button"
            onClick={onToMenu}
            className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-bold text-sm flex items-center justify-center gap-2 border border-zinc-750 active:scale-95 transition-all cursor-pointer pointer-events-auto touch-manipulation"
          >
            <Home className="w-3.5 h-3.5 text-zinc-400" />
            <span>{RU.toMenu}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
