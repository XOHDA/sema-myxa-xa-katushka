import React from 'react';
import { PlayerStats, WeatherType } from '../types';
import { Shield, Zap, Pause, Flame, Battery, Compass, Gauge, AlertTriangle, Cpu } from 'lucide-react';
import { RU } from '../localization/ru';

interface HUDProps {
  stats: PlayerStats;
  onPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({ stats, onPause }) => {
  const getWeatherBadge = (weather?: WeatherType) => {
    switch (weather) {
      case 'light-rain':
        return {
          label: RU.weatherLightRain || 'СЛАБЫЙ ДОЖДЬ',
          icon: '🌧️',
          style: 'bg-sky-500/20 text-sky-300 border-sky-500/40 animate-pulse',
        };
      case 'heavy-rain':
        return {
          label: RU.weatherHeavyRain || 'ЛИВЕНЬ И СКОЛЬЖЕНИЕ',
          icon: '⛈️',
          style: 'bg-blue-600/30 text-blue-200 border-blue-400/60 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]',
        };
      case 'snow':
        return {
          label: RU.weatherSnow || 'СНЕГОПАД И ГОЛОЛЁД',
          icon: '❄️',
          style: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.4)]',
        };
      case 'blizzard':
        return {
          label: RU.weatherBlizzard || 'МЕТЕЛЬ И ЛЁД',
          icon: '🌬️',
          style: 'bg-indigo-600/30 text-indigo-200 border-indigo-400/70 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.6)]',
        };
      case 'clear':
      default:
        return {
          label: RU.weatherClear || 'ЯСНО',
          icon: '☀️',
          style: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
    }
  };

  const weatherBadge = getWeatherBadge(stats.weather);

