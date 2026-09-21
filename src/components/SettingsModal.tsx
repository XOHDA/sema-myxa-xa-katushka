import React, { useState } from 'react';
import { GameSettings } from '../types';
import { RU } from '../localization/ru';
import { soundManager } from '../audio/soundManager';
import { X, Volume2, Music, Bell, Vibrate, Sparkles, Upload, RotateCcw, Check } from 'lucide-react';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (settings: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const [trackInfo, setTrackInfo] = useState(soundManager.getTrackInfo());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const toggleSetting = (key: keyof GameSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    onUpdateSettings(updated);
    soundManager.updateSettings(updated);
  };

  const handleVolumeChange = (val: number) => {
    const updated = { ...settings, volume: val };
    onUpdateSettings(updated);
    soundManager.updateSettings(updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const success = await soundManager.setCustomAudioTrack(file, file.name);
    setIsUploading(false);
    if (success) {
      setTrackInfo(soundManager.getTrackInfo());
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2500);
    }
  };

  const handleResetTrack = async () => {
    await soundManager.clearCustomTrack();
    setTrackInfo(soundManager.getTrackInfo());
  };

  return (
    <div
      id="settings-modal"
      className="absolute inset-0 z-50 flex items-center justify-center p-5 bg-black/85 backdrop-blur-md text-white select-none animate-fadeIn"
    >
      <div className="w-full max-w-sm bg-gradient-to-b from-zinc-900 to-black p-6 rounded-3xl border-2 border-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.3)] flex flex-col gap-4">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black tracking-wide text-white">
            {RU.settings}
          </h2>
          <button
            id="btn-close-settings"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Настройки */}
        <div className="flex flex-col gap-3">
          {/* МУЗЫКА */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center gap-2.5">
              <Music className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-sm">{RU.music}</span>
            </div>
            <button
              id="toggle-music"
              onClick={() => toggleSetting('music')}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                settings.music ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.music ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* САУНДТРЕК И ЗАГРУЗКА АУДИОФАЙЛА */}
          <div className="flex flex-col gap-2 p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-xs text-zinc-300">ТРЕК ИГРЫ</span>
              </div>
              <span className="text-[11px] text-emerald-400 font-bold truncate max-w-[150px]">
                {trackInfo.title}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <label
                htmlFor="upload-music-file"
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 text-xs font-bold text-center cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                {uploadSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Трек установлен!</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Загрузка...' : trackInfo.isCustom ? 'Заменить MP3' : 'Загрузить аудиофайл'}</span>
                  </>
                )}
                <input
                  id="upload-music-file"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {trackInfo.isCustom && (
                <button
                  id="btn-reset-track"
                  onClick={handleResetTrack}
                  className="py-2 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-rose-400 text-xs font-bold transition-all flex items-center justify-center"
                  title="Сбросить трек"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-[10px] text-zinc-400 leading-tight">
              Фон: «Неоновые кости». Можно выбрать любой MP3/WAV файл — сохранится в игре автоматически.
            </div>
          </div>

          {/* ЗВУКИ */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-sm">{RU.sounds}</span>
            </div>
            <button
              id="toggle-sound"
              onClick={() => toggleSetting('sound')}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                settings.sound ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.sound ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* ВИБРАЦИЯ */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center gap-2.5">
              <Vibrate className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-sm">{RU.vibration}</span>
            </div>
            <button
              id="toggle-vibration"
              onClick={() => toggleSetting('vibration')}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                settings.vibration ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.vibration ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* ГРОМКОСТЬ */}
          <div className="flex flex-col gap-2 p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm">{RU.volume}</span>
              </div>
              <span className="text-xs text-zinc-400 font-bold">
                {Math.round(settings.volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 h-2 bg-zinc-700 rounded-lg cursor-pointer"
            />
          </div>

          {/* ЭФФЕКТЫ */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-sm">{RU.effects}</span>
            </div>
            <button
              id="toggle-effects"
              onClick={() => toggleSetting('effects')}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                settings.effects ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.effects ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <button
          id="btn-settings-back"
          onClick={onClose}
          className="w-full h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-sm flex items-center justify-center border border-zinc-700 mt-1 active:scale-95 transition-all"
        >
          {RU.back}
        </button>
      </div>
    </div>
  );
};
