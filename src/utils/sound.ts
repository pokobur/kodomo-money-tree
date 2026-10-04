// ============================================================
// マネーツリー - 効果音マネージャー (sound.ts)
// Web Audio API を活用した音声合成（外部音声ファイル不要）
// ============================================================

export type SoundName =
  | 'coin'
  | 'success'
  | 'water'
  | 'harvest'
  | 'levelup'
  | 'error'
  | 'tap'
  | 'celebrate';

/**
 * Web Audio API を使った効果音管理シングルトンクラス
 */
export class SoundManager {
  private static instance: SoundManager | null = null;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.5;
  private muted: boolean = false;

  private constructor() {
    // ローカルストレージから音量・ミュート状態を復元
    if (typeof window !== 'undefined') {
      try {
        const savedVolume = localStorage.getItem('money_tree_sound_volume');
        if (savedVolume !== null) {
          const v = parseFloat(savedVolume);
          if (!isNaN(v)) {
            this.volume = Math.max(0, Math.min(1, v));
          }
        }
        const savedMuted = localStorage.getItem('money_tree_sound_muted');
        if (savedMuted !== null) {
          this.muted = savedMuted === 'true';
        }
      } catch {
        // ストレージアクセス制限時のフォールバック
      }
    }
  }

  /**
   * シングルトンインスタンスの取得
   */
  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * AudioContextの遅延初期化と自動再開
   */
  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) return null;

      try {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(
          this.muted ? 0 : this.volume,
          this.ctx.currentTime
        );
        this.masterGain.connect(this.ctx.destination);
      } catch (e) {
        console.warn('AudioContext の作成に失敗しました:', e);
        return null;
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * 音量の設定 (0.0 〜 1.0)
   */
  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('money_tree_sound_volume', String(this.volume));
      } catch {}
    }
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  /**
   * 現在の音量を取得
   */
  public getVolume(): number {
    return this.volume;
  }

  /**
   * ミュート設定の切り替え
   */
  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('money_tree_sound_muted', String(this.muted));
      } catch {}
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime
      );
    }
  }

  /**
   * ミュート状態かどうかの取得
   */
  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * 指定した名前の効果音を再生
   */
  public play(name: SoundName): void {
    if (this.muted || this.volume <= 0) return;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    try {
      switch (name) {
        case 'coin':
          this.playCoin(ctx, this.masterGain);
          break;
        case 'success':
          this.playSuccess(ctx, this.masterGain);
          break;
        case 'water':
          this.playWater(ctx, this.masterGain);
          break;
        case 'harvest':
          this.playHarvest(ctx, this.masterGain);
          break;
        case 'levelup':
          this.playLevelUp(ctx, this.masterGain);
          break;
        case 'error':
          this.playError(ctx, this.masterGain);
          break;
        case 'tap':
          this.playTap(ctx, this.masterGain);
          break;
        case 'celebrate':
          this.playCelebrate(ctx, this.masterGain);
          break;
      }
    } catch (e) {
      console.warn(`効果音 [${name}] の再生中にエラーが発生しました:`, e);
    }
  }

  // ------------------------------------------------------------
  // 各効果音の合成ロジック
  // ------------------------------------------------------------

  /**
   * 'coin' - 上昇アルペジオ (C5 → E5 → G5 の軽快なコイン音)
   */
  private playCoin(ctx: AudioContext, out: AudioNode): void {
    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, offset: 0.00, dur: 0.12, gain: 0.35 }, // C5
      { freq: 659.25, offset: 0.06, dur: 0.12, gain: 0.38 }, // E5
      { freq: 783.99, offset: 0.12, dur: 0.38, gain: 0.42 }, // G5
    ];

    notes.forEach(({ freq, offset, dur, gain: peakGain }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);

      const startTime = now + offset;
      const endTime = startTime + dur;

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc.connect(gain);
      gain.connect(out);

      osc.start(startTime);
      osc.stop(endTime);
    });
  }

  /**
   * 'success' - 誇らしげなファンファーレ (メジャーコードの上昇)
   */
  private playSuccess(ctx: AudioContext, out: AudioNode): void {
    const now = ctx.currentTime;
    const sequence = [
      { freq: 523.25, offset: 0.00, dur: 0.14, gain: 0.3 }, // C5
      { freq: 659.25, offset: 0.12, dur: 0.14, gain: 0.3 }, // E5
      { freq: 783.99, offset: 0.24, dur: 0.14, gain: 0.35 }, // G5
    ];

    sequence.forEach(({ freq, offset, dur, gain: peakGain }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + offset);

      const startTime = now + offset;
      const endTime = startTime + dur;

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc.connect(gain);
      gain.connect(out);

      osc.start(startTime);
      osc.stop(endTime);
    });

    // 締めくくりのハーモニーコード (C6 + E6)
    const chordTime = now + 0.36;
    const chordDur = 0.55;
    [1046.50, 1318.51].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, chordTime);

      gain.gain.setValueAtTime(0.0001, chordTime);
      gain.gain.linearRampToValueAtTime(0.28, chordTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, chordTime + chordDur);

      osc.connect(gain);
      gain.connect(out);

      osc.start(chordTime);
      osc.stop(chordTime + chordDur);
    });
  }

  /**
   * 'water' - 水やりスプラッシュ (ローパスフィルターを通したホワイトノイズ＋水滴ピッチ)
   */
  private playWater(ctx: AudioContext, out: AudioNode): void {
    const now = ctx.currentTime;
    const splashDuration = 0.42;

    // 1. ノイズバッファの生成（水しぶき音）
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * splashDuration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // 後半にかけてなだらかに減衰する乱数ノイズ
      const progress = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - progress, 1.5);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // 水の質感を出すローパスフィルター (1400Hz → 300Hz へスイープ)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + splashDuration);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + splashDuration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(out);

    noise.start(now);

    // 2. 水滴の「ポチャン」というピッチ上昇スイープ音
    const dropletOsc = ctx.createOscillator();
    const dropletGain = ctx.createGain();

    dropletOsc.type = 'sine';
    dropletOsc.frequency.setValueAtTime(450, now);
    dropletOsc.frequency.exponentialRampToValueAtTime(950, now + 0.09);
    dropletOsc.frequency.exponentialRampToValueAtTime(520, now + 0.28);

    dropletGain.gain.setValueAtTime(0.0001, now);
    dropletGain.gain.linearRampToValueAtTime(0.22, now + 0.02);
    dropletGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    dropletOsc.connect(dropletGain);
    dropletGain.connect(out);

    dropletOsc.start(now);
    dropletOsc.stop(now + 0.28);
  }

  /**
   * 'harvest' - 収穫の魔法のベルチャイム (高音ベル＋リバーブディレイ)
   */
  private playHarvest(ctx: AudioContext, out: AudioNode): void {
    const now = ctx.currentTime;

    // リバーブ感を生み出すディレイノード
    const delay = ctx.createDelay();
    delay.delayTime.setValueAtTime(0.09, now);

    const delayFeedback = ctx.createGain();
    delayFeedback.gain.setValueAtTime(0.42, now);

    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.setValueAtTime(3500, now);

    delay.connect(delayFeedback);
    delayFeedback.connect(delayFilter);
    delayFilter.connect(delay);
    delay.connect(out);

    // きらめく高音チャイム（E6, G#6, B6, E7）
    const chimes = [
      { freq: 1318.51, offset: 0.00, dur: 0.55 }, // E6
      { freq: 1661.22, offset: 0.08, dur: 0.55 }, // G#6
      { freq: 1975.53, offset: 0.16, dur: 0.60 }, // B6
      { freq: 2637.02, offset: 0.24, dur: 0.75 }, // E7
    ];

    chimes.forEach(({ freq, offset, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);

      const startTime = now + offset;
      const endTime = startTime + dur;

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc.connect(gain);
      gain.connect(out);
      gain.connect(delay); // ディレイリバーブにも接続

      osc.start(startTime);
      osc.stop(endTime);
    });
  }

  /**
   * 'levelup' - レベルアップジングル (上昇スケール＋ハーモニー)
   */
  private playLevelUp(ctx: AudioContext, out: AudioNode): void {
    const now = ctx.currentTime;
    const scale = [
      523.25, // C5
      587.33, // D5
      659.25, // E5
      698.46, // F5
      783.99, // G5
      880.00, // A5
      987.77, // B5
    ];

    const noteStep = 0.055;

    // 上昇音階
    scale.forEach((freq, index) => {
      const startTime = now + index * noteStep;
      const endTime = startTime + 0.09;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.28, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc.connect(gain);
      gain.connect(out);

      osc.start(startTime);
      osc.stop(endTime);
    });

    // 最後の長めの和音 (C6 + E6 + G6)
    const chordTime = now + scale.length * noteStep;
    const chordDur = 0.8;
    const chordFreqs = [1046.50, 1318.51, 1567.98];

    chordFreqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, chordTime);

      gain.gain.setValueAtTime(0.0001, chordTime);
      gain.gain.linearRampToValueAtTime(0.25, chordTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, chordTime + chordDur);

      osc.connect(gain);
      gain.connect(out);

      osc.start(chordTime);
      osc.stop(chordTime + chordDur);
    });
  }

  /**
   * 'error' - 優しい低音ブザー (子どもを驚かせないマイルドな警告音)
   */
  private playError(ctx: AudioContext, out: AudioNode): void {
    const now = ctx.currentTime;
    const duration = 0.18;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    // 優しいローパスフィルターをかけた鋸歯状波
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * 'tap' - 控えめなソフトクリック音 (高周波の短いブリップ)
   */
  private playTap(ctx: AudioContext, out: AudioNode): void {
    const now = ctx.currentTime;
    const duration = 0.032;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(out);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * 'celebrate' - 祝福のお祝いファンファーレ (successの拡張版＋キラキラ音)
   */
  private playCelebrate(ctx: AudioContext, out: AudioNode): void {
    const now = ctx.currentTime;

    // 前半の導入アルペジオ
    const introNotes = [
      { freq: 392.00, offset: 0.00, dur: 0.10 }, // G4
      { freq: 523.25, offset: 0.08, dur: 0.10 }, // C5
      { freq: 659.25, offset: 0.16, dur: 0.10 }, // E5
      { freq: 783.99, offset: 0.24, dur: 0.10 }, // G5
      { freq: 880.00, offset: 0.32, dur: 0.10 }, // A5
      { freq: 987.77, offset: 0.40, dur: 0.10 }, // B5
    ];

    introNotes.forEach(({ freq, offset, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + offset);

      const startTime = now + offset;
      const endTime = startTime + dur;

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.28, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc.connect(gain);
      gain.connect(out);

      osc.start(startTime);
      osc.stop(endTime);
    });

    // 盛り上がりの大和音 (C6 + E6 + G6)
    const chordTime = now + 0.48;
    const chordDur = 0.95;
    [1046.50, 1318.51, 1567.98].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, chordTime);

      gain.gain.setValueAtTime(0.0001, chordTime);
      gain.gain.linearRampToValueAtTime(0.24, chordTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, chordTime + chordDur);

      osc.connect(gain);
      gain.connect(out);

      osc.start(chordTime);
      osc.stop(chordTime + chordDur);
    });

    // 祝福のきらめき星チャイム (C7, E7, G7)
    const sparkles = [
      { freq: 2093.00, offset: 0.70, dur: 0.35 },
      { freq: 2637.02, offset: 0.85, dur: 0.35 },
      { freq: 3135.96, offset: 1.00, dur: 0.45 },
    ];

    sparkles.forEach(({ freq, offset, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);

      const startTime = now + offset;
      const endTime = startTime + dur;

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc.connect(gain);
      gain.connect(out);

      osc.start(startTime);
      osc.stop(endTime);
    });
  }
}

/** シングルトンインスタンスのエクスポート */
export const soundManager = SoundManager.getInstance();
