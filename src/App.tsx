import React, { useState, useCallback, useEffect } from 'react';
import { GameState, LevelId, PlayerStats, GameSettings, InputState } from './types';
import { GameContainer } from './game/GameContainer';
import { TouchControls } from './components/TouchControls';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { VictoryModal } from './components/VictoryModal';
import { LevelSelectModal } from './components/LevelSelectModal';
import { SettingsModal } from './components/SettingsModal';
import { ControlsModal } from './components/ControlsModal';
import { LevelTransitionModal } from './components/LevelTransitionModal';
import { soundManager } from './audio/soundManager';
import { Smartphone, Monitor } from 'lucide-react';

const INITIAL_STATS: PlayerStats = {
  shields: 3,
  maxShields: 3,
  battery: 100,
  score: 0,
  voltsCollected: 0,
  distance: 0,
  tricksCount: 0,
  fallsCount: 0,
  elapsedTime: 0,
  combo: 1,
  speedKmh: 0,
  maxSpeedKmh: 0,
  avgSpeedKmh: 0,
  pwm: 0,
  maxPwm: 0,
  boostHoldDuration: 0,
  currentLevel: 1,
  levelName: '1. НАБЕРЕЖНАЯ И ПАРК',
  levelLength: 5600,
  isCutout: false,
  isOverspeed: false,
  isBoosting: false,
  isSuperBoost: false,
  isWobbling: false,
  isTiltback: false,
  activeSpeech: null,
  trickPopup: null,
};

