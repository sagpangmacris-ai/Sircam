class SoundService {
  private ctx: AudioContext | null = null;
  private voiceEnabled: boolean = true;
  private chimesEnabled: boolean = true;

  private getContext(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public setPreferences(chimes: boolean, voice: boolean) {
    this.chimesEnabled = chimes;
    this.voiceEnabled = voice;
  }

  /**
   * Green Chime for "Present" on-time:
   * Double melodic chime in G Major (G5 784Hz -> B5 987Hz -> D6 1174Hz)
   */
  playSuccess() {
    if (!this.chimesEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [
        { freq: 783.99, time: 0.0, dur: 0.22, vol: 0.18 },
        { freq: 987.77, time: 0.08, dur: 0.25, vol: 0.22 },
        { freq: 1174.66, time: 0.16, dur: 0.35, vol: 0.25 },
      ].forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, now + note.time);

        gain.gain.setValueAtTime(note.vol, now + note.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + note.time);
        osc.stop(now + note.time + note.dur + 0.05);
      });
    } catch {
      // Audio context error ignore
    }
  }

  /**
   * Yellow Chime for "Late":
   * Noticeable double warning tone (A4 440Hz -> F#4 369Hz)
   */
  playLate() {
    if (!this.chimesEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [
        { freq: 440, time: 0.0, dur: 0.18, vol: 0.22 },
        { freq: 369.99, time: 0.14, dur: 0.28, vol: 0.22 },
      ].forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.freq, now + note.time);

        gain.gain.setValueAtTime(note.vol, now + note.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + note.time);
        osc.stop(now + note.time + note.dur + 0.05);
      });
    } catch {}
  }

  /**
   * Ascending Chime for "Time-Out" (Going Home)
   */
  playTimeOut() {
    if (!this.chimesEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.08;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.16, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.26);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.28);
      });
    } catch {}
  }

  /**
   * Anti-Proxy Warning / Expired Dynamic Token Buzz
   */
  playAntiProxyAlert() {
    if (!this.chimesEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [280, 240, 200].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.1;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.16);
      });
    } catch {}
  }

  playError() {
    if (!this.chimesEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(160, now + 0.12);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  /**
   * Text-to-Speech (TTS) Voice Synthesis Feedback:
   * Speaks the learner's name and status aloud upon scanning
   */
  speakText(text: string, rate: number = 1.0) {
    if (!this.voiceEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      // Cancel previous utterances to avoid queuing delay
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      // Try selecting an English/Filipino natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(v => 
        (v.lang.includes('en') || v.lang.includes('fil')) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Siri'))
      ) || voices.find(v => v.lang.includes('en'));

      if (naturalVoice) {
        utterance.voice = naturalVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis playback note:', e);
    }
  }

  /**
   * Speak attendance outcome with learner name
   */
  speakAttendance(
    learnerName: string, 
    status: 'Present' | 'Late' | 'GoingHome' | 'ExpiredProxy',
    customRate: number = 1.0
  ) {
    if (!this.voiceEnabled) return;
    const firstName = learnerName.split(' ')[0] || learnerName;

    let message = '';
    switch (status) {
      case 'Present':
        message = `Welcome, ${firstName}! Recorded present.`;
        break;
      case 'Late':
        message = `Recorded late, ${firstName}. Please proceed to class.`;
        break;
      case 'GoingHome':
        message = `Goodbye, ${firstName}! Have a safe trip home.`;
        break;
      case 'ExpiredProxy':
        message = `Warning. Dynamic QR pass expired. Please present a live pass.`;
        break;
    }

    // Slight delay (120ms) after chime so the chime and voice don't distort each other
    setTimeout(() => {
      this.speakText(message, customRate);
    }, 140);
  }
}

export const soundEffects = new SoundService();

