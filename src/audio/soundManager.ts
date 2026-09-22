import { GameSettings } from '../types';
import { getAudioTrack, saveAudioTrack, removeAudioTrack } from './audioStorage';

class SoundManager {
  private ctx: AudioContext | null = null;
  private settings: GameSettings = {
    music: true,
    sound: true,
    vibration: true,
    volume: 0.8,
    effects: true,
  };

  // Motor sound node
  private motorOsc: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;
  private motorFilter: BiquadFilterNode | null = null;

  // EUC Dynamic Turbine Engine Audio Nodes (Spool-up / Wind-down)
  private turbineOsc1: OscillatorNode | null = null;
  private turbineOsc2: OscillatorNode | null = null;
  private turbineSubOsc: OscillatorNode | null = null;
  private turbineNoiseSource: AudioBufferSourceNode | null = null;
  private turbineNoiseFilter: BiquadFilterNode | null = null;
  private turbineNoiseGain: GainNode | null = null;
  private turbineGain: GainNode | null = null;
  private turbineNoiseBuffer: AudioBuffer | null = null;
  private isTurbineRunning: boolean = false;
  private turbineStopTimeout: ReturnType<typeof setTimeout> | null = null;

  // Music playback: Real Audio Element + Procedural Fallback
  private bgAudio: HTMLAudioElement | null = null;
  private customAudioUrl: string | null = null;
  private trackTitle: string = '«Неоновые кости»';
  private isCustomTrack: boolean = false;
  private musicInterval: number | null = null;
  private musicStep = 0;
  private isMusicPlaying = false;
  private isInitAudioDone = false;

  public init() {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        try {
          this.ctx = new AudioContextClass();
        } catch {
          this.ctx = null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public async initAudioTrack(): Promise<void> {
    if (this.isInitAudioDone) return;
    this.isInitAudioDone = true;

    try {
      const saved = await getAudioTrack();
      if (saved && saved.blob) {
        if (this.customAudioUrl && this.customAudioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(this.customAudioUrl);
        }
        this.customAudioUrl = URL.createObjectURL(saved.blob);
        this.trackTitle = saved.name || '«Неоновые кости»';
        this.isCustomTrack = true;
        return;
      }
    } catch {
      // ignore
    }

    // Check if public/music.mp3 exists on server
    try {
      const res = await fetch('/music.mp3', { method: 'HEAD' });
      if (res.ok) {
        this.customAudioUrl = '/music.mp3';
        this.trackTitle = '«Неоновые кости» (MP3)';
        this.isCustomTrack = true;
      }
    } catch {
      // ignore
    }
  }

  public async setCustomAudioTrack(file: File | Blob, name: string): Promise<boolean> {
    try {
      await saveAudioTrack(file, name);
      if (this.customAudioUrl && this.customAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.customAudioUrl);
      }
      this.customAudioUrl = URL.createObjectURL(file);
      this.trackTitle = name;
      this.isCustomTrack = true;

      // Stop previous music loops
      if (this.musicInterval) {
        clearInterval(this.musicInterval);
        this.musicInterval = null;
      }

      if (this.bgAudio) {
        this.bgAudio.pause();
        this.bgAudio.src = this.customAudioUrl;
        this.bgAudio.loop = true;
      } else {
        this.bgAudio = new Audio(this.customAudioUrl);
        this.bgAudio.loop = true;
      }

      if (this.settings.music) {
        this.bgAudio.volume = 0.75 * this.settings.volume;
        this.isMusicPlaying = true;
        await this.bgAudio.play().catch((e) => console.warn('Play audio error:', e));
      }
      return true;
    } catch (e) {
      console.warn('Failed to set custom audio track:', e);
      return false;
    }
  }

  public async clearCustomTrack(): Promise<void> {
    await removeAudioTrack();
    if (this.customAudioUrl && this.customAudioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.customAudioUrl);
    }
    this.customAudioUrl = null;
    this.isCustomTrack = false;
    this.trackTitle = '«Неоновые кости» (Синтезатор)';

    if (this.bgAudio) {
      this.bgAudio.pause();
      this.bgAudio.src = '';
    }

    if (this.settings.music && this.isMusicPlaying) {
      this.startProceduralPhonkSynth();
    }
  }

  public getTrackInfo() {
    return {
      title: this.trackTitle,
      isCustom: this.isCustomTrack,
    };
  }

  public updateSettings(newSettings: GameSettings) {
    this.settings = { ...newSettings };
    if (!this.settings.music) {
      this.stopMusic();
    } else {
      if (this.bgAudio) {
        this.bgAudio.volume = 0.75 * this.settings.volume;
      }
      if (!this.isMusicPlaying) {
        this.startMusic();
      }
    }

    if (!this.settings.sound) {
      if (this.motorGain) {
        this.motorGain.gain.setValueAtTime(0, this.ctx ? this.ctx.currentTime : 0);
      }
      this.stopTurbine();
    }
  }

