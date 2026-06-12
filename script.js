/**
 * ═══════════════════════════════════════════════════════════════
 *  UrbanClock — Premium Digital Clock  |  script.js
 *  ─────────────────────────────────────────────────────────────
 *  Modules:
 *   1. Selectors & State
 *   2. Clock — Time & Greeting
 *   3. Format Toggle (12h / 24h)
 *   4. Battery & Network Status API
 *   5. Pomodoro Focus Timer
 *   6. Ambient Particle Canvas
 *   7. Init
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   1. SELECTORS & SHARED STATE
══════════════════════════════════════════════════════════════ */

// Clock elements
const elHours       = document.getElementById('hours');
const elMinutes     = document.getElementById('minutes');
const elSeconds     = document.getElementById('seconds');
const elAmpm        = document.getElementById('ampmBadge');
const elGreeting    = document.getElementById('greeting');
const elDate        = document.getElementById('dateDisplay');
const elFormatToggle = document.getElementById('formatToggle');

// Status bar
const elNetworkWidget = document.getElementById('networkWidget');
const elNetworkLabel  = document.getElementById('networkLabel');
const elBatteryWidget = document.getElementById('batteryWidget');
const elBatteryLabel  = document.getElementById('batteryLabel');
const elBatteryFill   = document.getElementById('batteryFill');

// Pomodoro
const elPomoTriggerBtn    = document.getElementById('pomoTriggerBtn');
const elPomoPanel         = document.getElementById('pomodoroPanel');
const elPomoArrow         = document.getElementById('pomoArrow');
const elPomoTimerDisplay  = document.getElementById('pomoTimerDisplay');
const elPomoPhase         = document.getElementById('pomoPhase');
const elPomoStartBtn      = document.getElementById('pomoStartBtn');
const elPomoPauseBtn      = document.getElementById('pomoPauseBtn');
const elPomoResetBtn      = document.getElementById('pomoResetBtn');
const elPomoSessions      = document.getElementById('pomoSessions');
const elRingProgress      = document.getElementById('ringProgress');
const pillButtons         = document.querySelectorAll('.pomo-pill');

// Particle canvas
const canvas = document.getElementById('particlesCanvas');
const ctx    = canvas.getContext('2d');

/** Shared app state */
const state = {
  use24h: false,           // Format toggle flag
  prevSeconds: -1,         // Tracks second changes for animation
};


/* ══════════════════════════════════════════════════════════════
   2. CLOCK — TIME DISPLAY & GREETING
══════════════════════════════════════════════════════════════ */

/** Pad a number with a leading zero if needed. */
const pad = (n) => String(n).padStart(2, '0');

/**
 * Returns a dynamic greeting based on the hour of the day.
 * @param {number} hour - 24-hour format hour (0–23)
 * @returns {string}
 */
function getGreeting(hour) {
  return '⚡ Keep Grinding';
}

/**
 * Formats the current Date object into a readable string.
 * @param {Date} now
 * @returns {string} e.g. "Thursday, 12 June 2025"
 */
