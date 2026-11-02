/**
 * Audio engine built on the Web Audio API.
 *
 * - Background music: plays `museumConfig.audio.musicUrl` if set; otherwise
 *   (or if loading fails) a soft generative music-box melody is synthesised.
 * - Ambient: gentle fountain water whose volume follows the player.
 * - SFX: interaction chime, close tap, candle blow, celebration fanfare.
 *
 * Nothing plays until `start()` is called from a user gesture (the
 * "Enter Museum" button), which satisfies mobile autoplay rules.
 */
import { museumConfig } from '../data/museumConfig'
import { assetUrl } from './assets'

const MUTE_KEY = 'olw-muted'
const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

// Fmaj7 → Dm7 → B♭maj7 → C6 : warm and a little wistful
const CHORDS = [
  [53, 57, 60, 64],
  [50, 53, 57, 60],
  [46, 50, 53, 57],
  [48, 52, 55, 57],
]
const BPM = 70
const EIGHTH = 60 / BPM / 2

class AudioEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private musicBus!: GainNode
  private sfxBus!: GainNode
  private ambientGain!: GainNode
  private boxDelayIn!: GainNode
  private noise!: AudioBuffer
  private musicEl: HTMLAudioElement | null = null
  private schedTimer: number | null = null
  private nextTime = 0
  private step = 0
  private lastMelody = 2
  private started = false
  muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1'

  /** Must be called from a user gesture. Safe to call repeatedly. */
  start() {
    if (!this.ctx) this.build()
    const ctx = this.ctx!
    if (ctx.state === 'suspended') void ctx.resume()
    if (!this.started) {
      this.started = true
      this.startMusic()
      this.startAmbient()
    }
  }

  /** Stop music & ambience (e.g. when returning to the welcome screen). */
  stop() {
    if (!this.ctx) return
    this.started = false
    if (this.schedTimer !== null) window.clearInterval(this.schedTimer)
    this.schedTimer = null
    this.musicEl?.pause()
    this.ambientGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3)
    this.ambientSrc?.stop()
    this.ambientSrc = null
  }

  setMuted(m: boolean) {
    this.muted = m
    localStorage.setItem(MUTE_KEY, m ? '1' : '0')
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.08)
  }

  /** 0 (far) .. 1 (right next to the fountain) */
  setFountainProximity(v: number) {
    if (!this.ctx) return
    this.ambientGain.gain.setTargetAtTime(0.012 + v * 0.07, this.ctx.currentTime, 0.4)
  }

  // ── SFX ────────────────────────────────────────────────────────────────

  /** Soft bell used when opening a memory */
  chime() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    ;[88, 95, 100].forEach((n, i) => this.bell(midi(n), t + i * 0.07, 0.16 - i * 0.03, 1.8, this.sfxBus))
  }

  /** Gentle tap when closing */
  tap() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.bell(midi(81), t, 0.09, 0.5, this.sfxBus)
  }

  /** Little "pop" when an interaction prompt appears */
  blip() {
    if (!this.ctx) return
    this.bell(midi(93), this.ctx.currentTime, 0.04, 0.35, this.sfxBus)
  }

  /** Breath of air for blowing out candles */
  blow() {
    if (!this.ctx) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 0.8
    bp.frequency.setValueAtTime(500, t)
    bp.frequency.exponentialRampToValueAtTime(1800, t + 0.35)
    bp.frequency.exponentialRampToValueAtTime(700, t + 1.0)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.35, t + 0.12)
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.1)
    src.connect(bp).connect(g).connect(this.sfxBus)
    src.start(t)
    src.stop(t + 1.2)
  }

  /** Celebration fanfare: rising arpeggio, warm chord, sparkle and pops */
  celebrate() {
    if (!this.ctx) return
    const t = this.ctx.currentTime + 0.05
    const run = [65, 69, 72, 77, 81, 84, 89, 93]
    run.forEach((n, i) => this.bell(midi(n), t + i * 0.085, 0.13, 1.6, this.sfxBus))
    ;[53, 60, 65, 69, 72].forEach((n) => this.pad(midi(n), t + 0.7, 3.2, 0.05, this.sfxBus))
    for (let i = 0; i < 14; i++) {
      this.bell(midi(96 + ((i * 5) % 12)), t + 0.8 + i * 0.11 + Math.random() * 0.05, 0.035, 0.6, this.sfxBus)
    }
    ;[0.05, 0.22, 0.4].forEach((d) => this.pop(t + d))
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private build() {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 1
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 3
    this.master.connect(comp).connect(ctx.destination)

    this.musicBus = ctx.createGain()
    this.musicBus.gain.value = museumConfig.audio.musicVolume
    this.musicBus.connect(this.master)
    this.sfxBus = ctx.createGain()
    this.sfxBus.gain.value = museumConfig.audio.sfxVolume
    this.sfxBus.connect(this.master)
    this.ambientGain = ctx.createGain()
    this.ambientGain.gain.value = 0
    this.ambientGain.connect(this.master)

    // Dreamy feedback delay for the music box
    this.boxDelayIn = ctx.createGain()
    const delay = ctx.createDelay(1.5)
    delay.delayTime.value = EIGHTH * 3
    const fb = ctx.createGain()
    fb.gain.value = 0.32
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 2600
    this.boxDelayIn.connect(delay)
    delay.connect(lp).connect(fb).connect(delay)
    lp.connect(this.musicBus)

    // 2 s of soft "pink-ish" noise, reused by several sounds
    const len = ctx.sampleRate * 2
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = this.noise.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.05 * white) / 1.05
      data[i] = last * 3.2
    }

    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return
      if (document.hidden) {
        void this.ctx.suspend()
        this.musicEl?.pause()
      } else if (this.started) {
        void this.ctx.resume()
        void this.musicEl?.play().catch(() => {})
      }
    })
  }

  private startMusic() {
    const url = museumConfig.audio.musicUrl
    if (url && this.ctx) {
      if (!this.musicEl) {
        const el = new Audio(assetUrl(url))
        el.loop = true
        el.crossOrigin = 'anonymous'
        el.addEventListener('error', () => {
          // File missing → fall back to generated music
          this.musicEl = null
          if (this.started) this.startGenerative()
        })
        this.ctx.createMediaElementSource(el).connect(this.musicBus)
        this.musicEl = el
      }
      this.musicEl.play().catch(() => this.startGenerative())
      return
    }
    this.startGenerative()
  }

  private startGenerative() {
    if (!this.ctx || this.schedTimer !== null) return
    this.nextTime = this.ctx.currentTime + 0.3
    this.step = 0
    this.schedTimer = window.setInterval(() => this.schedule(), 60)
  }

  private schedule() {
    const ctx = this.ctx!
    while (this.nextTime < ctx.currentTime + 0.25) {
      const bar = Math.floor(this.step / 8) % CHORDS.length
      const beat = this.step % 8
      const chord = CHORDS[bar]
      const t = this.nextTime
      if (beat === 0) {
        // Pad + soft bass on each bar
        chord.slice(1).forEach((n) => this.pad(midi(n + 12), t, EIGHTH * 8 + 0.6, 0.022, this.musicBus))
        this.pad(midi(chord[0] - 12), t, EIGHTH * 8, 0.05, this.musicBus)
      }
      // Music-box melody: random walk over chord tones, with breathing rests
      const rest = beat % 2 === 1 ? Math.random() < 0.55 : Math.random() < 0.18
      if (!rest) {
        const tones = [...chord.map((n) => n + 24), chord[0] + 36]
        this.lastMelody = Math.max(0, Math.min(tones.length - 1, this.lastMelody + Math.round((Math.random() - 0.5) * 3)))
        const vel = beat === 0 ? 0.075 : 0.05
        this.bell(midi(tones[this.lastMelody]), t, vel, 2.2, this.musicBus, true)
      }
      this.nextTime += EIGHTH
      this.step++
    }
  }

  private bell(freq: number, t: number, vol: number, decay: number, out: AudioNode, toDelay = false) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    const o1 = ctx.createOscillator()
    o1.type = 'sine'
    o1.frequency.value = freq
    const o2 = ctx.createOscillator()
    o2.type = 'sine'
    o2.frequency.value = freq * 2.01
    const g2 = ctx.createGain()
    g2.gain.value = 0.25
    o1.connect(g)
    o2.connect(g2).connect(g)
    g.connect(out)
    if (toDelay) g.connect(this.boxDelayIn)
    o1.start(t)
    o2.start(t)
    o1.stop(t + decay + 0.05)
    o2.stop(t + decay + 0.05)
  }

  private pad(freq: number, t: number, dur: number, vol: number, out: AudioNode) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + Math.min(1.2, dur * 0.4))
    g.gain.setTargetAtTime(0, t + dur * 0.75, dur * 0.25)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    lp.connect(g).connect(out)
    for (const det of [-6, 6]) {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.value = freq
      o.detune.value = det
      o.connect(lp)
      o.start(t)
      o.stop(t + dur + 1.2)
    }
  }

  private pop(t: number) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 1500
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.4, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    src.connect(hp).connect(g).connect(this.sfxBus)
    src.start(t, Math.random())
    src.stop(t + 0.15)
  }

  private ambientSrc: AudioBufferSourceNode | null = null
  private startAmbient() {
    const ctx = this.ctx!
    if (this.ambientSrc) return
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1400
    bp.Q.value = 0.5
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 400
    src.connect(bp).connect(hp).connect(this.ambientGain)
    src.start()
    this.ambientSrc = src
    this.setFountainProximity(0)
  }
}

export const audio = new AudioEngine()
