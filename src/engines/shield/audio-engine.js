/* ==========================================================================
   GuardHai · engines/shield/audio-engine.js
   WebAudio tones used by the shield responses (beeps, siren). No audio files
   are bundled, so the app stays offline-safe.
   ========================================================================== */

const AudioEngine = {
   audioCtx: null,
   oscillator: null,
   vibrateInterval: null,

    startEmergencyAlarm() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.oscillator) return;

        this.oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        
        this.oscillator.type = 'sawtooth';
        this.oscillator.frequency.setValueAtTime(800, this.audioCtx.currentTime);
        this.oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioCtx.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0.4, this.audioCtx.currentTime);
        this.oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        
        this.oscillator.start();

        if (navigator.vibrate) {
            this.vibrateInterval = setInterval(() => {
                navigator.vibrate([500, 200, 500, 200]);
            }, 1400);
        }
    },

    stopEmergencyAlarm() {
        if (this.oscillator) {
            this.oscillator.stop();
            this.oscillator.disconnect();
            this.oscillator = null;
        }
        if (this.vibrateInterval) {
            clearInterval(this.vibrateInterval);
            this.vibrateInterval = null;
        }
    }
};

/* ============================================================
   GUARDHAI PROTECTION NETWORK & DISTANCE ENGINE
   ============================================================ */

window.AudioEngine = AudioEngine;
export { AudioEngine };
