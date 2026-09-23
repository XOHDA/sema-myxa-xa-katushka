import React, { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { LEVELS } from './levels';
import { GameSettings, InputState, LevelId, PlayerStats, GarageUpgrades } from '../types';

interface GameContainerProps {
  levelId: LevelId;
  settings: GameSettings;
  upgrades: GarageUpgrades;
  onStatsUpdate: (stats: PlayerStats) => void;
  onGameOver: () => void;
  onVictory: () => void;
  onCollectVolt?: () => void;
  onPauseToggle: () => void;
  inputState: InputState;
  onInputChange: (input: InputState) => void;
  isPaused: boolean;
}

export const GameContainer: React.FC<GameContainerProps> = ({
  levelId,
  settings,
  upgrades,
  onStatsUpdate,
  onGameOver,
  onVictory,
  onCollectVolt,
  onPauseToggle,
  inputState,
  onInputChange,
  isPaused,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<GameScene | null>(null);
  const inputStateRef = useRef<InputState>(inputState);

  inputStateRef.current = inputState;

  // Pass updated input state down to Phaser scene
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setInputState(inputState);
    }
  }, [inputState]);

  // Pass updated garage upgrades & skin customization down to Phaser scene
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateUpgrades(upgrades);
    }
  }, [upgrades]);

  // Handle Pause / Resume
  const prevPausedRef = useRef<boolean>(isPaused);
  useEffect(() => {
    if (prevPausedRef.current === isPaused) return;
    prevPausedRef.current = isPaused;

    if (!sceneRef.current || !sceneRef.current.isSceneReady) return;
    if (isPaused) {
      sceneRef.current.pauseGame();
    } else {
      sceneRef.current.resumeGame();
    }
  }, [isPaused]);

  // Keyboard Event Listeners (Independent of layout via code)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't prevent F12, F5, etc.
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'Escape') {
        onPauseToggle();
        return;
      }

      if (e.code === 'KeyR') {
        if (sceneRef.current) {
          sceneRef.current.respawnAtCheckpoint();
        }
        return;
      }

      const nextInput = { ...inputStateRef.current };
      let changed = false;

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        nextInput.left = true;
        changed = true;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        nextInput.right = true;
        changed = true;
      }
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        nextInput.jump = true;
        changed = true;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        nextInput.boost = true;
        changed = true;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        nextInput.down = true;
        changed = true;
      }

      if (changed) {
        onInputChange(nextInput);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const nextInput = { ...inputStateRef.current };
      let changed = false;

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        nextInput.left = false;
        changed = true;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        nextInput.right = false;
        changed = true;
      }
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        nextInput.jump = false;
        changed = true;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        nextInput.boost = false;
        changed = true;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        nextInput.down = false;
        changed = true;
      }

      if (changed) {
        onInputChange(nextInput);
      }
    };

    const handleSemaRespawn = () => {
      const cleanInput: InputState = { left: false, right: false, jump: false, boost: false, down: false };
      inputStateRef.current = cleanInput;
      onInputChange(cleanInput);
      if (sceneRef.current) {
        sceneRef.current.setInputState(cleanInput);
        sceneRef.current.respawnAtCheckpoint();
      }
    };

    const handleWindowBlur = () => {
      const cleanInput: InputState = { left: false, right: false, jump: false, boost: false, down: false };
      inputStateRef.current = cleanInput;
      onInputChange(cleanInput);
      if (sceneRef.current) {
        sceneRef.current.setInputState(cleanInput);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('sema-respawn', handleSemaRespawn);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('sema-respawn', handleSemaRespawn);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [onInputChange, onPauseToggle]);

  // Initialize Phaser
  useEffect(() => {
    if (!containerRef.current) return;

    const levelConfig = LEVELS[levelId] || LEVELS[1];

    const scene = new GameScene(
      levelConfig,
      onStatsUpdate,
      onGameOver,
      onVictory,
      upgrades,
      onCollectVolt
    );
    sceneRef.current = scene;

    // Phaser 3 configuration: 450 x 800 (9:16 portrait) with SCALE.FIT for responsive scaling
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 450,
      height: 800,
      backgroundColor: '#090d16',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: levelConfig.gravity },
          debug: false,
        },
      },
      scene: [scene],
      render: {
        antialias: true,
        pixelArt: false,
        powerPreference: 'high-performance',
      },
      input: {
        touch: {
          capture: false, // let browser pointer events handle custom multitouch buttons cleanly
        },
      },
      audio: {
        noAudio: true, // We use custom soundManager, disable Phaser's WebAudio to prevent closed AudioContext errors
      },
      banner: false,
    };

    const game = new Phaser.Game(config);
    // Disable Phaser's auto-pause on blur to prevent warnings when preview iframe loses focus
    game.events.off(Phaser.Core.Events.BLUR);
    gameRef.current = game;

    return () => {
      if (sceneRef.current) {
        sceneRef.current.destroyScene();
      }
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, [levelId, onGameOver, onStatsUpdate, onVictory]);

  return (
    <div
      id="phaser-game-container"
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
    />
  );
};