function formatDate(now) {
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

/**
 * Main clock tick — called every second via setInterval.
 * Updates time, date, greeting, and triggers second animation.
 */
function updateClock() {
  const now  = new Date();
  const h24  = now.getHours();
  const min  = now.getMinutes();
  const sec  = now.getSeconds();

  // ── Time ──
  let displayHour = h24;
  let ampm = '';

  if (!state.use24h) {
    // 12-hour format
    ampm = h24 >= 12 ? 'PM' : 'AM';
    displayHour = h24 % 12 || 12; // convert 0 → 12
  }

  elHours.textContent   = pad(displayHour);
  elMinutes.textContent = pad(min);
  elSeconds.textContent = pad(sec);

  // AM/PM badge visibility
  elAmpm.textContent = ampm;
  elAmpm.classList.toggle('hidden', state.use24h);

  // ── Seconds flip animation ──
  if (sec !== state.prevSeconds) {
    elSeconds.classList.remove('tick');
    // Force reflow to re-trigger the animation class
    void elSeconds.offsetWidth;
    elSeconds.classList.add('tick');
    state.prevSeconds = sec;
  }

  // ── Date ──
  elDate.textContent = formatDate(now);

  // ── Greeting (update only when hour changes for efficiency) ──
  const currentGreeting = getGreeting(h24);
  if (elGreeting.textContent !== currentGreeting) {
    elGreeting.style.opacity = '0';
    setTimeout(() => {
      elGreeting.textContent = currentGreeting;
      elGreeting.style.opacity = '1';
    }, 300);
  }
}


/* ══════════════════════════════════════════════════════════════
   3. FORMAT TOGGLE (12h / 24h)
══════════════════════════════════════════════════════════════ */

elFormatToggle.addEventListener('change', () => {
  state.use24h = elFormatToggle.checked;
  updateClock(); // Immediately re-render with new format
});


/* ══════════════════════════════════════════════════════════════
   4. BATTERY & NETWORK STATUS
══════════════════════════════════════════════════════════════ */

/** Updates battery UI based on a BatteryManager object. */
function updateBatteryUI(battery) {
  const pct   = Math.round(battery.level * 100);
  const label = `${pct}%${battery.charging ? ' ⚡' : ''}`;
  elBatteryLabel.textContent = label;

  // Fill bar: max inner width = 20px (24px outer - 2px each side padding)
  const fillWidth = Math.round((pct / 100) * 20);
  elBatteryFill.setAttribute('width', fillWidth);

  // Color class
  elBatteryWidget.classList.remove('high', 'medium', 'low');
  if (pct > 50) elBatteryWidget.classList.add('high');
  else if (pct > 20) elBatteryWidget.classList.add('medium');
  else elBatteryWidget.classList.add('low');
}

/** Initialises the Battery Status API. */
async function initBattery() {
  if (!('getBattery' in navigator)) {
    elBatteryLabel.textContent = 'N/A';
    elBatteryWidget.title = 'Battery API not supported';
    return;
  }
  try {
    const battery = await navigator.getBattery();
    updateBatteryUI(battery);

    // Listen for changes
    battery.addEventListener('levelchange',   () => updateBatteryUI(battery));
    battery.addEventListener('chargingchange', () => updateBatteryUI(battery));
  } catch (err) {
    elBatteryLabel.textContent = 'N/A';
    console.warn('Battery API error:', err);
  }
}

/** Updates network indicator based on navigator.onLine. */
function updateNetworkUI() {
  const isOnline = navigator.onLine;
  elNetworkWidget.classList.toggle('online',  isOnline);
  elNetworkWidget.classList.toggle('offline', !isOnline);
  elNetworkLabel.textContent = isOnline ? 'Online' : 'Offline';
}

/** Initialises the Network Information API listeners. */
function initNetwork() {
  updateNetworkUI();
  window.addEventListener('online',  updateNetworkUI);
  window.addEventListener('offline', updateNetworkUI);
}


/* ══════════════════════════════════════════════════════════════
   5. POMODORO FOCUS TIMER
══════════════════════════════════════════════════════════════ */

/** Pomodoro state object — fully self-contained. */
const pomo = {
  totalSeconds:    25 * 60,  // Default: 25-minute focus
  remainingSeconds: 25 * 60,
  isRunning:       false,
  intervalId:      null,
  sessions:        0,
  isBreak:         false,
  RING_CIRCUMFERENCE: 326.7, // 2 * π * r (r = 52)
};

/** Formats seconds into MM:SS string. */
const formatPomoTime = (s) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

/** Updates the SVG ring progress based on time remaining. */
function updateRing() {
  const progress = pomo.remainingSeconds / pomo.totalSeconds;
  const offset   = pomo.RING_CIRCUMFERENCE * (1 - progress);
  elRingProgress.style.strokeDashoffset = offset;
}

/** Renders the current timer display and ring. */
function renderPomoState() {
  elPomoTimerDisplay.textContent = formatPomoTime(pomo.remainingSeconds);
  updateRing();

  elPomoPhase.textContent = pomo.isBreak ? 'Break' : 'Focus';
  elRingProgress.classList.toggle('break-mode', pomo.isBreak);

  // Button states
  elPomoStartBtn.disabled = pomo.isRunning;
  elPomoPauseBtn.disabled = !pomo.isRunning;
}

/** Fires each second while the Pomodoro timer runs. */
function pomoTick() {
  if (pomo.remainingSeconds <= 0) {
    // Session complete
    clearInterval(pomo.intervalId);
    pomo.isRunning = false;

    if (!pomo.isBreak) {
      pomo.sessions++;
      elPomoSessions.textContent = pomo.sessions;
    }

    // Notify with a gentle sound via AudioContext (no external files needed)
    playDoneChime();

    // Auto-switch phase
    pomo.isBreak = !pomo.isBreak;
    pomo.totalSeconds     = pomo.isBreak ? 5 * 60 : 25 * 60;
    pomo.remainingSeconds = pomo.totalSeconds;

    renderPomoState();
    return;
  }

  pomo.remainingSeconds--;
  renderPomoState();
}

/** Plays a short completion chime using the Web Audio API. */
function playDoneChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ac = new AudioCtx();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach((freq, i) => {
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);

      osc.type      = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, ac.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.18 + 0.5);

      osc.start(ac.currentTime + i * 0.18);
      osc.stop(ac.currentTime  + i * 0.18 + 0.5);
    });
  } catch (e) {
    // Silently fail if AudioContext is blocked
  }
}