  return (
    <div
      id="hud-overlay"
      className="absolute inset-x-0 top-0 pointer-events-none z-20 pt-[max(env(safe-area-inset-top),10px)] px-2.5 select-none"
    >
      {/* 0. ПАНЕЛЬ ТЕКУЩЕГО УРОВНЯ И ПРОГРЕССА ТРАССЫ */}
      <div
        id="hud-level-bar"
        className="w-full flex items-center justify-between bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-xl border border-sky-500/40 mb-1.5 shadow-[0_0_12px_rgba(14,165,233,0.2)] pointer-events-auto"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[9px] font-black uppercase bg-sky-500 text-black px-1.5 py-0.5 rounded tracking-wider shrink-0">
            УРОВЕНЬ {stats.currentLevel || 1}
          </span>
          <span className="text-[11px] font-bold text-sky-200 truncate max-w-[120px] sm:max-w-[200px]">
            {stats.levelName || `Уровень ${stats.currentLevel || 1}`}
          </span>
          {/* Dynamic Weather Badge */}
          <span
            id="hud-weather-badge"
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 border shrink-0 transition-all duration-300 ${weatherBadge.style}`}
          >
            <span>{weatherBadge.icon}</span>
            <span className="hidden sm:inline">{weatherBadge.label}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-300 shrink-0">
          <span className="text-emerald-400 font-mono">{stats.distance}м</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400 font-mono">{stats.levelLength || 16800}м</span>
          <div className="w-12 sm:w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-200"
              style={{
                width: `${Math.min(100, Math.max(0, (stats.distance / (stats.levelLength || 16800)) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Верхний компактный ряд: ЗАЩИТА (слева), СЧЁТ И КОМБО (по центру), ЗАРЯД и ПАУЗА (справа) */}
      <div className="flex items-center justify-between gap-2">
        {/* ЗАЩИТА: 3 единицы */}
        <div
          id="hud-shields-panel"
          className="flex items-center gap-1 bg-black/55 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-emerald-600/40 pointer-events-auto"
        >
          <Shield className="w-4 h-4 text-emerald-400 fill-emerald-400/30" />
          <div className="flex gap-1">
            {Array.from({ length: stats.maxShields }).map((_, i) => (
              <span
                key={i}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  i < stats.shields
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : 'bg-zinc-700/60 border border-zinc-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* СЧЁТ & КОМБО-МНОЖИТЕЛЬ С ПРОГРЕССОМ ТРЮКОВ */}
        <div
          id="hud-score-panel"
          className="flex flex-col items-center bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-amber-500/50 pointer-events-auto min-w-[130px] sm:min-w-[170px] shadow-[0_0_15px_rgba(245,158,11,0.2)]"
        >
          {/* Счёт */}
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-[10px] text-amber-300 font-bold tracking-wider">{RU.score}</span>
            <span className="text-base sm:text-lg font-black text-amber-400 tracking-wide font-mono">
              {stats.score.toLocaleString('ru-RU')}
            </span>
          </div>

          {/* Плашка Комбо-множителя и активного трюка */}
          <div className="w-full flex items-center justify-between gap-1.5 mt-1 pt-1 border-t border-zinc-800/80">
            <div className="flex items-center gap-1">
              <span
                className={`text-[10px] sm:text-[11px] font-black tracking-widest px-1.5 py-0.5 rounded transition-all ${
                  stats.combo >= 8
                    ? 'bg-cyan-500 text-black shadow-[0_0_10px_#06b6d4] animate-pulse'
                    : stats.combo >= 5
                    ? 'bg-rose-500 text-white shadow-[0_0_8px_#f43f5e]'
                    : stats.combo >= 3
                    ? 'bg-amber-500 text-black shadow-[0_0_6px_#f59e0b]'
                    : stats.combo > 1
                    ? 'bg-emerald-500 text-black'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                x{stats.combo}
              </span>
              {stats.activeTrickType && (
                <span
                  className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-1 py-0.5 rounded animate-pulse ${
                    stats.activeTrickType === 'jump'
                      ? 'bg-sky-950 text-sky-300 border border-sky-500/60'
                      : stats.activeTrickType === 'grind'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/60'
                      : 'bg-amber-950 text-amber-300 border border-amber-500/60'
                  }`}
                >
                  {stats.activeTrickType === 'jump'
                    ? '🦘 ПРЫЖОК'
                    : stats.activeTrickType === 'grind'
                    ? '🛹 ГРИНД'
                    : '⚖️ БАЛАНС'}
                </span>
              )}
            </div>

            {/* Процент до следующего множителя */}
            <span className="text-[9px] font-mono font-bold text-zinc-400">
              {stats.combo >= 10 ? 'MAX' : `${stats.comboProgress || 0}%`}
            </span>
          </div>

          {/* Шкала накопления прогресса до следующего комбо */}
          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden mt-1 border border-zinc-700/60 relative">
            <div
              className={`h-full transition-all duration-100 ${
                stats.combo >= 8
                  ? 'bg-gradient-to-r from-cyan-400 to-sky-300 shadow-[0_0_8px_#38bdf8]'
                  : stats.combo >= 5
                  ? 'bg-gradient-to-r from-amber-400 to-rose-500 shadow-[0_0_6px_#f43f5e]'
                  : 'bg-gradient-to-r from-emerald-400 to-amber-400'
              }`}
              style={{ width: `${stats.combo >= 10 ? 100 : (stats.comboProgress || 0)}%` }}
            />
          </div>

          {/* Таймер удержания комбо (если комбо > 1 и тикает обратный отсчёт) */}
          {stats.combo > 1 && stats.comboTimer > 0 && (
            <div className="w-full flex items-center justify-between gap-1 mt-0.5 text-[8px] text-zinc-400 font-mono">
              <span className="text-[7px] uppercase tracking-wider text-zinc-500">УДЕРЖАНИЕ</span>
              <div className="flex-1 h-0.5 bg-zinc-800 rounded-full overflow-hidden mx-1">
                <div
                  className={`h-full transition-all duration-100 ${
                    stats.comboTimer <= 1.0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, (stats.comboTimer / (stats.comboMaxTimer || 3.2)) * 100))}%`,
                  }}
                />
              </div>
              <span className={stats.comboTimer <= 1.0 ? 'text-rose-400 font-black' : 'text-zinc-300'}>
                {stats.comboTimer.toFixed(1)}с
              </span>
            </div>
          )}
        </div>

        {/* ЗАРЯД БАТАРЕИ & КНОПКА ПАУЗЫ */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div
            id="hud-battery-panel"
            className={`flex items-center gap-1.5 backdrop-blur-md px-2.5 py-1.5 rounded-xl border transition-colors ${
              stats.isTiltback
                ? 'bg-rose-950/80 border-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.85)] animate-pulse'
                : 'bg-black/55 border-sky-600/40'
            }`}
          >
            <Battery
              className={`w-4 h-4 ${
                stats.isTiltback
                  ? 'text-rose-400 animate-bounce'
                  : stats.battery > 30
                  ? 'text-sky-400'
                  : 'text-rose-500 animate-pulse'
              }`}
            />
            <div className="w-14 h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-600">
              <div
                className={`h-full transition-all duration-150 ${
                  stats.isSuperBoost
                    ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                    : stats.isTiltback || stats.battery <= 25
                    ? 'bg-rose-500'
                    : stats.battery > 30
                    ? 'bg-sky-400'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${stats.battery}%` }}
              />
            </div>
            <span className={`text-[10px] font-bold ${stats.isTiltback ? 'text-rose-200' : 'text-sky-200'}`}>
              {stats.battery}%
            </span>
            {stats.isTiltback && (
              <span className="text-[8px] font-black uppercase bg-rose-600 text-white px-1 rounded animate-pulse">
                TILTBACK
              </span>
            )}
          </div>

          <button
            id="btn-hud-pause"
            onClick={onPause}
            aria-label={RU.pause}
            className="w-8 h-8 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/90 active:scale-90 transition-transform"
          >
            <Pause className="w-4 h-4 fill-white" />
          </button>
        </div>
      </div>

      {/* Второй компактный ряд: VOLT, СПИДОМЕТР, ДИСТАНЦИЯ, БУСТ */}
      <div className="flex items-center justify-between gap-1.5 mt-2 px-1 text-[11px] font-bold text-white/90 flex-wrap sm:flex-nowrap">
        {/* Счётчик VOLT */}
        <div className="flex items-center gap-1 bg-amber-950/50 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-amber-500/30">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-amber-300 tracking-wide">{stats.voltsCollected}</span>
          <span className="text-[9px] text-amber-500/90 font-medium">VOLT</span>
        </div>

        {/* СПИДОМЕТР (СКОРОСТЬ В КМ/Ч) */}
        <div
          id="hud-speedometer-panel"
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border transition-all duration-200 ${
            stats.speedKmh >= 140
              ? 'bg-rose-950 border-rose-500 text-rose-200 shadow-[0_0_18px_rgba(244,63,94,1)] animate-pulse'
              : stats.isOverspeed
              ? 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-[0_0_16px_rgba(244,63,94,0.9)] animate-pulse'
              : 'bg-zinc-900/60 backdrop-blur-sm border-zinc-700/40 text-emerald-300'
          }`}
        >
          <Gauge className={`w-3.5 h-3.5 ${stats.isOverspeed ? 'text-rose-400 animate-bounce' : 'text-emerald-400'}`} />
          <div className="flex items-baseline gap-0.5">
            <span className={`text-xs font-black tracking-tight ${stats.isOverspeed ? 'text-rose-100' : 'text-white'}`}>
              {(stats.speedKmh ?? 0).toFixed(1)}
            </span>
            <span className={`text-[9px] font-bold ${stats.isOverspeed ? 'text-rose-300' : 'text-zinc-400'}`}>
              {RU.kmh}
            </span>
          </div>
          {stats.speedKmh >= 140 ? (
            <span className="text-[9px] bg-rose-600 text-white font-black px-1 rounded uppercase tracking-wider animate-ping">
              MAX!
            </span>
          ) : stats.isOverspeed ? (
            <span className="text-[9px] bg-rose-600 text-white font-black px-1 rounded uppercase tracking-wider animate-ping">
              !
            </span>
          ) : null}
        </div>

        {/* ШИМ (PWM) % */}
        <div
          id="hud-pwm-panel"
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${
            stats.pwm >= 90
              ? 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.9)] animate-pulse'
              : stats.pwm >= 75
              ? 'bg-amber-950/80 border-amber-500 text-amber-300'
              : 'bg-zinc-900/60 border-zinc-700/40 text-sky-300'
          }`}
        >
          <Cpu className={`w-3 h-3 ${stats.pwm >= 90 ? 'text-rose-400 animate-bounce' : 'text-zinc-400'}`} />
          <span className="text-[9px] text-zinc-400 font-bold">ШИМ</span>
          <span className="text-xs font-black">{Math.round(stats.pwm)}%</span>
        </div>

        {/* ДИСТАНЦИЯ */}
        <div className="flex items-center gap-1 bg-zinc-900/50 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-zinc-700/40">
          <Compass className="w-3.5 h-3.5 text-zinc-400" />
          <span>{stats.distance} м</span>
        </div>

        {/* СТАТУС БУСТА */}
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-all ${
            stats.isSuperBoost
              ? 'bg-amber-500/30 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-pulse'
              : stats.isBoosting
              ? 'bg-sky-500/30 border-sky-400 text-sky-300'
              : 'bg-zinc-900/50 border-zinc-700/30 text-zinc-400'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-wider">
            {stats.isSuperBoost ? 'СУПЕР-БУСТ' : stats.isBoosting ? 'БУСТ' : 'ГОТОВ'}
          </span>
        </div>
      </div>

      {/* ЕДИНЫЙ ЦЕНТР УВЕДОМЛЕНИЙ: ВСЕ СООБЩЕНИЯ СТРОГО СТОПКОЙ ДРУГ ПОД ДРУГОМ БЕЗ КАКОГО-ЛИБО НАЛОЖЕНИЯ */}
      <div
        id="hud-notifications-stack"
        className="absolute left-1/2 -translate-x-1/2 top-20 flex flex-col items-center gap-2 pointer-events-none z-30 w-full max-w-lg px-3 transition-all"
      >
        {/* 0. КРИТИЧЕСКИЙ ПРОДАВ КОЛЕСА (БУСТ > 3 СЕК ИЛИ СКОРОСТЬ 100+ КМ/Ч) */}
        {stats.isCutout && (
          <div
            id="hud-cutout-banner"
            className="flex flex-col items-center bg-gradient-to-b from-red-700 to-rose-900 text-white px-5 sm:px-6 py-2.5 rounded-2xl border-2 border-yellow-300 shadow-[0_0_35px_rgba(239,68,68,1)] animate-bounce"
          >
            <span className="text-base sm:text-lg font-black tracking-widest text-yellow-300 drop-shadow-md text-center">
              {stats.cutoutReason === 'boost'
                ? '💥 ПРОДАВ! БУСТ > 3 СЕКУНД! 💥'
                : `💥 ${RU.cutoutAlert} 💥`}
            </span>
            <p className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider mt-0.5 text-center">
              {stats.cutoutReason === 'boost'
                ? 'КНОПКА БУСТА УДЕРЖИВАЛАСЬ ДОЛЬШЕ 3 СЕК! МОТОР ОТКЛЮЧИЛСЯ!'
                : 'МОНОКОЛЕСО ОТКЛЮЧИЛОСЬ ИЗ-ЗА ПЕРЕГРУЗКИ (150+ КМ/Ч)!'}
            </p>
          </div>
        )}

        {/* 0. БОСС ДУЭЛЬ С ФАНТОМАСОМ НА МОНОКОЛЕСЕ SV */}
        {stats.bossDuelActive && !stats.isCutout && (
          <div
            id="hud-boss-duel-card"
            className="flex flex-col items-center gap-1.5 bg-gradient-to-r from-purple-950/95 via-indigo-950/95 to-purple-950/95 backdrop-blur-md px-5 py-2.5 rounded-2xl border-2 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.85)] animate-pulse"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 fill-cyan-400 animate-bounce" />
              <span className="text-xs sm:text-sm font-black text-yellow-300 tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                ⚡ ДУЭЛЬ: СЁМА vs ФАНТОМАС (SV) ⚡
              </span>
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 fill-purple-400 animate-pulse" />
            </div>

            {/* Позиция в дуэли */}
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide border shadow-md ${
                  (stats.bossDistanceLead || 0) > 0
                    ? 'bg-emerald-600/90 text-white border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.7)]'
                    : (stats.bossDistanceLead || 0) < 0
                    ? 'bg-rose-600/90 text-white border-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.7)]'
                    : 'bg-amber-600/90 text-white border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.7)]'
                }`}
              >
                {(stats.bossDistanceLead || 0) > 0
                  ? `🏁 Сёма впереди на +${stats.bossDistanceLead} м!`
                  : (stats.bossDistanceLead || 0) < 0
                  ? `⚠ Фантомас на SV лидирует: ${Math.abs(stats.bossDistanceLead || 0)} м!`
                  : '⚔ Идут колесо в колесо!'}
              </span>
            </div>

            {/* Шкала слипстрима при движении в кильватере Фантомаса */}
            {stats.bossSlipstreamActive && (
              <div className="flex flex-col items-center w-full mt-1">
                <span className="text-[10px] font-black text-cyan-200 uppercase tracking-wide animate-pulse">
                  🚀 СЛИПСТРИМ: {stats.bossSlipstreamCharge}% (ДЕРЖИСЬ СЗАДИ ДЛЯ РЫВКА!)
                </span>
                <div className="w-48 sm:w-60 h-2 bg-black/80 rounded-full overflow-hidden mt-1 border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.9)]">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400 transition-all duration-75 shadow-[0_0_12px_#38bdf8]"
                    style={{ width: `${Math.min(100, Math.max(0, stats.bossSlipstreamCharge || 0))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 0.5. ПРЕДУПРЕЖДЕНИЕ О БУСТЕ И ОПАСНОСТИ ПРОДАВА (> 0.4 СЕК) */}
        {!stats.isCutout && stats.boostHoldDuration > 0.4 && (
          <div
            id="hud-boost-timer-banner"
            className={`flex flex-col items-center px-4 py-1.5 rounded-2xl border-2 transition-all backdrop-blur-md ${
              stats.boostHoldDuration >= 2.2
                ? 'bg-red-950/95 border-red-500 shadow-[0_0_25px_rgba(239,68,68,1)] animate-bounce text-red-100'
                : stats.boostHoldDuration >= 1.4
                ? 'bg-amber-950/90 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.9)] animate-pulse text-amber-100'
                : 'bg-zinc-900/90 border-amber-500/60 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Flame
                className={`w-4 h-4 ${
                  stats.boostHoldDuration >= 2.2
                    ? 'text-red-400 animate-spin'
                    : 'text-amber-400 animate-pulse'
                }`}
              />
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider">
                {stats.boostHoldDuration >= 2.2
                  ? '⚠ ВНИМАНИЕ! ПРОДАВ ПРИ 3.0 СЕК!'
                  : '⚡ УДЕРЖАНИЕ БУСТА:'}{' '}
                <span
                  className={`font-mono text-sm ${
                    stats.boostHoldDuration >= 2.2
                      ? 'text-red-300 font-black underline'
                      : 'text-amber-300 font-bold'
                  }`}
                >
                  {stats.boostHoldDuration.toFixed(1)}
                </span>{' '}
                / 3.0 СЕК
              </span>
            </div>
            {/* Шкала таймера буста до 3 секунд */}
            <div className="w-44 sm:w-56 h-2 bg-black/70 rounded-full overflow-hidden mt-1 border border-zinc-700">
              <div
                className={`h-full transition-all duration-75 ${
                  stats.boostHoldDuration >= 2.2
                    ? 'bg-red-500 shadow-[0_0_10px_#ef4444]'
                    : stats.boostHoldDuration >= 1.4
                    ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                    : 'bg-sky-400'
                }`}
                style={{ width: `${Math.min(100, (stats.boostHoldDuration / 3.0) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* 1. ПРЕДУПРЕЖДЕНИЕ О КРИТИЧЕСКОМ ШИМ / ПРЕДЕЛЕ 150 КМ/Ч */}
        {!stats.isCutout && stats.speedKmh >= 135 && (
          <div
            id="hud-cutout-warning-banner"
            className="flex flex-col sm:flex-row items-center gap-2 bg-gradient-to-r from-red-700 via-rose-600 to-red-700 px-5 py-2 rounded-2xl border-2 border-yellow-300 shadow-[0_0_30px_rgba(239,68,68,1)] animate-pulse"
          >
            <AlertTriangle className="w-5 h-5 text-yellow-300 stroke-[3] animate-bounce" />
            <div className="flex flex-col sm:flex-row items-center gap-1.5 text-center sm:text-left">
              <span className="text-xs sm:text-sm font-black text-yellow-200 tracking-wide uppercase">
                {RU.cutoutWarning}
              </span>
              <span className="text-xs font-black bg-black/60 text-white px-2 py-0.5 rounded border border-yellow-400/50">
                ШИМ {Math.round(stats.pwm)}% ({stats.speedKmh.toFixed(1)} {RU.kmh})
              </span>
            </div>
          </div>
        )}

        {/* 2. КРИТИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ: «ВОБЛА!» */}
        {stats.isWobbling && !stats.isCutout && (
          <div
            id="hud-wobble-banner"
            className="flex flex-col items-center bg-rose-600/95 backdrop-blur-md px-6 py-2 rounded-2xl border-2 border-yellow-300 shadow-[0_0_25px_rgba(225,29,72,0.9)] animate-wobble"
          >
            <span className="text-xl sm:text-2xl font-black tracking-widest text-yellow-300 drop-shadow-md">
              ⚡ {RU.wobble} ⚡
            </span>
            <p className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider mt-0.5">
              ДЕРЖИ РАВНОВЕСИЕ!
            </p>
          </div>
        )}

        {/* 3. ПРЕДУПРЕЖДЕНИЕ О ЗАДИРЕ ПЕДАЛЕЙ (TILTBACK) ПРИ РАЗРЯДКЕ */}
        {stats.isTiltback && !stats.isCutout && !stats.isWobbling && (
          <div
            id="hud-tiltback-banner"
            className="flex flex-col items-center bg-gradient-to-r from-amber-700 via-rose-700 to-amber-700 px-5 py-2 rounded-2xl border-2 border-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.9)] animate-pulse"
          >
            <div className="flex items-center gap-2">
              <Battery className="w-5 h-5 text-amber-300 animate-bounce" />
              <span className="text-xs sm:text-sm font-black text-amber-200 tracking-wider uppercase drop-shadow-md">
                ⚡ ЗАДИР ПЕДАЛЕЙ (TILTBACK) — {stats.battery}%
              </span>
            </div>
            <p className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider mt-0.5 text-center">
              КОЛЕСО ОТКЛОНЕНО НАЗАД И ЕЛЕ ЕДЕТ! ИЩИ ЗАПРАВКУ ИЛИ БАТАРЕЙКУ!
            </p>
          </div>
        )}

        {/* 4. ПРЕДУПРЕЖДЕНИЕ О СКОРОСТИ: «СЁМА, НЕ ГОНИ!» (> 60 КМ/Ч) */}
        {stats.isOverspeed && !stats.isWobbling && !stats.isCutout && stats.speedKmh < 90 && (
          <div
            id="hud-overspeed-banner"
            className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 px-4 py-1.5 rounded-2xl border-2 border-yellow-300 shadow-[0_0_25px_rgba(239,68,68,0.95)] animate-pulse"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 stroke-[3] animate-bounce" />
              <span className="text-xs sm:text-sm font-black text-yellow-200 tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {RU.speedOverspeedAlert}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-white/90 uppercase tracking-wide">
                {RU.speedOverspeedSub}
              </span>
              <span className="text-xs font-black bg-black/60 text-yellow-300 px-2 py-0.5 rounded-md border border-yellow-300/50 shadow-inner">
                {stats.speedKmh.toFixed(1)} {RU.kmh}
              </span>
            </div>
          </div>
        )}

        {/* 3. НАГРАДА: «СЁМА КРУТ! ДВОЙНОЙ БУСТ!» (СМЕЩЕНА В СТЕКЕ, НИКОГДА НЕ ПЕРЕКРЫВАЕТ ДРУГИЕ СООБЩЕНИЯ) */}
        {stats.trickPopup && (
          <div
            id="hud-trick-popup"
            className={`flex items-center gap-2 backdrop-blur-md px-5 py-2 rounded-2xl border-2 tracking-wider transition-all shadow-xl ${
              stats.trickPopup.includes('СЁМА КРУТ')
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 border-yellow-200 text-black font-black text-xs sm:text-sm shadow-[0_0_28px_rgba(250,204,21,0.95)] animate-bounce'
                : 'bg-emerald-950/90 border-emerald-400 text-emerald-300 font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(16,185,129,0.7)] animate-bounce'
            }`}
          >
            {stats.trickPopup.includes('СЁМА КРУТ') && (
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 fill-red-600 animate-pulse" />
            )}
            <span>{stats.trickPopup}</span>
            {stats.trickPopup.includes('СЁМА КРУТ') && (
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-900 fill-amber-900 animate-bounce" />
            )}
          </div>
        )}

        {/* 4. РЕПЛИКА СЁМЫ (РАЗМЕЩАЕТСЯ АККУРАТНО СЛЕДОМ, БЕЗ ДУБЛИРОВАНИЯ И БЕЗ НАЛОЖЕНИЯ) */}
        {stats.activeSpeech &&
          !stats.isWobbling &&
          (!stats.trickPopup || !stats.trickPopup.includes('СЁМА КРУТ')) && (
            <div
              id="hud-speech-bubble"
              className="flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-amber-400/80 text-amber-300 font-bold text-xs shadow-lg"
            >
              <span>💬 {stats.activeSpeech}</span>
            </div>
          )}
      </div>
    </div>
  );
};
