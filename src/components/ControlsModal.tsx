import React from 'react';
import { RU } from '../localization/ru';
import { X, Smartphone, Keyboard } from 'lucide-react';

interface ControlsModalProps {
  onClose: () => void;
}

export const ControlsModal: React.FC<ControlsModalProps> = ({ onClose }) => {
  return (
    <div
      id="controls-modal"
      className="absolute inset-0 z-50 flex items-center justify-center p-5 bg-black/85 backdrop-blur-md text-white select-none overflow-y-auto animate-fadeIn"
    >
      <div className="w-full max-w-sm bg-gradient-to-b from-zinc-900 to-black p-6 rounded-3xl border-2 border-sky-500/50 shadow-[0_0_35px_rgba(56,189,248,0.3)] flex flex-col gap-4 my-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black tracking-wide text-white">
            {RU.controlsTitle}
          </h2>
          <button
            id="btn-close-controls"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Сенсорное управление на смартфоне */}
        <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Smartphone className="w-4 h-4" />
            <span>СЕНСОРНЫЙ ЭКРАН</span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Виртуальные кнопки сразу видны внизу экрана:
          </p>
          <ul className="text-xs text-zinc-300 space-y-1 pl-1">
            <li>• <strong className="text-emerald-400">◀ и ▶</strong> — наклон и движение</li>
            <li>• <strong className="text-emerald-400">ПРЫЖОК</strong> — высокий прыжок</li>
            <li>• <strong className="text-amber-400">БУСТ</strong> — мощный разгон</li>
            <li>• <strong className="text-sky-400">ПРИСЕД</strong> — пригнуться (чтобы проехать под любыми навесами) / спуск в воздухе</li>
            <li>• В воздухе кнопки <strong className="text-purple-300">◀ и ▶</strong> крутят трюки!</li>
          </ul>
        </div>

        {/* Управление с клавиатуры */}
        <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
            <Keyboard className="w-4 h-4" />
            <span>КЛАВИАТУРА</span>
          </div>
          <ul className="text-xs text-zinc-300 space-y-1.5 pl-1">
            <li>• <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono text-[11px]">A / D</kbd> или Стрелки — Влево / Вправо</li>
            <li>• <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono text-[11px]">Пробел</kbd> — Прыжок</li>
            <li>• <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono text-[11px]">Shift</kbd> — Буст</li>
            <li>• <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono text-[11px]">S</kbd> или Стрелка вниз — Пригнуться / Спуск</li>
            <li>• <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono text-[11px]">R</kbd> — Перезапуск</li>
            <li>• <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono text-[11px]">Esc</kbd> — Пауза</li>
          </ul>
          <p className="text-[10px] text-emerald-400/90 font-medium mt-1">
            ✓ {RU.layoutIndependent}
          </p>
        </div>

        <button
          id="btn-controls-back"
          onClick={onClose}
          className="w-full h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-sm flex items-center justify-center border border-zinc-700 active:scale-95 transition-all"
        >
          {RU.back}
        </button>
      </div>
    </div>
  );
};
