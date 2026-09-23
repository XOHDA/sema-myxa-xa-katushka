import React, { useState } from 'react';
import { RU } from '../localization/ru';
import { X, Smartphone, Keyboard, Zap, Info, Shield, Flame, Smile, AlertTriangle } from 'lucide-react';

interface ControlsModalProps {
  onClose: () => void;
}

export const ControlsModal: React.FC<ControlsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'about' | 'controls'>('about');

  return (
    <div
      id="controls-modal"
      className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md text-white select-none overflow-y-auto animate-fadeIn"
    >
      <div className="w-full max-w-md bg-gradient-to-b from-zinc-900 to-black p-5 rounded-3xl border-2 border-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.3)] flex flex-col gap-3.5 my-auto max-h-[92vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h2 className="text-lg sm:text-xl font-black tracking-wide text-white">
              {activeTab === 'about' ? 'ОПИСАНИЕ ИГРЫ' : RU.controlsTitle}
            </h2>
          </div>
          <button
            id="btn-close-controls"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Переключатель вкладок: Об игре / Управление */}
        <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-800">
          <button
            onClick={() => setActiveTab('about')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'about'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Об игре</span>
          </button>
          <button
            onClick={() => setActiveTab('controls')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'controls'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Управление</span>
          </button>
        </div>

        {activeTab === 'about' ? (
          <div className="flex flex-col gap-3 text-xs text-zinc-300">
            {/* Описание сюжета и сути игры */}
            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-emerald-900/40 leading-relaxed">
              <p className="font-bold text-emerald-300 text-sm mb-1">
                🚀 «Сёма Муха-Ха: Катушка»
              </p>
              <p>
                Динамичный и хардкорный 2D-платформер про отважного райдера Сёму на высокоскоростном моноколесе!
                Мчись по 15 красочным уровням — от городских проспектов и парков до крыш небоскрёбов, метро и ночных шоссе.
              </p>
            </div>

            {/* Ключевые игровые механики */}
            <div className="flex flex-col gap-2">
              <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-start gap-2.5">
                <Flame className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-amber-300 block">Буст и Продав (Cutout)</span>
                  <span className="text-[11px] text-zinc-400">
                    Удерживай кнопку буста для бешеного ускорения до 150 км/ч. Но будь осторожен: удерживание свыше 3 секунд вызывает перегрев и падение («продав колеса»)!
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-red-300 block">Энергия, Tiltback и Дроны</span>
                  <span className="text-[11px] text-zinc-400">
                    Собирай жетоны VOLT и батареи. Если заряд упадет до 0% или дрон сбросит какашку — педали задерутся (Tiltback), буст и прыжки отключатся, а колесо будет медленно ползти. Ищи зарядную станцию!
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-start gap-2.5">
                <Smile className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-sky-300 block">Бонус улыбки «Муха-Ха!»</span>
                  <span className="text-[11px] text-zinc-400">
                    Прыгай сверху на препятствия, машины и такси! Препятствие разлетится на осколки, а Сёма восстановит щит и получит мощный отскок вверх с бонусными очками.
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-purple-300 block">Трюки и комбо-множитель x10</span>
                  <span className="text-[11px] text-zinc-400">
                    Крути сальто и прыжки с трамплинов, скользи по рельсам и удерживай баланс, чтобы разгонять комбо до x10!
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Сенсорное управление на смартфоне */}
            <div className="flex flex-col gap-2 p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Smartphone className="w-4 h-4" />
                <span>СЕНСОРНЫЙ ЭКРАН</span>
              </div>
              <ul className="text-xs text-zinc-300 space-y-1 pl-1">
                <li>• <strong className="text-emerald-400">◀ и ▶</strong> — наклон и движение (в воздухе — вращение и трюки)</li>
                <li>• <strong className="text-emerald-400">ПРЫЖОК</strong> — мгновенный прыжок</li>
                <li>• <strong className="text-amber-400">БУСТ</strong> — мощный разгон</li>
                <li>• <strong className="text-sky-400">ПРИСЕД</strong> — пригнуться (проезд под низкими навесами) / быстрый спуск в воздухе</li>
              </ul>
            </div>

            {/* Управление с клавиатуры */}
            <div className="flex flex-col gap-2 p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                <Keyboard className="w-4 h-4" />
                <span>КЛАВИАТУРА</span>
              </div>
              <ul className="text-xs text-zinc-300 space-y-1 pl-1">
                <li>• <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono text-[10px]">A / D</kbd> или Стрелки — Влево / Вправо</li>
                <li>• <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono text-[10px]">Пробел</kbd> — Прыжок</li>
                <li>• <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono text-[10px]">Shift</kbd> — Буст</li>
                <li>• <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono text-[10px]">S</kbd> или Стрелка вниз — Пригнуться / Спуск</li>
                <li>• <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono text-[10px]">R</kbd> — Перезапуск с чекпоинта</li>
                <li>• <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 font-mono text-[10px]">Esc</kbd> — Пауза</li>
              </ul>
            </div>
          </div>
        )}

        <button
          id="btn-controls-back"
          onClick={onClose}
          className="w-full h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs flex items-center justify-center border border-zinc-700 active:scale-95 transition-all mt-1"
        >
          {RU.back}
        </button>
      </div>
    </div>
  );
};

