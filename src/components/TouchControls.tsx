import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InputState } from '../types';
import { ArrowLeft, ArrowRight, ArrowDown, Zap, ChevronUp } from 'lucide-react';
import { RU } from '../localization/ru';
import { soundManager } from '../audio/soundManager';

interface TouchControlsProps {
  onInputChange: (input: InputState) => void;
  inputState: InputState;
  disabled?: boolean;
  boostHoldDuration?: number;
  battery?: number;
  isTiltback?: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onInputChange,
  inputState,
  disabled = false,
  boostHoldDuration = 0,
  battery = 100,
  isTiltback = false,
}) => {
  const [activePointers, setActivePointers] = useState<Record<string, keyof InputState>>({});
  const activePointersRef = useRef<Record<string, keyof InputState>>({});
  const inputStateRef = useRef<InputState>(inputState);

  activePointersRef.current = activePointers;
  inputStateRef.current = inputState;

  // If parent resets all inputs (e.g., game over, checkpoint retry), wipe active pointers
  useEffect(() => {
    const isAnyActive = Object.values(inputState).some(Boolean);
    if (!isAnyActive && Object.keys(activePointersRef.current).length > 0) {
      setActivePointers({});
    }
  }, [inputState]);

  // If controls become disabled, release all inputs and wipe active pointers
  useEffect(() => {
    if (disabled) {
      setActivePointers({});
      onInputChange({ left: false, right: false, jump: false, boost: false, down: false });
    }
  }, [disabled, onInputChange]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      onInputChange({ left: false, right: false, jump: false, boost: false, down: false });
    };
  }, [onInputChange]);

  const handlePointerDown = useCallback((key: keyof InputState, pointerId: number, target?: HTMLElement) => {
    if (disabled) return;
    try {
      target?.setPointerCapture?.(pointerId);
    } catch {
      // Ignored if capture unsupported
    }

    const nextPointers = { ...activePointersRef.current, [pointerId]: key };
    setActivePointers(nextPointers);

    const nextState: InputState = { ...inputStateRef.current, [key]: true };
    onInputChange(nextState);
  }, [disabled, onInputChange]);

  const handlePointerUpOrCancel = useCallback((pointerId: number) => {
    const key = activePointersRef.current[pointerId];
    if (!key) return;

    const nextPointers = { ...activePointersRef.current };
    delete nextPointers[pointerId];
    setActivePointers(nextPointers);

    // Check if any other pointer is still holding this key
    const stillPressed = Object.values(nextPointers).includes(key);
    if (!stillPressed) {
      const nextState: InputState = { ...inputStateRef.current, [key]: false };
      onInputChange(nextState);
    }
  }, [onInputChange]);

  // Global safety net for pointer releases anywhere on the window
  useEffect(() => {
    const handleGlobalRelease = (e: PointerEvent) => {
      handlePointerUpOrCancel(e.pointerId);
    };

    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
    };
  }, [handlePointerUpOrCancel]);

  return (
    <div
      id="touch-controls-overlay"
      className="absolute inset-x-0 bottom-0 pointer-events-none z-30 pb-[max(env(safe-area-inset-bottom),10px)] px-2.5 sm:px-4 flex justify-between items-end select-none touch-none"
    >
      {/* ЛЕВАЯ ЧАСТЬ: ◀ ВЛЕВО и ▶ ВПРАВО (компактно смасштабированы под экран) */}
      <div id="touch-dpad-container" className="flex items-end gap-1.5 sm:gap-2 pointer-events-auto">
        {/* Кнопка ◀ ВЛЕВО */}
        <button
          id="btn-touch-left"
          aria-label={RU.leftButton}
          onPointerDown={(e) => {
            e.preventDefault();
            handlePointerDown('left', e.pointerId, e.currentTarget);
          }}
          onPointerUp={(e) => handlePointerUpOrCancel(e.pointerId)}
          onPointerCancel={(e) => handlePointerUpOrCancel(e.pointerId)}
          className={`w-13 h-13 sm:w-15 sm:h-15 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition-all duration-75 backdrop-blur-md border ${
            inputState.left
              ? 'bg-emerald-500/50 border-emerald-300 scale-95 shadow-[0_0_15px_rgba(16,185,129,0.7)]'
              : 'bg-black/55 border-emerald-700/60 active:scale-95 text-white/90'
          }`}
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 stroke-[2.5]" />
          <span className="text-[8.5px] sm:text-[9.5px] font-bold tracking-wider text-emerald-300">◀</span>
        </button>

        {/* Кнопка ▶ ВПРАВО */}
        <button
          id="btn-touch-right"
          aria-label={RU.rightButton}
          onPointerDown={(e) => {
            e.preventDefault();
            handlePointerDown('right', e.pointerId, e.currentTarget);
          }}
          onPointerUp={(e) => handlePointerUpOrCancel(e.pointerId)}
          onPointerCancel={(e) => handlePointerUpOrCancel(e.pointerId)}
          className={`w-13 h-13 sm:w-15 sm:h-15 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition-all duration-75 backdrop-blur-md border ${
            inputState.right
              ? 'bg-emerald-500/50 border-emerald-300 scale-95 shadow-[0_0_15px_rgba(16,185,129,0.7)]'
              : 'bg-black/55 border-emerald-700/60 active:scale-95 text-white/90'
          }`}
        >
          <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 stroke-[2.5]" />
          <span className="text-[8.5px] sm:text-[9.5px] font-bold tracking-wider text-emerald-300">▶</span>
        </button>
      </div>

      {/* ПРАВАЯ ЧАСТЬ: БУСТ СЛЕВА, И СТОЛБИК [ПРЫЖОК СВЕРХУ / ПРИСЕД СНИЗУ] */}
      <div id="touch-action-container" className="flex items-end gap-1.5 sm:gap-2 pointer-events-auto">
        {/* Кнопка БУСТ (с динамической индикацией перегрева и обратным отсчётом до продава) */}
        <button
          id="btn-touch-boost"
          aria-label={RU.boostButton}
          onPointerDown={(e) => {
            e.preventDefault();
            soundManager.triggerBoostHaptic(false);
            handlePointerDown('boost', e.pointerId, e.currentTarget);
          }}
          onPointerUp={(e) => handlePointerUpOrCancel(e.pointerId)}
          onPointerCancel={(e) => handlePointerUpOrCancel(e.pointerId)}
          className={`w-13 h-13 sm:w-15 sm:h-15 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition-all duration-75 backdrop-blur-md border ${
            boostHoldDuration >= 2.2
              ? 'bg-red-600/90 border-red-300 scale-95 shadow-[0_0_24px_#ef4444] animate-bounce text-white'
              : boostHoldDuration >= 1.2
              ? 'bg-amber-600/80 border-amber-300 scale-95 shadow-[0_0_20px_#f59e0b] text-white'
              : inputState.boost
              ? 'bg-amber-500/60 border-amber-300 scale-95 shadow-[0_0_18px_rgba(245,158,11,0.9)] text-white'
              : 'bg-black/55 border-amber-500/60 text-white/90 active:scale-95'
          }`}
        >
          <Zap
            className={`w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5] ${
              boostHoldDuration >= 2.2
                ? 'text-red-200 fill-red-200 animate-spin'
                : boostHoldDuration >= 1.2
                ? 'text-yellow-200 fill-yellow-200'
                : 'text-amber-400 fill-amber-400'
            }`}
          />
          <span className="text-[8.5px] sm:text-[9.5px] font-black tracking-wider">
            {boostHoldDuration > 0.4
              ? `${Math.max(0, 3.0 - boostHoldDuration).toFixed(1)}с`
              : 'БУСТ'}
          </span>
        </button>

        {/* Столбик: ПРЫЖОК сверху над ПРИСЕДОМ, одинакового компактного размера */}
        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
          {/* Кнопка ПРЫЖОК (отключается/сигнализирует красным при разряженном колесе) */}
          <button
            id="btn-touch-jump"
            aria-label={RU.jumpButton}
            onPointerDown={(e) => {
              e.preventDefault();
              handlePointerDown('jump', e.pointerId, e.currentTarget);
            }}
            onPointerUp={(e) => handlePointerUpOrCancel(e.pointerId)}
            onPointerCancel={(e) => handlePointerUpOrCancel(e.pointerId)}
            className={`w-13 h-13 sm:w-15 sm:h-15 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition-all duration-75 backdrop-blur-md border-2 ${
              battery <= 0
                ? 'bg-red-950/50 border-red-800/80 text-red-400/60 opacity-60'
                : inputState.jump
                ? 'bg-emerald-500/65 border-emerald-200 scale-95 shadow-[0_0_20px_rgba(16,185,129,0.9)]'
                : 'bg-gradient-to-br from-emerald-950/80 to-black/75 border-emerald-400/70 text-white shadow-[0_0_10px_rgba(16,185,129,0.35)] active:scale-95'
            }`}
          >
            <ChevronUp
              className={`w-5 h-5 sm:w-6 sm:h-6 stroke-[3] ${
                battery <= 0 ? 'text-red-500/60 line-through' : 'text-emerald-300'
              }`}
            />
            <span
              className={`text-[8.5px] sm:text-[9.5px] font-black tracking-wider ${
                battery <= 0 ? 'text-red-400/70' : 'text-emerald-200'
              }`}
            >
              {battery <= 0 ? 'НЕТ ⚡' : RU.jumpButton}
            </span>
          </button>

          {/* Кнопка ПРИСЕД */}
          <button
            id="btn-touch-down"
            aria-label={RU.downButton}
            onPointerDown={(e) => {
              e.preventDefault();
              handlePointerDown('down', e.pointerId, e.currentTarget);
            }}
            onPointerUp={(e) => handlePointerUpOrCancel(e.pointerId)}
            onPointerCancel={(e) => handlePointerUpOrCancel(e.pointerId)}
            className={`w-13 h-13 sm:w-15 sm:h-15 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition-all duration-75 backdrop-blur-md border ${
              inputState.down
                ? 'bg-sky-500/50 border-sky-300 scale-95 shadow-[0_0_15px_rgba(56,189,248,0.7)]'
                : 'bg-black/55 border-sky-700/50 text-white/90 active:scale-95'
            }`}
          >
            <ArrowDown className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 stroke-[2.5]" />
            <span className="text-[8.5px] sm:text-[9.5px] font-black text-sky-300 tracking-wider">ПРИСЕД</span>
          </button>
        </div>
      </div>
    </div>
  );
};
