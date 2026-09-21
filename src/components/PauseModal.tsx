import React from 'react';
import { RU } from '../localization/ru';
import { Play, RotateCcw, Home } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onToMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onToMenu,
}) => {
  return (
    <div
      id="pause-modal"
      className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/75 backdrop-blur-md text-white select-none"
    >
      <div className="w-full max-w-xs bg-gradient-to-b from-zinc-900 to-black p-6 rounded-3xl border-2 border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.3)] flex flex-col items-center gap-4 text-center">
        <h2 className="text-2xl font-black tracking-widest text-emerald-400 uppercase">
          {RU.pause}
        </h2>

        <div className="w-full flex flex-col gap-2.5 mt-2">
          {/* ПРОДОЛЖИТЬ */}
          <button
            id="btn-pause-resume"
            onClick={onResume}
            className="w-full h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.5)] active:scale-95 transition-all"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>{RU.resume}</span>
          </button>

          {/* НАЧАТЬ ЗАНОВО */}
          <button
            id="btn-pause-restart"
            onClick={onRestart}
            className="w-full h-12 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-white font-bold text-base flex items-center justify-center gap-2 border border-zinc-600 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>{RU.restart}</span>
          </button>

          {/* В МЕНЮ */}
          <button
            id="btn-pause-menu"
            onClick={onToMenu}
            className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-base flex items-center justify-center gap-2 border border-zinc-700 active:scale-95 transition-all"
          >
            <Home className="w-4 h-4 text-zinc-400" />
            <span>{RU.toMenu}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
