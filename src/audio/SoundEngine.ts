/**
 * 基于 Web Audio API 的全程序实时音效合成器
 * 无需加载外部音频文件，纯合成电梯机械按键、电机、滑门、到站叮咚、警铃与换气扇音效
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;

  // Continuous motor synth nodes
  private motorOsc: OscillatorNode | null = null;
  private motorSubOsc: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;

  // Continuous ventilation fan noise nodes
  private fanGain: GainNode | null = null;
  private fanOn = false;

  // Continuous distant rain-on-glass ambiance
  private rainGain: GainNode | null = null;
  private rainOn = true;

  // Alarm interval
  private alarmActive = false;
  private alarmTimer: number | null = null;

  // Elevator Voice Announcer (Web Audio API decoded MP3 for 100% iPad Safari reliability)
  private voiceBus: GainNode | null = null;
  private voiceUrls = new Map<string, string>();
  private readonly voiceBuffers = new Map<string, AudioBuffer>();
  private readonly voiceLoading = new Map<string, Promise<AudioBuffer | null>>();
  private currentVoiceSource: AudioBufferSourceNode | null = null;
  private currentVoiceEndTime = 0;
  private voiceTimers: number[] = [];
  private voiceManifestPromise: Promise<void>;

  constructor() {
    this.voiceManifestPromise = this.loadVoiceManifest();
  }

  private async loadVoiceManifest(): Promise<void> {
    try {
      const res = await fetch(`/audio/voice/manifest.json?t=${Date.now()}`);
      if (!res.ok) return;
      const data = (await res.json()) as { clips?: Record<string, string> };
      if (data?.clips) {
        Object.entries(data.clips).forEach(([id, url]) => {
          this.voiceUrls.set(id, url);
        });
      }
    } catch {
      // Optional voice clips
    }
  }

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.7;
      this.masterGain.connect(this.ctx.destination);
      this.setupMotorLoop();
      this.setupFanLoop();
      this.setupRainLoop();
      this.setupVoiceBus();

      // Preload core frequent announcements once audio is unlocked
      void this.preloadVoice('door-closing');
      void this.preloadVoice('going-up');
      void this.preloadVoice('going-down');
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  private setupVoiceBus(): void {
    if (!this.ctx || !this.masterGain) return;
    // Subtle cabin ceiling-speaker EQ: clean voice presence without harshness
    const gain = this.ctx.createGain();
    gain.gain.value = 1.18;

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 180;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 7200;

    gain.connect(hp);
    hp.connect(lp);
    lp.connect(this.masterGain);
    this.voiceBus = gain;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.7, this.ctx.currentTime, 0.04);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private setupMotorLoop(): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    subOsc.type = 'sine';
    subOsc.frequency.value = 38;

    filter.type = 'lowpass';
    filter.frequency.value = 140;
    filter.Q.value = 1.2;

    gain.gain.value = 0;

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    subOsc.start();

    this.motorOsc = osc;
    this.motorSubOsc = subOsc;
    this.motorGain = gain;
  }

  private setupFanLoop(): void {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 340;
    filter.Q.value = 0.8;

    const gain = this.ctx.createGain();
    gain.gain.value = 0;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start();

    this.fanGain = gain;
  }

  private setupRainLoop(): void {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 3;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    // Pink-ish soft rain noise
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.035) * 0.9;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1350;

    const gain = this.ctx.createGain();
    gain.gain.value = this.rainOn ? 0.045 : 0;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start();

    this.rainGain = gain;
  }

  public setRainAmbiance(on: boolean): void {
    this.rainOn = on;
    if (!this.ctx || !this.rainGain) return;
    this.rainGain.gain.setTargetAtTime(on ? 0.045 : 0, this.ctx.currentTime, 0.45);
  }

  /**
   * 按钮机械微动开关清脆“咔哒”声
   */
  public playButtonClick(pitchMultiplier = 1): void {
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Tactile click transient
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1150 * pitchMultiplier, now);
    osc.frequency.exponentialRampToValueAtTime(240 * pitchMultiplier, now + 0.032);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.042);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.045);

    // Subtle electronic confirm beep
    const beep = this.ctx.createOscillator();
    const beepGain = this.ctx.createGain();
    beep.type = 'sine';
    beep.frequency.setValueAtTime(1760 * pitchMultiplier, now + 0.015);
    beepGain.gain.setValueAtTime(0.055, now + 0.015);
    beepGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.09);

    beep.connect(beepGain);
    beepGain.connect(this.masterGain);
    beep.start(now + 0.015);
    beep.stop(now + 0.095);
  }

  /**
   * 取消已选楼层的双短低音提示
   */
  public playCancelClick(): void {
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.setValueAtTime(460, now + 0.06);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * 继电器灯光切换“啪嗒”声
   */
  public playRelaySwitch(): void {
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.045);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * 电梯门滑轨滑动音效
   */
  public playDoorMove(opening: boolean): void {
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const duration = 1.15;

    // Filtered noise for mechanical sliding rails
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(opening ? 180 : 240, now);
    filter.frequency.linearRampToValueAtTime(opening ? 270 : 150, now + duration);
    filter.Q.value = 2.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.18);
    gain.gain.setValueAtTime(0.11, now + duration - 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + duration);

    // Subtle metallic thud on door close finish
    if (!opening) {
      const thud = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(95, now + duration - 0.06);
      thud.frequency.exponentialRampToValueAtTime(38, now + duration + 0.07);

      thudGain.gain.setValueAtTime(0.001, now + duration - 0.07);
      thudGain.gain.linearRampToValueAtTime(0.24, now + duration - 0.05);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.09);

      thud.connect(thudGain);
      thudGain.connect(this.masterGain);
      thud.start(now + duration - 0.07);
      thud.stop(now + duration + 0.1);
    }
  }

  /**
   * 经典电梯到站双音阶“叮—咚”提示音
   * direction >= 0 (上行): 叮(高) -> 咚(更高) 或标准大三度上行
   * direction < 0  (下行): 高 -> 低
   */
  public playArrivalChime(direction: -1 | 0 | 1): void {
    this.unlock();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const notes = direction < 0 ? [880, 659.25] : [659.25, 880]; // E5 <-> A5
    notes.forEach((freq, i) => {
      const start = now + i * 0.26;
      const osc = this.ctx!.createOscillator();
      const harmonic = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      harmonic.type = 'sine';
      harmonic.frequency.setValueAtTime(freq * 2, start);

      const harmGain = this.ctx!.createGain();
      harmGain.gain.value = 0.16;

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.26, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + 1.05);

      osc.connect(gain);
      harmonic.connect(harmGain);
      harmGain.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(start);
      harmonic.start(start);
      osc.stop(start + 1.1);
      harmonic.stop(start + 1.1);
    });
  }

  /**
   * 根据电梯实时速度动态调制曳引机低频嗡鸣
   */
  public updateMotor(normalizedSpeed: number): void {
    if (!this.ctx || !this.motorOsc || !this.motorSubOsc || !this.motorGain) return;
    const clamped = Math.min(1, Math.max(0, Math.abs(normalizedSpeed)));
    const now = this.ctx.currentTime;
    this.motorOsc.frequency.setTargetAtTime(46 + clamped * 44, now, 0.08);
    this.motorSubOsc.frequency.setTargetAtTime(30 + clamped * 22, now, 0.08);
    this.motorGain.gain.setTargetAtTime(clamped * 0.095, now, 0.1);
  }

  /**
   * 开关顶部换气扇轻柔风声
   */
  public setFan(on: boolean): void {
    this.unlock();
    this.fanOn = on;
    if (!this.ctx || !this.fanGain) return;
    this.fanGain.gain.setTargetAtTime(this.fanOn ? 0.055 : 0, this.ctx.currentTime, 0.35);
  }

  /**
   * 切换紧急警铃声音
   */
  public setAlarm(active: boolean): void {
    this.unlock();
    this.alarmActive = active;
    if (this.alarmTimer !== null) {
      window.clearInterval(this.alarmTimer);
      this.alarmTimer = null;
    }
    if (active) {
      this.triggerAlarmPulse();
      this.alarmTimer = window.setInterval(() => {
        if (this.alarmActive) this.triggerAlarmPulse();
      }, 650);
    }
  }

  private triggerAlarmPulse(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(840, now);
    osc2.frequency.setValueAtTime(1120, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 3;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.02);
    gain.gain.setValueAtTime(0.14, now + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.38);
    osc2.stop(now + 0.38);
  }

  /**
   * 预加载并解码指定语音 MP3 到 AudioBuffer 缓存
   */
  public async preloadVoice(clipId: string): Promise<AudioBuffer | null> {
    if (this.voiceBuffers.has(clipId)) {
      return this.voiceBuffers.get(clipId)!;
    }
    if (this.voiceLoading.has(clipId)) {
      return this.voiceLoading.get(clipId)!;
    }

    const promise = (async () => {
      await this.voiceManifestPromise;
      const url = this.voiceUrls.get(clipId);
      if (!url || !this.ctx) return null;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const arrBuf = await res.arrayBuffer();
        const audioBuf = await this.ctx.decodeAudioData(arrBuf);
        this.voiceBuffers.set(clipId, audioBuf);
        return audioBuf;
      } catch {
        return null;
      } finally {
        this.voiceLoading.delete(clipId);
      }
    })();

    this.voiceLoading.set(clipId, promise);
    return promise;
  }

  /**
   * 清除当前播放与排队中的语音
   */
  public stopVoice(): void {
    this.voiceTimers.forEach((t) => window.clearTimeout(t));
    this.voiceTimers = [];
    if (this.currentVoiceSource) {
      try {
        this.currentVoiceSource.stop();
      } catch {
        // Already stopped
      }
      this.currentVoiceSource = null;
    }
    this.currentVoiceEndTime = 0;
  }

  /**
   * 播放电梯中文语音播报（通过 Web Audio API 播放，桌面与 iPad Safari 均稳定生效）
   */
  public playVoice(
    clipId: string,
    options?: { delayMs?: number; interrupt?: boolean; queueAfterCurrent?: boolean }
  ): void {
    this.unlock();
    if (!this.ctx || !this.voiceBus) return;

    const interrupt = options?.interrupt ?? false;
    const queueAfterCurrent = options?.queueAfterCurrent ?? false;
    const baseDelayMs = options?.delayMs ?? 0;

    if (interrupt) {
      this.stopVoice();
    }

    let finalDelayMs = baseDelayMs;
    if (queueAfterCurrent && this.ctx.currentTime < this.currentVoiceEndTime) {
      const remainMs = Math.ceil((this.currentVoiceEndTime - this.ctx.currentTime) * 1000);
      finalDelayMs = Math.max(baseDelayMs, remainMs + 140);
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        if (!this.ctx || !this.voiceBus) return;
        const buf = await this.preloadVoice(clipId);
        if (!buf || !this.ctx || !this.voiceBus) return;

        // Avoid overlapping two voices simultaneously
        if (this.currentVoiceSource && this.ctx.currentTime < this.currentVoiceEndTime - 0.05) {
          try {
            this.currentVoiceSource.stop();
          } catch {
            // ignore
          }
        }

        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.voiceBus);
        const startAt = this.ctx.currentTime;
        src.start(startAt);
        this.currentVoiceSource = src;
        this.currentVoiceEndTime = startAt + buf.duration;
      })();
    }, finalDelayMs);

    this.voiceTimers.push(timer);
  }
}