// ── Pomodoro Panel Toggle ──
elPomoTriggerBtn.addEventListener('click', () => {
  const isOpen = elPomoPanel.classList.toggle('open');
  elPomoTriggerBtn.setAttribute('aria-expanded', isOpen);
  elPomoPanel.setAttribute('aria-hidden', !isOpen);
});

// ── Start ──
elPomoStartBtn.addEventListener('click', () => {
  if (pomo.isRunning) return;
  pomo.isRunning = true;
  pomo.intervalId = setInterval(pomoTick, 1000);
  renderPomoState();
});

// ── Pause ──
elPomoPauseBtn.addEventListener('click', () => {
  if (!pomo.isRunning) return;
  clearInterval(pomo.intervalId);
  pomo.isRunning = false;
  renderPomoState();
});

// ── Reset ──
elPomoResetBtn.addEventListener('click', () => {
  clearInterval(pomo.intervalId);
  pomo.isRunning        = false;
  pomo.remainingSeconds = pomo.totalSeconds;
  pomo.isBreak          = false;
  renderPomoState();
});

// ── Mode Pills (Focus 25, Break 5, Long 15) ──
pillButtons.forEach((pill) => {
  pill.addEventListener('click', () => {
    // Reset and set new duration
    clearInterval(pomo.intervalId);
    pomo.isRunning = false;

    const minutes         = parseInt(pill.dataset.duration, 10);
    pomo.totalSeconds     = minutes * 60;
    pomo.remainingSeconds = pomo.totalSeconds;
    pomo.isBreak          = pill.id !== 'pillFocus';

    // Update pill active state
    pillButtons.forEach((p) => {
      p.classList.remove('active');
      p.setAttribute('aria-pressed', 'false');
    });
    pill.classList.add('active');
    pill.setAttribute('aria-pressed', 'true');

    renderPomoState();
  });
});


/* ══════════════════════════════════════════════════════════════
   6. AMBIENT PARTICLE CANVAS
══════════════════════════════════════════════════════════════ */

/** Represents a single drifting particle. */
class Particle {
  constructor() { this.reset(true); }

  /** Resets a particle to a new random position. */
  reset(initial = false) {
    this.x     = Math.random() * canvas.width;
    this.y     = initial ? Math.random() * canvas.height : canvas.height + 10;
    this.r     = Math.random() * 1.6 + 0.4;
    this.speed = Math.random() * 0.4 + 0.1;
    this.drift = (Math.random() - 0.5) * 0.3;
    this.alpha = Math.random() * 0.5 + 0.1;
    this.hue   = Math.random() > 0.7 ? '264, 80%' : '200, 60%'; // purple or cyan
  }

  update() {
    this.y     -= this.speed;
    this.x     += this.drift;
    this.alpha -= 0.0005;

    if (this.y < -10 || this.alpha <= 0) this.reset();
  }

  draw(c) {
    c.save();
    c.globalAlpha = Math.max(this.alpha, 0);
    c.fillStyle   = `hsl(${this.hue}, ${this.alpha * 100}%)`;
    c.shadowColor = `hsl(${this.hue}, 80%)`;
    c.shadowBlur  = 6;
    c.beginPath();
    c.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

let particles = [];

/** Sets canvas dimensions to match the viewport. */
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

/** Initialises the particle system. */
function initParticles(count = 80) {
  resizeCanvas();
  particles = Array.from({ length: count }, () => new Particle());
  window.addEventListener('resize', () => {
    resizeCanvas();
    // Re-spread particles within new bounds
    particles.forEach((p) => {
      p.x = Math.random() * canvas.width;
    });
  });
}

/** Main render loop for particles. */
function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((p) => { p.update(); p.draw(ctx); });
  requestAnimationFrame(animateParticles);
}


/* ══════════════════════════════════════════════════════════════
   7. INIT — Wire everything up on DOM ready
══════════════════════════════════════════════════════════════ */

(function init() {
  // 1. Start the clock tick (every second)
  updateClock();
  setInterval(updateClock, 1000);

  // 2. Battery & Network
  initBattery();
  initNetwork();

  // 3. Pomodoro — set initial visual state
  renderPomoState();

  // 4. Particles
  initParticles(75);
  animateParticles();

  // 5. Subtle page-entry fade-in animation
  document.querySelector('.clock-card').style.opacity = '0';
  document.querySelector('.clock-card').style.transform = 'translateY(24px)';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const card = document.querySelector('.clock-card');
      card.style.transition = 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.16,1,0.3,1)';
      card.style.opacity    = '1';
      card.style.transform  = 'translateY(0)';
    });
  });
})();
