'use strict';

const elHours = document.getElementById('hours');
const elMinutes = document.getElementById('minutes');
const elSeconds = document.getElementById('seconds');
const elAmpm = document.getElementById('ampmBadge');
const elGreeting = document.getElementById('greeting');
const elDate = document.getElementById('dateDisplay');
const elFormatToggle = document.getElementById('formatToggle');

const elNetworkWidget = document.getElementById('networkWidget');
const elNetworkLabel = document.getElementById('networkLabel');
const elBatteryWidget = document.getElementById('batteryWidget');
const elBatteryLabel = document.getElementById('batteryLabel');
const elBatteryFill = document.getElementById('batteryFill');

const elPomoTriggerBtn = document.getElementById('pomoTriggerBtn');
const elPomoPanel = document.getElementById('pomodoroPanel');
const elPomoArrow = document.getElementById('pomoArrow');
const elPomoTimerDisplay = document.getElementById('pomoTimerDisplay');
const elPomoPhase = document.getElementById('pomoPhase');
const elPomoStartBtn = document.getElementById('pomoStartBtn');
const elPomoPauseBtn = document.getElementById('pomoPauseBtn');
const elPomoResetBtn = document.getElementById('pomoResetBtn');
const elPomoSessions = document.getElementById('pomoSessions');
const elRingProgress = document.getElementById('ringProgress');
const pillButtons = document.querySelectorAll('.pomo-pill');

const canvas = document.getElementById('particlesCanvas');
const ctx = canvas.getContext('2d');

const state = {
  use24h: false,
  prevSeconds: -1,
};

const pad = (n) => String(n).padStart(2, '0');

function getGreeting(hour) {
  return '⚡ Keep Grinding';
}

function formatDate(now) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function updateClock() {
  const now = new Date();
  const h24 = now.getHours();
  const min = now.getMinutes();
  const sec = now.getSeconds();

  let displayHour = h24;
  let ampm = '';

  if (!state.use24h) {
    ampm = h24 >= 12 ? 'PM' : 'AM';
    displayHour = h24 % 12 || 12;
  }

  elHours.textContent = pad(displayHour);
  elMinutes.textContent = pad(min);
  elSeconds.textContent = pad(sec);

  elAmpm.textContent = ampm;
  elAmpm.classList.toggle('hidden', state.use24h);

  if (sec !== state.prevSeconds) {
    elSeconds.classList.remove('tick');
    void elSeconds.offsetWidth;
    elSeconds.classList.add('tick');
    state.prevSeconds = sec;
  }

  elDate.textContent = formatDate(now);

  const currentGreeting = getGreeting(h24);
  if (elGreeting.textContent !== currentGreeting) {
    elGreeting.style.opacity = '0';
    setTimeout(() => {
      elGreeting.textContent = currentGreeting;
      elGreeting.style.opacity = '1';
    }, 300);
  }
}

elFormatToggle.addEventListener('change', () => {
  state.use24h = elFormatToggle.checked;
  updateClock();
});

function updateBatteryUI(battery) {
  const pct = Math.round(battery.level * 100);
  const label = `${pct}%${battery.charging ? ' ⚡' : ''}`;
  elBatteryLabel.textContent = label;

  const fillWidth = Math.round((pct / 100) * 20);
  elBatteryFill.setAttribute('width', fillWidth);

  elBatteryWidget.classList.remove('high', 'medium', 'low');

  if (pct > 50) {
    elBatteryWidget.classList.add('high');
  } else if (pct > 20) {
    elBatteryWidget.classList.add('medium');
  } else {
    elBatteryWidget.classList.add('low');
  }
}

async function initBattery() {
  if (!('getBattery' in navigator)) {
    elBatteryLabel.textContent = 'N/A';
    elBatteryWidget.title = 'Battery API not supported';
    return;
  }

  try {
    const battery = await navigator.getBattery();

    updateBatteryUI(battery);

    battery.addEventListener('levelchange', () => updateBatteryUI(battery));
    battery.addEventListener('chargingchange', () => updateBatteryUI(battery));
  } catch (err) {
    elBatteryLabel.textContent = 'N/A';
    console.warn('Battery API error:', err);
  }
}

function updateNetworkUI() {
  const isOnline = navigator.onLine;

  elNetworkWidget.classList.toggle('online', isOnline);
  elNetworkWidget.classList.toggle('offline', !isOnline);

  elNetworkLabel.textContent = isOnline ? 'Online' : 'Offline';
}

function initNetwork() {
  updateNetworkUI();

  window.addEventListener('online', updateNetworkUI);
  window.addEventListener('offline', updateNetworkUI);
}

const pomo = {
  totalSeconds: 25 * 60,
  remainingSeconds: 25 * 60,
  isRunning: false,
  intervalId: null,
  sessions: 0,
  isBreak: false,
  RING_CIRCUMFERENCE: 326.7,
};

