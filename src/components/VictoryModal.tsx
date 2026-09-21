import React, { useEffect } from 'react';
import { PlayerStats, LevelId } from '../types';
import { RU } from '../localization/ru';
import { LEVELS } from '../game/levels';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, ArrowRight, Home, Zap, Clock, Compass, Sparkles, Gauge, Activity, Cpu } from 'lucide-react';

interface VictoryModalProps {
  stats: PlayerStats;
  onPlayAgain: () => void;
  onNextLevel: () => void;
  onToMenu: () => void;
  hasNextLevel: boolean;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  stats,
  onPlayAgain,
  onNextLevel,
  onToMenu,
  hasNextLevel,
}) => {
  const currentLevelId = stats.currentLevel || 1;
  const nextLevelId = (currentLevelId + 1) as LevelId;
  const currentLevelConfig = LEVELS[currentLevelId];
  const nextLevelConfig = hasNextLevel ? LEVELS[nextLevelId] : null;

  useEffect(() => {
    // Fire festive victory confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#f59e0b', '#38bdf8', '#fbbf24'],
    });

    const timer = setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#10b981', '#f59e0b', '#38bdf8'],
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#10b981', '#f59e0b', '#38bdf8'],
      });
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      id="victory-modal"
      className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md text-white select-none overflow-y-auto animate-fadeIn"
    >
      <div className="w-full max-w-sm bg-gradient-to-b from-[#06281e] via-zinc-950 to-black p-5 sm:p-6 rounded-3xl border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.5)] flex flex-col items-center gap-3.5 text-center my-auto">
        {/* Кубок победителя */}
        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-bounce">
          <Trophy className="w-8 h-8 sm:w-9 sm:h-9 text-amber-400 fill-amber-400" />
        </div>

        <div>
          <div className="inline-block bg-emerald-500 text-black font-black text-[10px] uppercase px-2 py-0.5 rounded-full mb-1 tracking-widest">
            УРОВЕНЬ {currentLevelId} ПРОЙДЕН!
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-md">
            {currentLevelConfig?.name || RU.victoryTitle}
          </h2>
          <p className="text-xs font-black text-amber-400 tracking-wider uppercase mt-0.5">
            ⚡ {RU.victorySubtitle} ⚡
          </p>
        </div>

        {!hasNextLevel && (
          <div className="w-full bg-gradient-to-r from-amber-500/25 via-emerald-500/25 to-amber-500/25 border border-amber-400/80 rounded-2xl p-2.5 text-center shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <span className="text-xs font-black text-amber-300 tracking-wider">
              👑 ВСЕ 15 УРОВНЕЙ ПРОЙДЕНЫ!
            </span>
            <p className="text-[11px] text-emerald-200 mt-0.5 leading-tight">
              Сёма Муха-Ха покорил все трассы и стал абсолютной легендой VOLTARZ!
            </p>
          </div>
        )}

        {/* ПРЕВЬЮ ПЕРЕХОДА НА СЛЕДУЮЩИЙ УРОВЕНЬ */}
        {hasNextLevel && nextLevelConfig && (
          <div className="w-full bg-gradient-to-r from-sky-950/70 via-emerald-950/60 to-sky-950/70 border border-sky-400/60 rounded-2xl p-3 text-left shadow-[0_0_20px_rgba(14,165,233,0.3)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider">
                СЛЕДУЮЩИЙ УРОВЕНЬ
              </span>
              <span className="text-[10px] font-black bg-sky-500 text-black px-1.5 py-0.5 rounded">
                УРОВЕНЬ {nextLevelId}
              </span>
            </div>
            <div className="text-sm font-black text-white">{nextLevelConfig.name}</div>
            <div className="text-[11px] text-zinc-300 mt-0.5 leading-snug">{nextLevelConfig.subtitle}</div>
            <div className="flex items-center gap-2.5 mt-2 text-[10px] font-bold text-sky-200/80">
              <span>Длина: {nextLevelConfig.length} м</span>
              <span>•</span>
              <span>Скорость: ~{nextLevelConfig.speedRatingKmh} км/ч</span>
            </div>
          </div>
        )}

        {/* СТАТИСТИКА ЗАЕЗДА */}
        <div className="w-full bg-black/60 rounded-2xl border border-emerald-600/40 p-3.5 grid grid-cols-2 gap-2 text-left">
          {/* СЧЁТ */}
          <div className="col-span-2 bg-emerald-950/40 rounded-xl p-2.5 border border-emerald-500/30 flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-300">{RU.score}</span>
            <span className="text-xl font-black text-amber-400 tracking-wide">
              {stats.score.toLocaleString('ru-RU')}
            </span>
          </div>

          {/* МАКС. СКОРОСТЬ */}
          <div className="bg-zinc-900/70 rounded-xl p-2 border border-zinc-700/50 flex flex-col">
            <div className="flex items-center gap-1 text-zinc-400 text-[10px] font-bold">
              <Gauge className="w-3 h-3 text-rose-400" />
              <span>{RU.maxSpeed}</span>
            </div>
            <span className="text-sm font-black text-rose-300 mt-0.5">
              {(stats.maxSpeedKmh ?? 0).toFixed(1)} {RU.kmh}
            </span>
          </div>

          {/* СРЕДНЯЯ СКОРОСТЬ */}
          <div className="bg-zinc-900/70 rounded-xl p-2 border border-zinc-700/50 flex flex-col">
            <div className="flex items-center gap-1 text-zinc-400 text-[10px] font-bold">
              <Activity className="w-3 h-3 text-sky-400" />
              <span>{RU.avgSpeed}</span>
            </div>
            <span className="text-sm font-bold text-white mt-0.5">
              {(stats.avgSpeedKmh ?? 0).toFixed(1)} {RU.kmh}
            </span>
          </div>

          {/* ШИМ (PWM) - ПИКОВАЯ НАГРУЗКА */}
          <div className="col-span-2 bg-zinc-900/70 rounded-xl p-2.5 border border-zinc-700/50 flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-zinc-300 text-xs font-bold">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <span>{RU.pwm}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-400 font-medium">{RU.maxPwm}:</span>
              <span
                className={`text-sm font-black px-2 py-0.5 rounded-md ${
                  (stats.maxPwm ?? 0) >= 90
                    ? 'bg-rose-950 text-rose-400 border border-rose-500/50'
                    : (stats.maxPwm ?? 0) >= 75
                    ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                }`}
              >
                {Math.round(stats.maxPwm ?? stats.pwm ?? 0)}%
              </span>
            </div>
          </div>

          {/* ВРЕМЯ */}
          <div className="bg-zinc-900/70 rounded-xl p-2 border border-zinc-700/50 flex flex-col">
            <div className="flex items-center gap-1 text-zinc-400 text-[10px] font-bold">
              <Clock className="w-3 h-3 text-sky-400" />
              <span>{RU.time}</span>
            </div>
            <span className="text-sm font-bold text-white mt-0.5">
              {formatTime(stats.elapsedTime)}
            </span>
          </div>

          {/* ДИСТАНЦИЯ */}
          <div className="bg-zinc-900/70 rounded-xl p-2 border border-zinc-700/50 flex flex-col">
            <div className="flex items-center gap-1 text-zinc-400 text-[10px] font-bold">
              <Compass className="w-3 h-3 text-emerald-400" />
              <span>{RU.distance}</span>
            </div>
            <span className="text-sm font-bold text-white mt-0.5">{stats.distance} м</span>
          </div>

          {/* VOLT */}
          <div className="bg-zinc-900/70 rounded-xl p-2 border border-zinc-700/50 flex flex-col">
            <div className="flex items-center gap-1 text-zinc-400 text-[10px] font-bold">
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>{RU.volt}</span>
            </div>
            <span className="text-sm font-bold text-amber-400 mt-0.5">
              {stats.voltsCollected}
            </span>
          </div>

          {/* ТРЮКИ */}
          <div className="bg-zinc-900/70 rounded-xl p-2 border border-zinc-700/50 flex flex-col">
            <div className="flex items-center gap-1 text-zinc-400 text-[10px] font-bold">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>{RU.tricks}</span>
            </div>
            <span className="text-sm font-bold text-white mt-0.5">{stats.tricksCount}</span>
          </div>

          {/* ПАДЕНИЯ */}
          <div className="col-span-2 bg-zinc-900/70 rounded-xl p-2 border border-zinc-700/50 flex justify-between items-center">
            <span className="text-[11px] font-bold text-zinc-400">{RU.falls}</span>
            <span className="text-xs font-bold text-rose-400">{stats.fallsCount}</span>
          </div>
        </div>

        {/* КНОПКИ ДЕЙСТВИЙ */}
        <div className="w-full flex flex-col gap-2.5 mt-1">
          {hasNextLevel && (
            <button
              id="btn-victory-next-level"
              onClick={onNextLevel}
              className="w-full h-13 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 text-white font-black text-base tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.7)] border-2 border-emerald-300 active:scale-95 transition-all"
            >
              <span>ПЕРЕЙТИ НА УРОВЕНЬ {nextLevelId}</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}

          <button
            id="btn-victory-play-again"
            onClick={onPlayAgain}
            className="w-full h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-base flex items-center justify-center gap-2 border border-zinc-600 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>{RU.playAgain}</span>
          </button>

          <button
            id="btn-victory-menu"
            onClick={onToMenu}
            className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-sm flex items-center justify-center gap-2 border border-zinc-700 active:scale-95 transition-all"
          >
            <Home className="w-4 h-4 text-zinc-400" />
            <span>{RU.toMenu}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