  // --- HAPTIC FEEDBACK ---
  public vibrate(pattern: number | number[]) {
    if (!this.settings.vibration) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore vibration errors
    }
  }

  // --- MOTOR SOUND (Dynamic pitch with speed) ---
  public startMotor() {
    this.init();
    if (!this.ctx || !this.settings.sound || this.motorOsc) return;

    try {
      this.motorOsc = this.ctx.createOscillator();
      this.motorGain = this.ctx.createGain();
      this.motorFilter = this.ctx.createBiquadFilter();

      this.motorOsc.type = 'sawtooth';
      this.motorOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

      this.motorFilter.type = 'lowpass';
      this.motorFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

      // Start completely silent - gain is 0 until the EUC wheel actually starts moving!
      this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.motorOsc.connect(this.motorFilter);
      this.motorFilter.connect(this.motorGain);
      this.motorGain.connect(this.ctx.destination);

      this.motorOsc.start();
    } catch (e) {
      console.warn('Motor sound error', e);
    }
  }

  public updateMotorSpeed(speedRatio: number, isBoosting: boolean) {
    if (!this.ctx || !this.motorGain) return;
    if (!this.settings.sound || !this.motorOsc) {
      if (this.motorGain) {
        this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      return;
    }

    const t = this.ctx.currentTime;

    // EUC is stopped / idle: completely silent!
    if (speedRatio < 0.04) {
      this.motorGain.gain.setTargetAtTime(0, t, 0.06);
      return;
    }

    // EUC is rolling and riding!
    const effectiveSpeed = Math.min(1, (speedRatio - 0.04) / 0.96);
    const baseFreq = 48 + effectiveSpeed * 150 + (isBoosting ? 65 : 0);
    const filterFreq = 300 + effectiveSpeed * 950 + (isBoosting ? 500 : 0);
    const targetGain = (0.02 + effectiveSpeed * 0.07 + (isBoosting ? 0.035 : 0)) * this.settings.volume;

    if (this.motorOsc) {
      this.motorOsc.frequency.setTargetAtTime(baseFreq, t, 0.04);
    }
    if (this.motorFilter) {
      this.motorFilter.frequency.setTargetAtTime(filterFreq, t, 0.04);
    }
    this.motorGain.gain.setTargetAtTime(targetGain, t, 0.04);
  }

  public stopMotor() {
    if (this.motorGain && this.ctx) {
      try {
        this.motorGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch {
        // ignore
      }
    }
    if (this.motorOsc) {
      try {
        this.motorOsc.stop();
        this.motorOsc.disconnect();
      } catch {
        // ignore
      }
      this.motorOsc = null;
    }
    if (this.motorFilter) {
      try {
        this.motorFilter.disconnect();
      } catch {
        // ignore
      }
      this.motorFilter = null;
    }
    if (this.motorGain) {
      try {
        this.motorGain.disconnect();
      } catch {
        // ignore
      }
      this.motorGain = null;
    }
    this.stopTurbine();
  }

  // --- EUC TURBINE ENGINE AUDIO (Dynamic Spool-up & Wind-down) ---
  private getTurbineNoiseBuffer(): AudioBuffer | null {
    if (this.turbineNoiseBuffer) return this.turbineNoiseBuffer;
    if (!this.ctx) return null;
    try {
      const sampleRate = this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, sampleRate * 2, sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < sampleRate * 2; i++) {
        // Pink-filtered noise for authentic aerodynamic air intake rush
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5 + white * 0.15;
      }
      this.turbineNoiseBuffer = buffer;
      return buffer;
    } catch {
      return null;
    }
  }

  private startTurbineNodes(isSuper: boolean) {
    if (!this.ctx || !this.settings.sound) return;
    if (this.isTurbineRunning && this.turbineGain) {
      if (this.turbineStopTimeout) {
        clearTimeout(this.turbineStopTimeout);
        this.turbineStopTimeout = null;
      }
      return;
    }

    try {
      const t = this.ctx.currentTime;

      // Master turbine output gain
      this.turbineGain = this.ctx.createGain();
      this.turbineGain.gain.setValueAtTime(0.0001, t);
      // Immediate clean ramp up on boost engagement
      const targetGain = Math.max(0.0001, 0.28 * this.settings.volume);
      this.turbineGain.gain.exponentialRampToValueAtTime(targetGain, t + 0.08);
      this.turbineGain.connect(this.ctx.destination);

      // 1. Primary high-RPM turbine whistle (pure sine with stator resonance)
      this.turbineOsc1 = this.ctx.createOscillator();
      this.turbineOsc1.type = 'sine';
      this.turbineOsc1.frequency.setValueAtTime(isSuper ? 460 : 380, t);

      const osc1Gain = this.ctx.createGain();
      osc1Gain.gain.setValueAtTime(0.55, t);
      this.turbineOsc1.connect(osc1Gain);
      osc1Gain.connect(this.turbineGain);
      this.turbineOsc1.start(t);

      // 2. Harmonic overtone (triangle wave for electric blade shimmer)
      this.turbineOsc2 = this.ctx.createOscillator();
      this.turbineOsc2.type = 'triangle';
      this.turbineOsc2.frequency.setValueAtTime((isSuper ? 460 : 380) * 1.5, t);

      const osc2Gain = this.ctx.createGain();
      osc2Gain.gain.setValueAtTime(0.24, t);
      this.turbineOsc2.connect(osc2Gain);
      osc2Gain.connect(this.turbineGain);
      this.turbineOsc2.start(t);

      // 3. Sub-harmonic stator core rumble (low-frequency electric torque)
      this.turbineSubOsc = this.ctx.createOscillator();
      this.turbineSubOsc.type = 'sawtooth';
      this.turbineSubOsc.frequency.setValueAtTime(isSuper ? 130 : 95, t);

      const subFilter = this.ctx.createBiquadFilter();
      subFilter.type = 'lowpass';
      subFilter.frequency.setValueAtTime(450, t);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.2, t);
      this.turbineSubOsc.connect(subFilter);
      subFilter.connect(subGain);
      subGain.connect(this.turbineGain);
      this.turbineSubOsc.start(t);

      // 4. Aerodynamic air rush noise buffer
      const noiseBuffer = this.getTurbineNoiseBuffer();
      if (noiseBuffer) {
        this.turbineNoiseSource = this.ctx.createBufferSource();
        this.turbineNoiseSource.buffer = noiseBuffer;
        this.turbineNoiseSource.loop = true;

        this.turbineNoiseFilter = this.ctx.createBiquadFilter();
        this.turbineNoiseFilter.type = 'bandpass';
        this.turbineNoiseFilter.frequency.setValueAtTime(isSuper ? 1100 : 800, t);
        this.turbineNoiseFilter.Q.setValueAtTime(3.2, t);

        this.turbineNoiseGain = this.ctx.createGain();
        this.turbineNoiseGain.gain.setValueAtTime(0.28, t);

        this.turbineNoiseSource.connect(this.turbineNoiseFilter);
        this.turbineNoiseFilter.connect(this.turbineNoiseGain);
        this.turbineNoiseGain.connect(this.turbineGain);
        this.turbineNoiseSource.start(t);
      }

      this.isTurbineRunning = true;
    } catch (e) {
      console.warn('Turbine sound error', e);
    }
  }

  /**
   * Continuous dynamic turbine audio update called in the game loop.
   * Spools up in pitch when holding boost, winds down and fades out upon release!
   */
  public updateTurbine(isBoosting: boolean, holdDuration: number, isSuper: boolean) {
    if (!this.ctx) return;

    if (!isBoosting || !this.settings.sound) {
      if (this.isTurbineRunning && this.turbineGain) {
        this.windDownTurbine();
      }
      return;
    }

    this.init();
    if (!this.ctx) return;

    // Start nodes if not running
    if (!this.isTurbineRunning) {
      this.startTurbineNodes(isSuper);
    } else if (this.turbineStopTimeout) {
      // If player re-engaged boost while winding down, immediately catch & cancel stop
      clearTimeout(this.turbineStopTimeout);
      this.turbineStopTimeout = null;
      if (this.turbineGain) {
        const t = this.ctx.currentTime;
        const targetGain = Math.max(0.0001, 0.28 * this.settings.volume);
        this.turbineGain.gain.cancelScheduledValues(t);
        this.turbineGain.gain.setTargetAtTime(targetGain, t, 0.05);
      }
    }

    if (!this.turbineGain || !this.turbineOsc1) return;

    const t = this.ctx.currentTime;

    // Dynamic pitch spool-up calculation based on continuous hold duration (0s to 3.0s limit):
    const normalizedHold = Math.min(1.0, holdDuration / 2.6);
    // Smooth responsive spool-up curve: fast initial spool rising to high screaming pitch
    const spoolCurve = 1 - Math.pow(1 - normalizedHold, 1.8);

    const baseWhine = isSuper ? 460 : 380;
    const maxWhine = isSuper ? 2380 : 1850;
    const currentWhineFreq = baseWhine + (maxWhine - baseWhine) * spoolCurve;

    // Air rush filter frequency sweeps from 800 Hz up to 4200 Hz
    const filterFreq = (isSuper ? 1100 : 800) + 3200 * spoolCurve;

    // Sub stator torque frequency climbs from 95 Hz to 310 Hz
    const subFreq = (isSuper ? 130 : 95) + 210 * spoolCurve;

    // Turbine volume intensifies smoothly with hold duration
    const targetVol = (0.26 + 0.12 * spoolCurve) * this.settings.volume;

    // Apply smooth target transitions (0.05s time constant for glitch-free continuous audio)
    this.turbineOsc1.frequency.setTargetAtTime(currentWhineFreq, t, 0.05);
    if (this.turbineOsc2) {
      this.turbineOsc2.frequency.setTargetAtTime(currentWhineFreq * 1.5, t, 0.05);
    }
    if (this.turbineSubOsc) {
      this.turbineSubOsc.frequency.setTargetAtTime(subFreq, t, 0.05);
    }
    if (this.turbineNoiseFilter) {
      this.turbineNoiseFilter.frequency.setTargetAtTime(filterFreq, t, 0.07);
    }
    if (this.turbineGain) {
      this.turbineGain.gain.setTargetAtTime(targetVol, t, 0.05);
    }
  }

  /**
   * Smoothly winds down turbine pitch and fades volume to zero when boost button is released.
   */
  public windDownTurbine() {
    if (!this.ctx || !this.isTurbineRunning || !this.turbineGain) return;
    if (this.turbineStopTimeout) return; // already winding down

    const t = this.ctx.currentTime;
    const fadeDuration = 0.55; // 550ms smooth wind-down & decay

    try {
      // 1. Spool-down pitch drop (turbine decelerates)
      if (this.turbineOsc1) {
        this.turbineOsc1.frequency.setTargetAtTime(220, t, 0.16);
      }
      if (this.turbineOsc2) {
        this.turbineOsc2.frequency.setTargetAtTime(330, t, 0.16);
      }
      if (this.turbineSubOsc) {
        this.turbineSubOsc.frequency.setTargetAtTime(65, t, 0.16);
      }
      if (this.turbineNoiseFilter) {
        this.turbineNoiseFilter.frequency.setTargetAtTime(500, t, 0.18);
      }

      // 2. Smooth volume fade to zero
      this.turbineGain.gain.cancelScheduledValues(t);
      this.turbineGain.gain.setValueAtTime(this.turbineGain.gain.value, t);
      this.turbineGain.gain.exponentialRampToValueAtTime(0.0001, t + fadeDuration);

      // Clean up oscillator nodes after audio has faded completely
      this.turbineStopTimeout = setTimeout(() => {
        this.cleanupTurbineNodes();
      }, fadeDuration * 1000 + 50);
    } catch {
      this.cleanupTurbineNodes();
    }
  }

  /**
   * Immediately stops and cuts turbine audio (for crashes, game over, victory, checkpoint).
   */
  public stopTurbine() {
    if (this.turbineStopTimeout) {
      clearTimeout(this.turbineStopTimeout);
      this.turbineStopTimeout = null;
    }
    if (this.turbineGain && this.ctx) {
      try {
        const t = this.ctx.currentTime;
        this.turbineGain.gain.cancelScheduledValues(t);
        this.turbineGain.gain.setValueAtTime(0, t);
      } catch {
        // ignore
      }
    }
    this.cleanupTurbineNodes();
  }

  private cleanupTurbineNodes() {
    this.isTurbineRunning = false;
    this.turbineStopTimeout = null;

    try {
      if (this.turbineOsc1) {
        this.turbineOsc1.stop();
        this.turbineOsc1.disconnect();
      }
      if (this.turbineOsc2) {
        this.turbineOsc2.stop();
        this.turbineOsc2.disconnect();
      }
      if (this.turbineSubOsc) {
        this.turbineSubOsc.stop();
        this.turbineSubOsc.disconnect();
      }
      if (this.turbineNoiseSource) {
        this.turbineNoiseSource.stop();
        this.turbineNoiseSource.disconnect();
      }
      if (this.turbineNoiseFilter) {
        this.turbineNoiseFilter.disconnect();
      }
      if (this.turbineNoiseGain) {
        this.turbineNoiseGain.disconnect();
      }
      if (this.turbineGain) {
        this.turbineGain.disconnect();
      }
    } catch {
      // ignore
    }

    this.turbineOsc1 = null;
    this.turbineOsc2 = null;
    this.turbineSubOsc = null;
    this.turbineNoiseSource = null;
    this.turbineNoiseFilter = null;
    this.turbineNoiseGain = null;
    this.turbineGain = null;
  }

  // --- SOUND EFFECTS ---
  public playJump() {
    this.vibrate(25);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(420, t + 0.18);

      gain.gain.setValueAtTime(0.25 * this.settings.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.22);
    } catch {
      // ignore
    }
  }

  public playLand(hard = false) {
    this.vibrate(hard ? 45 : 20);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(hard ? 90 : 70, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);

      gain.gain.setValueAtTime((hard ? 0.35 : 0.18) * this.settings.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.16);
    } catch {
      // ignore
    }
  }

  public playVolt() {
    this.vibrate(15);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      [880, 1320].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = t + idx * 0.05;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.3, startTime + 0.08);

        gain.gain.setValueAtTime(0.18 * this.settings.volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.12);
      });
    } catch {
      // ignore
    }
  }

  public playBattery() {
    this.vibrate(30);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const notes = [392, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = t + idx * 0.05;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2 * this.settings.volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.14);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.16);
      });
    } catch {
      // ignore
    }
  }

  public playBoost() {
    this.vibrate(35);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(660, t + 0.25);

      gain.gain.setValueAtTime(0.22 * this.settings.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.3);
    } catch {
      // ignore
    }
  }

  public playSuperBoost() {
    this.vibrate(100);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.4);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.Q.setValueAtTime(4, t);

      gain.gain.setValueAtTime(0.35 * this.settings.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.48);
    } catch {
      // ignore
    }
  }

  public playHit() {
    this.vibrate([60, 40, 60]);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // White noise / thud burst
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.2);

      gain.gain.setValueAtTime(0.4 * this.settings.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.26);
    } catch {
      // ignore
    }
  }

  public playCheckpoint() {
    this.vibrate(35);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const notes = [587.33, 739.99, 880, 1174.66]; // D5, F#5, A5, D6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = t + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.22 * this.settings.volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.22);
      });
    } catch {
      // ignore
    }
  }

  public playWobbleAlert() {
    this.vibrate([40, 30, 40, 30, 40]);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.linearRampToValueAtTime(580, t + 0.08);
      osc.frequency.linearRampToValueAtTime(440, t + 0.16);

      gain.gain.setValueAtTime(0.25 * this.settings.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.26);
    } catch {
      // ignore
    }
  }

  // Realistic EUC Tiltback Warning Beeps (urgent 2000Hz beeps when pedals lift up due to low battery)
  public playTiltbackAlarm() {
    this.vibrate([80, 50, 80, 50, 80]);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const beeps = [0, 0.1, 0.2];
      beeps.forEach((offset) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = t + offset;

        osc.type = 'square';
        osc.frequency.setValueAtTime(2200, start);

        gain.gain.setValueAtTime(0.18 * this.settings.volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.07);
      });
    } catch {
      // ignore
    }
  }

  // Taxi Car Horn (Клаксон такси)
  public playTaxiHonk() {
    this.vibrate(50);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // Classic dual-tone car horn (F4 349Hz and A4 440Hz), 2 quick bursts
      const honks = [
        { start: t, dur: 0.11 },
        { start: t + 0.16, dur: 0.22 },
      ];
      honks.forEach((honk) => {
        if (!this.ctx) return;
        [370, 465].forEach((freq) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, honk.start);
          gain.gain.setValueAtTime(0.22 * this.settings.volume, honk.start);
          gain.gain.exponentialRampToValueAtTime(0.001, honk.start + honk.dur);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(honk.start);
          osc.stop(honk.start + honk.dur + 0.02);
        });
      });
    } catch {
      // ignore
    }
  }

  // Helper to pick a deep/rough male voice from available system voices
  private getMaleRussianVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // First search for Russian male voices
    const ruVoices = voices.filter((v) => v.lang.startsWith('ru') || v.lang.includes('RU'));
    const maleRu = ruVoices.find((v) => {
      const name = v.name.toLowerCase();
      return (
        name.includes('male') ||
        name.includes('man') ||
        name.includes('dmitry') ||
        name.includes('pavel') ||
        name.includes('aleksandr') ||
        name.includes('yuri') ||
        name.includes('maxim') ||
        name.includes('ivan') ||
        name.includes('boris')
      );
    });
    if (maleRu) return maleRu;

    // Next filter out explicit female voices among RU voices
    const nonFemaleRu = ruVoices.find((v) => {
      const name = v.name.toLowerCase();
      return (
        !name.includes('female') &&
        !name.includes('woman') &&
        !name.includes('milena') &&
        !name.includes('alena') &&
        !name.includes('tatyana') &&
        !name.includes('victoria') &&
        !name.includes('irina') &&
        !name.includes('anna') &&
        !name.includes('elena') &&
        !name.includes('zira')
      );
    });
    if (nonFemaleRu) return nonFemaleRu;

    return ruVoices[0] || null;
  }

  // Taxi driver voice shout with rough, low male broken Russian / Tajik accent
  public speakTaxiVoice(phrase = 'Э-э, братуха, куда прёшь, давай до свидания!') {
    if (!this.settings.sound) return;
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(phrase);
        utter.lang = 'ru-RU';
        // Deep, rough, lower pitch to guarantee masculine aggressive timbre (pitch 0.65 - 0.72)
        utter.rate = 1.05;
        utter.pitch = 0.68;
        utter.volume = Math.min(1, this.settings.volume * 1.5);
        const maleVoice = this.getMaleRussianVoice();
        if (maleVoice) {
          utter.voice = maleVoice;
        }
        window.speechSynthesis.speak(utter);
      }
    } catch {
      // ignore
    }
  }

  // Taxi driver comical rough crash cry when the car is smashed
  public speakTaxiSmashVoice() {
    this.vibrate([70, 50, 70]);
    if (!this.settings.sound) return;
    this.init();

    // 1. Play deep cartoon/engine crunch and fall sound in Web Audio
    if (this.ctx) {
      try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        // Low rough pitch drop
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.38);
        gain.gain.setValueAtTime(0.32 * this.settings.volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.42);
      } catch {
        // ignore
      }
    }

    // 2. Rough male shouting voice with heavy Tajik broken Russian accent
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const phrases = [
          'Эй! Вах, машына сломал, брат!',
          'Эй! Куда лезешь, машына разбил!',
          'Э-э, вах! Машына в хлам, эй!',
          'Эй! Ты што сдэлал, э, машына новый был!',
        ];
        const chosen = phrases[Math.floor(Math.random() * phrases.length)];
        const utter = new SpeechSynthesisUtterance(chosen);
        utter.lang = 'ru-RU';
        // Deep masculine rough pitch
        utter.rate = 1.1;
        utter.pitch = 0.65;
        utter.volume = Math.min(1, this.settings.volume * 1.5);
        const maleVoice = this.getMaleRussianVoice();
        if (maleVoice) {
          utter.voice = maleVoice;
        }
        window.speechSynthesis.speak(utter);
      }
    } catch {
      // ignore
    }
  }

  // Electric fast-charging station sound (futuristic power-up chords + hum)
  public playChargeStation() {
    this.vibrate([40, 20, 40, 20, 80]);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const freqs = [330, 440, 660, 880, 1320]; // E4, A4, E5, A5, E6
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = t + idx * 0.05;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + 0.3);

        gain.gain.setValueAtTime(0.24 * this.settings.volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.36);
      });
    } catch {
      // ignore
    }
  }

  // Mario-style smash and bounce when stomping obstacles
  public playSmash() {
    this.vibrate([60, 40, 80]);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // 1. Heavy crunch/impact
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(340, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.18);

      gain.gain.setValueAtTime(0.45 * this.settings.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);

      // 2. High Mario spring bounce sound (rising sine)
      const bounceOsc = this.ctx.createOscillator();
      const bounceGain = this.ctx.createGain();
      bounceOsc.type = 'sine';
      bounceOsc.frequency.setValueAtTime(400, t + 0.04);
      bounceOsc.frequency.exponentialRampToValueAtTime(980, t + 0.22);

      bounceGain.gain.setValueAtTime(0.35 * this.settings.volume, t + 0.04);
      bounceGain.gain.exponentialRampToValueAtTime(0.01, t + 0.26);
      bounceOsc.connect(bounceGain);
      bounceGain.connect(this.ctx.destination);
      bounceOsc.start(t + 0.04);
      bounceOsc.stop(t + 0.26);
    } catch {
      // ignore
    }
  }

  // Neon Skeleton Death transformation sound (electric zap + eerie descending bone chimes)
  public playSkeletonDeath() {
    this.vibrate([100, 50, 150, 50, 200]);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // 1. High electric discharge zap
      const zapOsc = this.ctx.createOscillator();
      const zapGain = this.ctx.createGain();
      zapOsc.type = 'sawtooth';
      zapOsc.frequency.setValueAtTime(880, t);
      zapOsc.frequency.exponentialRampToValueAtTime(80, t + 0.35);

      zapGain.gain.setValueAtTime(0.4 * this.settings.volume, t);
      zapGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      zapOsc.connect(zapGain);
      zapGain.connect(this.ctx.destination);
      zapOsc.start(t);
      zapOsc.stop(t + 0.4);

      // 2. Bone clinking rattling cascade (triangle chirps)
      const pitches = [523.25, 466.16, 392.0, 329.63, 261.63, 196.0];
      pitches.forEach((f, idx) => {
        if (!this.ctx) return;
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        const st = t + 0.08 + idx * 0.07;
        bOsc.type = 'triangle';
        bOsc.frequency.setValueAtTime(f, st);
        bGain.gain.setValueAtTime(0.25 * this.settings.volume, st);
        bGain.gain.exponentialRampToValueAtTime(0.001, st + 0.12);
        bOsc.connect(bGain);
        bGain.connect(this.ctx.destination);
        bOsc.start(st);
        bOsc.stop(st + 0.14);
      });
    } catch {
      // ignore
    }
  }

  // EUC Speed limit exceed warning beep (iconic dual electronic beep)
  public playSpeedAlert() {
    this.vibrate([35, 30, 35]);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // Dual high-frequency beeps: 1800Hz then 2200Hz
      [1800, 2200].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = t + idx * 0.09;

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2 * this.settings.volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.07);
      });
    } catch {
      // ignore
    }
  }

  // Boost hold overload warning: pitch and urgency rise as time approaches 3.0 seconds
  public playBoostWarning(durationSec: number) {
    this.vibrate(40);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Pitch rises from 2000Hz up to 3200Hz
      const progress = Math.min(1, Math.max(0, (durationSec - 1.5) / 1.5));
      const freq = 2000 + progress * 1200;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq + 300, t + 0.06);

      gain.gain.setValueAtTime((0.15 + progress * 0.2) * this.settings.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.08);
    } catch {
      // ignore
    }
  }

  // EUC Cutout (продав колеса): rapid overload beeps, electrical blackout zap, and mechanical crash
  public playCutout() {
    this.vibrate([80, 40, 100, 40, 180]);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;

      // 1. Rapid frantic overload alarm beeps (3200Hz)
      [0, 0.05, 0.1].forEach((delay) => {
        if (!this.ctx) return;
        const beepOsc = this.ctx.createOscillator();
        const beepGain = this.ctx.createGain();
        beepOsc.type = 'sawtooth';
        beepOsc.frequency.setValueAtTime(3200, t + delay);
        beepGain.gain.setValueAtTime(0.35 * this.settings.volume, t + delay);
        beepGain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.04);
        beepOsc.connect(beepGain);
        beepGain.connect(this.ctx.destination);
        beepOsc.start(t + delay);
        beepOsc.stop(t + delay + 0.045);
      });

      // 2. High-voltage power cut arc / zap
      const zapOsc = this.ctx.createOscillator();
      const zapGain = this.ctx.createGain();
      zapOsc.type = 'sawtooth';
      zapOsc.frequency.setValueAtTime(1400, t + 0.14);
      zapOsc.frequency.exponentialRampToValueAtTime(40, t + 0.45);
      zapGain.gain.setValueAtTime(0.5 * this.settings.volume, t + 0.14);
      zapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      zapOsc.connect(zapGain);
      zapGain.connect(this.ctx.destination);
      zapOsc.start(t + 0.14);
      zapOsc.stop(t + 0.52);

      // 3. Heavy impact & asphalt friction scrape
      const scrapeOsc = this.ctx.createOscillator();
      const scrapeGain = this.ctx.createGain();
      scrapeOsc.type = 'triangle';
      scrapeOsc.frequency.setValueAtTime(220, t + 0.2);
      scrapeOsc.frequency.linearRampToValueAtTime(80, t + 0.55);
      scrapeGain.gain.setValueAtTime(0.4 * this.settings.volume, t + 0.2);
      scrapeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      scrapeOsc.connect(scrapeGain);
      scrapeGain.connect(this.ctx.destination);
      scrapeOsc.start(t + 0.2);
      scrapeOsc.stop(t + 0.62);
    } catch {
      // ignore
    }
  }

  public playTrickSuccess() {
    this.vibrate(30);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, t);
      osc.frequency.exponentialRampToValueAtTime(987.77, t + 0.15);

      gain.gain.setValueAtTime(0.25 * this.settings.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.22);
    } catch {
      // ignore
    }
  }

  // Smile Bonus sound: joyous melodic dual rising chime + playful sparkle
  public playSmileBonus() {
    this.vibrate([25, 30, 40]);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, t); // C5
      osc1.frequency.exponentialRampToValueAtTime(1046.5, t + 0.18); // C6
      osc2.frequency.setValueAtTime(659.25, t); // E5
      osc2.frequency.exponentialRampToValueAtTime(1318.51, t + 0.18); // E6

      gain.gain.setValueAtTime(0.32 * this.settings.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.3);
      osc2.stop(t + 0.3);
    } catch {
      // ignore
    }
  }

  // Funny gnome laugh from drone ("хи-хи-хи! хи-хи!")
  public speakGnomeLaugh() {
    this.vibrate([15, 20, 15, 20, 30]);

    // 1. Synthesized cheeky high-pitched squeaky giggle pulses
    if (this.settings.sound) {
      this.init();
      if (this.ctx) {
        try {
          const t = this.ctx.currentTime;
          const giggles = [880, 1108, 987, 1318, 1174, 1567]; // Squeaky rapid arpeggiated laughter
          giggles.forEach((freq, idx) => {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = t + idx * 0.065;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.3, start + 0.05);

            gain.gain.setValueAtTime(0.3 * this.settings.volume, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.06);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(start);
            osc.stop(start + 0.065);
          });
        } catch {
          // ignore
        }
      }
    }

    // 2. High-pitched squeaky funny cartoon gnome speech synthesis
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const laughs = [
          'Хи-хи-хи! Попал, хи-хи!',
          'Хи-хи-хи-хи! Лови какашку!',
          'Хи-хи-хи! Прямо в Сёму, хи-хи!',
          'Хи-хи-хи! Получи, хи-хи!',
        ];
        const chosen = laughs[Math.floor(Math.random() * laughs.length)];
        const utter = new SpeechSynthesisUtterance(chosen);
        utter.lang = 'ru-RU';
        utter.pitch = 2.0; // High squeaky funny gnome voice!
        utter.rate = 1.45; // Fast cheeky laughter speed
        utter.volume = Math.min(1, this.settings.volume * 1.5);
        window.speechSynthesis.speak(utter);
      }
    } catch {
      // ignore
    }
  }

  // Wet cartoon poop drop sound
  public playPoopDropSound() {
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);
      gain.gain.setValueAtTime(0.24 * this.settings.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch {
      // ignore
    }
  }

  // Wet cartoon poop splat sound
  public playPoopSplatSound() {
    this.vibrate([40, 50]);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(65, t + 0.18);
      gain.gain.setValueAtTime(0.38 * this.settings.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    } catch {
      // ignore
    }
  }

  // Level Transition sound: ascending celebratory electronic chime chords
  public playLevelTransition() {
    this.vibrate([40, 50, 80]);
    if (!this.settings.sound) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // Arpeggiated triumphant chime: 523Hz (C5), 659Hz (E5), 784Hz (G5), 1046Hz (C6)
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = t + idx * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.3 * this.settings.volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.38);
      });
    } catch {
      // ignore
    }
  }

  // --- MUSIC PLAYBACK (Audio file + Procedural Phonk Synth Fallback) ---
  public async startMusic() {
    this.init();
    if (!this.settings.music || this.isMusicPlaying) return;

    if (!this.isInitAudioDone) {
      await this.initAudioTrack();
    }

    this.isMusicPlaying = true;

    // 1. Try real audio track (custom uploaded or /music.mp3)
    if (this.customAudioUrl) {
      try {
        if (!this.bgAudio) {
          this.bgAudio = new Audio(this.customAudioUrl);
          this.bgAudio.loop = true;
        } else if (this.bgAudio.src !== this.customAudioUrl) {
          this.bgAudio.src = this.customAudioUrl;
          this.bgAudio.loop = true;
        }
        this.bgAudio.volume = 0.75 * this.settings.volume;
        await this.bgAudio.play();
        return;
      } catch (e) {
        console.warn('Real audio play deferred or failed, running phonk synth fallback:', e);
      }
    }

    // 2. Fallback: procedural phonk synth ("Неоновые кости")
    this.startProceduralPhonkSynth();
  }

  private startProceduralPhonkSynth() {
    if (!this.ctx || !this.settings.music) return;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }

    this.musicStep = 0;
    // 130 BPM Phonk tempo: (60 / 130) / 4 * 1000 ~ 115.4ms
    const stepTime = 115;

    // Heavy 808 Sub-bass: D1 (36.7), F1 (43.6), G1 (49.0), A1 (55.0)
    const bassline = [
      36.7, 0, 36.7, 0,  43.6, 0, 43.6, 0,
      49.0, 0, 49.0, 0,  55.0, 0, 36.7, 43.6,
    ];

    // Dark Phonk Cowbell ("Неоновые кости" hook): D5 (587), F5 (698), G5 (784), C5 (523)
    const cowbellNotes = [
      587.3, 0, 698.5, 0,  784.0, 0, 698.5, 0,
      587.3, 0, 523.3, 0,  587.3, 0, 698.5, 0,
    ];

    this.musicInterval = window.setInterval(() => {
      if (!this.isMusicPlaying || !this.ctx || !this.settings.music) return;
      const t = this.ctx.currentTime;
      const step16 = this.musicStep % 16;

      // 1. HARD 808 KICK (Steps 0, 4, 8, 12)
      if (step16 % 4 === 0) {
        try {
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();
          kickOsc.frequency.setValueAtTime(155, t);
          kickOsc.frequency.exponentialRampToValueAtTime(32, t + 0.09);
          kickGain.gain.setValueAtTime(0.32 * this.settings.volume, t);
          kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          kickOsc.connect(kickGain);
          kickGain.connect(this.ctx.destination);
          kickOsc.start(t);
          kickOsc.stop(t + 0.13);
        } catch {
          // ignore
        }
      }

      // 2. CRUNCHY PHONK SNARE / CLAP (Steps 4, 12)
      if (step16 === 4 || step16 === 12) {
        try {
          const snareOsc = this.ctx.createOscillator();
          const snareGain = this.ctx.createGain();
          snareOsc.type = 'triangle';
          snareOsc.frequency.setValueAtTime(240, t);
          snareGain.gain.setValueAtTime(0.22 * this.settings.volume, t);
          snareGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
          snareOsc.connect(snareGain);
          snareGain.connect(this.ctx.destination);
          snareOsc.start(t);
          snareOsc.stop(t + 0.11);
        } catch {
          // ignore
        }
      }

      // 3. ROLLING PHONK HI-HAT (Continuous 16ths with velocity accents)
      try {
        const hatOsc = this.ctx.createOscillator();
        const hatGain = this.ctx.createGain();
        hatOsc.type = 'square';
        hatOsc.frequency.setValueAtTime(8500 + (step16 % 4 === 2 ? 1200 : 0), t);
        const hatVol = (step16 % 2 === 0 ? 0.05 : 0.025) * this.settings.volume;
        hatGain.gain.setValueAtTime(hatVol, t);
        hatGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
        hatOsc.connect(hatGain);
        hatGain.connect(this.ctx.destination);
        hatOsc.start(t);
        hatOsc.stop(t + 0.04);
      } catch {
        // ignore
      }

      // 4. SATURATED 808 SUB-BASS
      const bassFreq = bassline[step16];
      if (bassFreq > 0) {
        try {
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bassOsc.type = 'sawtooth';
          bassOsc.frequency.setValueAtTime(bassFreq, t);

          const bassFilter = this.ctx.createBiquadFilter();
          bassFilter.type = 'lowpass';
          bassFilter.frequency.setValueAtTime(240, t);

          bassGain.gain.setValueAtTime(0.2 * this.settings.volume, t);
          bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

          bassOsc.connect(bassFilter);
          bassFilter.connect(bassGain);
          bassGain.connect(this.ctx.destination);

          bassOsc.start(t);
          bassOsc.stop(t + 0.19);
        } catch {
          // ignore
        }
      }

      // 5. PHONK COWBELL ("Неоновые кости")
      const bellFreq = cowbellNotes[step16];
      if (bellFreq > 0) {
        try {
          const bellOsc = this.ctx.createOscillator();
          const bellGain = this.ctx.createGain();
          bellOsc.type = 'square';
          bellOsc.frequency.setValueAtTime(bellFreq, t);

          const bellFilter = this.ctx.createBiquadFilter();
          bellFilter.type = 'bandpass';
          bellFilter.frequency.setValueAtTime(bellFreq * 1.25, t);
          bellFilter.Q.setValueAtTime(7, t);

          bellGain.gain.setValueAtTime(0.14 * this.settings.volume, t);
          bellGain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

          bellOsc.connect(bellFilter);
          bellFilter.connect(bellGain);
          bellGain.connect(this.ctx.destination);

          bellOsc.start(t);
          bellOsc.stop(t + 0.15);
        } catch {
          // ignore
        }
      }

      this.musicStep++;
    }, stepTime);
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.bgAudio) {
      try {
        this.bgAudio.pause();
        this.bgAudio.currentTime = 0;
      } catch {
        // ignore
      }
    }
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  public stopAll() {
    this.stopMotor();
    this.stopMusic();
  }
}

export const soundManager = new SoundManager();