const formatPomoTime = (s) =>
  `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

function updateRing() {
  const progress = pomo.remainingSeconds / pomo.totalSeconds;
  const offset = pomo.RING_CIRCUMFERENCE * (1 - progress);

  elRingProgress.style.strokeDashoffset = offset;
}

function renderPomoState() {
  elPomoTimerDisplay.textContent =
    formatPomoTime(pomo.remainingSeconds);

  updateRing();

  elPomoPhase.textContent = pomo.isBreak ? 'Break' : 'Focus';
  elRingProgress.classList.toggle('break-mode', pomo.isBreak);

  elPomoStartBtn.disabled = pomo.isRunning;
  elPomoPauseBtn.disabled = !pomo.isRunning;
}

function pomoTick() {
  if (pomo.remainingSeconds <= 0) {
    clearInterval(pomo.intervalId);
    pomo.isRunning = false;

    if (!pomo.isBreak) {
      pomo.sessions++;
      elPomoSessions.textContent = pomo.sessions;
    }

    playDoneChime();

    pomo.isBreak = !pomo.isBreak;
    pomo.totalSeconds = pomo.isBreak ? 5 * 60 : 25 * 60;
    pomo.remainingSeconds = pomo.totalSeconds;

    renderPomoState();
    return;
  }

  pomo.remainingSeconds--;
  renderPomoState();
}

function playDoneChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ac = new AudioCtx();
    const notes = [523.25, 659.25, 783.99];

    notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();

      osc.connect(gain);
      gain.connect(ac.destination);

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(
        0.18,
        ac.currentTime + i * 0.18
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ac.currentTime + i * 0.18 + 0.5
      );

      osc.start(ac.currentTime + i * 0.18);
      osc.stop(ac.currentTime + i * 0.18 + 0.5);
    });
  } catch (e) {}
}

elPomoTriggerBtn.addEventListener('click', () => {
  const isOpen = elPomoPanel.classList.toggle('open');

  elPomoTriggerBtn.setAttribute('aria-expanded', isOpen);
  elPomoPanel.setAttribute('aria-hidden', !isOpen);
});

elPomoStartBtn.addEventListener('click', () => {
  if (pomo.isRunning) return;

  pomo.isRunning = true;
  pomo.intervalId = setInterval(pomoTick, 1000);

  renderPomoState();
});

elPomoPauseBtn.addEventListener('click', () => {
  if (!pomo.isRunning) return;

  clearInterval(pomo.intervalId);
  pomo.isRunning = false;

  renderPomoState();
});

elPomoResetBtn.addEventListener('click', () => {
  clearInterval(pomo.intervalId);

  pomo.isRunning = false;
  pomo.remainingSeconds = pomo.totalSeconds;
  pomo.isBreak = false;

  renderPomoState();
});

pillButtons.forEach((pill) => {
  pill.addEventListener('click', () => {
    clearInterval(pomo.intervalId);

    pomo.isRunning = false;

    const minutes = parseInt(pill.dataset.duration, 10);

    pomo.totalSeconds = minutes * 60;
    pomo.remainingSeconds = pomo.totalSeconds;
    pomo.isBreak = pill.id !== 'pillFocus';

    pillButtons.forEach((p) => {
      p.classList.remove('active');
      p.setAttribute('aria-pressed', 'false');
    });

    pill.classList.add('active');
    pill.setAttribute('aria-pressed', 'true');

    renderPomoState();
  });
});

class Particle {
  constructor() {
    this.reset(true);
  }

  reset(initial = false) {
    this.x = Math.random() * canvas.width;
    this.y = initial
      ? Math.random() * canvas.height
      : canvas.height + 10;

    this.r = Math.random() * 1.6 + 0.4;
    this.speed = Math.random() * 0.4 + 0.1;
    this.drift = (Math.random() - 0.5) * 0.3;
    this.alpha = Math.random() * 0.5 + 0.1;
    this.hue = Math.random() > 0.7
      ? '264, 80%'
      : '200, 60%';
  }

  update() {
    this.y -= this.speed;
    this.x += this.drift;
    this.alpha -= 0.0005;

    if (this.y < -10 || this.alpha <= 0) {
      this.reset();
    }
  }

  draw(c) {
    c.save();

    c.globalAlpha = Math.max(this.alpha, 0);
    c.fillStyle = `hsl(${this.hue}, ${this.alpha * 100}%)`;
    c.shadowColor = `hsl(${this.hue}, 80%)`;
    c.shadowBlur = 6;

    c.beginPath();
    c.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    c.fill();

    c.restore();
  }
}

let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function initParticles(count = 80) {
  resizeCanvas();

  particles = Array.from(
    { length: count },
    () => new Particle()
  );

  window.addEventListener('resize', () => {
    resizeCanvas();

    particles.forEach((p) => {
      p.x = Math.random() * canvas.width;
    });
  });
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach((p) => {
    p.update();
    p.draw(ctx);
  });

  requestAnimationFrame(animateParticles);
}

(function init() {
  updateClock();
  setInterval(updateClock, 1000);

  initBattery();
  initNetwork();

  renderPomoState();

  initParticles(75);
  animateParticles();

  document.querySelector('.clock-card').style.opacity = '0';
  document.querySelector('.clock-card').style.transform =
    'translateY(24px)';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const card = document.querySelector('.clock-card');

      card.style.transition =
        'opacity 0.8s ease, transform 0.8s cubic-bezier(0.16,1,0.3,1)';

      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    });
  });
})();