export default function App() {
  // Game starts on Main Menu screen
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [currentLevel, setCurrentLevel] = useState<LevelId>(1);
  const [gameRunId, setGameRunId] = useState(0);
  const [stats, setStats] = useState<PlayerStats>(INITIAL_STATS);
  const [inputState, setInputState] = useState<InputState>({
    left: false,
    right: false,
    jump: false,
    boost: false,
    down: false,
  });

  // Modals
  const [isLevelSelectOpen, setIsLevelSelectOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [transitioningLevel, setTransitioningLevel] = useState<LevelId | null>(null);

  // Desktop Simulator Frame toggle
  const [showPhoneFrame, setShowPhoneFrame] = useState(false);

  // Settings
  const [settings, setSettings] = useState<GameSettings>({
    music: true,
    sound: true,
    vibration: true,
    volume: 0.8,
    effects: true,
  });

  const handleStatsUpdate = useCallback((newStats: PlayerStats) => {
    setStats(newStats);
  }, []);

  const handleGameOver = useCallback(() => {
    soundManager.stopMotor();
    setGameState((prev) => (prev === 'VICTORY' ? prev : 'GAMEOVER'));
  }, []);

  const handleVictory = useCallback(() => {
    soundManager.stopMotor();
    setGameState((prev) => (prev === 'GAMEOVER' ? prev : 'VICTORY'));
  }, []);

  useEffect(() => {
    if (gameState !== 'PLAYING') {
      soundManager.stopMotor();
    }
  }, [gameState]);

  const handlePauseToggle = useCallback(() => {
    setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev));
  }, []);

  const handleRestart = () => {
    setStats(INITIAL_STATS);
    setInputState({ left: false, right: false, jump: false, boost: false, down: false });
    setGameRunId((prev) => prev + 1);
    setGameState('PLAYING');
  };

  const handleSelectLevel = (levelId: LevelId) => {
    setCurrentLevel(levelId);
    setGameRunId((prev) => prev + 1);
    setStats(INITIAL_STATS);
    setIsLevelSelectOpen(false);
    setGameState('PLAYING');
    soundManager.startMusic();
  };

  const handleNextLevel = () => {
    if (currentLevel < 15) {
      const nextLvl = (currentLevel + 1) as LevelId;
      setTransitioningLevel(nextLvl);
      soundManager.playLevelTransition();
    } else {
      soundManager.stopMotor();
      setGameState('MENU');
    }
  };

  const handleStartTransitionedLevel = () => {
    if (transitioningLevel) {
      const nextLvl = transitioningLevel;
      setTransitioningLevel(null);
      handleSelectLevel(nextLvl);
    }
  };

  const handleRetryFromCheckpoint = () => {
    setGameState('PLAYING');
    // Phaser scene respawns immediately at last checkpoint
    window.dispatchEvent(new CustomEvent('sema-respawn'));
  };

  return (
    <div
      id="app-root-container"
      className="w-full h-[100dvh] bg-[#070b10] flex items-center justify-center overflow-hidden touch-none select-none relative font-['Rubik','Montserrat',sans-serif]"
    >
      {/* ДЕСКТОПНЫЙ ИНДИКАТОР И ПЕРЕКЛЮЧАТЕЛЬ РАМКИ СМАРТФОНА (ДЛЯ ТЕСТИРОВАНИЯ) */}
      <div className="hidden lg:flex absolute top-3 left-4 z-50 items-center gap-2 bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-700 text-xs text-zinc-300">
        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
        <span className="font-medium">Мобильный 9:16 (390x844)</span>
        <button
          onClick={() => setShowPhoneFrame(!showPhoneFrame)}
          className="ml-2 text-emerald-400 hover:text-emerald-300 underline font-bold"
        >
          {showPhoneFrame ? 'Без рамки' : 'С рамкой'}
        </button>
      </div>

      {/* ГЛАВНЫЙ ИГРОВОЙ КОНТЕЙНЕР (СТРОГО 9:16 ДЛЯ СМАРТФОНА) */}
      <div
        id="game-viewport"
        className={`relative h-full aspect-[9/16] max-h-[100dvh] max-w-[100vw] bg-[#090d16] flex flex-col overflow-hidden shadow-2xl ${
          showPhoneFrame
            ? 'rounded-[48px] border-[10px] border-zinc-800 shadow-[0_0_60px_rgba(0,0,0,0.9)] max-h-[92dvh]'
            : 'w-full sm:w-auto'
        }`}
        style={{
          paddingTop: 'var(--sat)',
          paddingBottom: 'var(--sab)',
          paddingLeft: 'var(--sal)',
          paddingRight: 'var(--sar)',
        }}
      >
        {/* Dynamic Island / Вырез камеры смартфона (при показе рамки) */}
        {showPhoneFrame && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-end px-3">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-750" />
          </div>
        )}

        {/* 1. PHASER 3 ИГРА */}
        {gameState !== 'MENU' && (
          <GameContainer
            key={`level-${currentLevel}-${gameRunId}`}
            levelId={currentLevel}
            settings={settings}
            onStatsUpdate={handleStatsUpdate}
            onGameOver={handleGameOver}
            onVictory={handleVictory}
            onPauseToggle={handlePauseToggle}
            inputState={inputState}
            onInputChange={setInputState}
            isPaused={gameState === 'PAUSED'}
          />
        )}

        {/* 2. МОБИЛЬНЫЙ HUD (Сверху) */}
        {gameState === 'PLAYING' && (
          <HUD stats={stats} onPause={handlePauseToggle} />
        )}

        {/* 3. СЕНСОРНОЕ УПРАВЛЕНИЕ (Виртуальные кнопки внизу) */}
        {gameState === 'PLAYING' && (
          <TouchControls
            inputState={inputState}
            onInputChange={setInputState}
            disabled={gameState !== 'PLAYING'}
            boostHoldDuration={stats.boostHoldDuration}
          />
        )}

        {/* 4. ГЛАВНОЕ МЕНЮ */}
        {gameState === 'MENU' && (
          <MainMenu
            onStartGame={() => {
              setStats(INITIAL_STATS);
              setGameRunId((prev) => prev + 1);
              setGameState('PLAYING');
              soundManager.startMusic();
            }}
            onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
            onOpenControls={() => setIsControlsOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {/* 5. МОДАЛЬНОЕ ОКНО ПАУЗЫ */}
        {gameState === 'PAUSED' && (
          <PauseModal
            onResume={() => setGameState('PLAYING')}
            onRestart={handleRestart}
            onToMenu={() => setGameState('MENU')}
          />
        )}

        {/* 6. ПОРАЖЕНИЕ: «СЁМА ПРИЛЁГ» */}
        {gameState === 'GAMEOVER' && (
          <GameOverModal
            isCutout={stats.isCutout}
            cutoutReason={stats.cutoutReason}
            onRetry={handleRetryFromCheckpoint}
            onRestartLevel={handleRestart}
            onToMenu={() => setGameState('MENU')}
          />
        )}

        {/* 7. ПОБЕДА: «КАТУШКА ПРОЙДЕНА!» */}
        {gameState === 'VICTORY' && (
          <VictoryModal
            stats={stats}
            onPlayAgain={handleRestart}
            onNextLevel={handleNextLevel}
            onToMenu={() => setGameState('MENU')}
            hasNextLevel={currentLevel < 15}
          />
        )}

        {/* 7.5. ПЕРЕХОД НА СЛЕДУЮЩИЙ УРОВЕНЬ */}
        {transitioningLevel !== null && (
          <LevelTransitionModal
            targetLevelId={transitioningLevel}
            onStart={handleStartTransitionedLevel}
          />
        )}

        {/* 8. ОКНО ВЫБОРА УРОВНЯ */}
        {isLevelSelectOpen && (
          <LevelSelectModal
            currentLevel={currentLevel}
            onSelectLevel={handleSelectLevel}
            onClose={() => setIsLevelSelectOpen(false)}
          />
        )}

        {/* 9. ОКНО НАСТРОЕК */}
        {isSettingsOpen && (
          <SettingsModal
            settings={settings}
            onUpdateSettings={setSettings}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}

        {/* 10. ОКНО УПРАВЛЕНИЯ */}
        {isControlsOpen && (
          <ControlsModal onClose={() => setIsControlsOpen(false)} />
        )}
      </div>
    </div>
  );
}
