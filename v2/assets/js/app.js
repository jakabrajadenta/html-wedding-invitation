// V2 memakai data yang sama dengan versi pertama, jadi isi undangan cukup diubah di satu tempat.
const DATA_FILE = '../data/wedding.json';
const ENV_FILE = '../config/public.env';
const GUEST_NAME_MAX = 60;
const PENDING_TEXT = 'Menyusul';

// Musik khusus V2, tidak mengubah musik versi pertama.
const MUSIC = {
  src: 'assets/audio/canon-in-d-kevin-macleod.mp3',
  credit: 'Musik: "Canon in D Major" oleh Kevin MacLeod (incompetech.com), lisensi Creative Commons: By Attribution 3.0.',
};

// Path rumah gadang yang sama dengan simbol SVG, dipakai ulang untuk bingkai photobooth.
const HOUSE_ROOF = 'M0 150C30 135 45 80 22 2C60 70 100 100 140 104C165 95 175 70 162 30C190 80 230 96 262 92C285 80 298 40 300 0C302 40 315 80 338 92C370 96 410 80 438 30C425 70 435 95 460 104C500 100 540 70 578 2C555 80 570 135 600 150Z';
const HOUSE_BODY = 'M36 150H564V226H36Z';

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ICONS = {
  rings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="14" r="5.5"/><circle cx="15" cy="14" r="5.5"/><path d="M7 4h4l-2 3zM9 7v1.5"/></svg>',
  feast: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 17h18M5 17a7 7 0 0 1 14 0M12 8V6M10 6h4M4 20h16"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>',
  dress: '<svg viewBox="0 0 24 24"><path d="M9 3l3 3 3-3M9 3L6 8l3 2-4 11h14l-4-11 3-2-3-5"/></svg>',
  check: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.4 5.6L20 9.3l-4.3 3.9 1.3 6L12 16l-5 3.2 1.3-6L4 9.3l5.6-.7z"/></svg>',
};
const INFO_ICONS = [ICONS.clock, ICONS.dress, ICONS.check];

const fileCache = new Map();

function loadFile(file, parse) {
  if (!fileCache.has(file)) {
    fileCache.set(file, fetch(file).then((response) => {
      if (!response.ok) throw new Error(`${file}: ${response.status}`);
      return response[parse]();
    }));
  }
  return fileCache.get(file);
}

async function getJson(file, key) {
  const data = await loadFile(file, 'json');
  return key.split('.').reduce((value, part) => value?.[part], data);
}

async function getEnv(file, key) {
  const text = await loadFile(file, 'text');
  const line = text.split(/\r?\n/).find((row) => row.startsWith(`${key}=`));
  return line?.slice(key.length + 1).trim();
}

function setOptionalText(element, text) {
  element.textContent = text || '';
  element.hidden = !text;
}

async function bindText() {
  const elements = [...document.querySelectorAll('[data-key]')];
  await Promise.all(elements.map(async (element) => {
    setOptionalText(element, await getJson(DATA_FILE, element.dataset.key));
  }));
}

let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// Nama dipecah per huruf agar bisa muncul satu per satu.
function renderAnimatedNames(element, bride, groom) {
  let index = 0;
  const word = (text, className = 'word') => {
    const wrap = document.createElement('span');
    wrap.className = className;
    [...text].forEach((char) => {
      const span = document.createElement('span');
      span.className = 'ch';
      span.style.setProperty('--i', index++);
      span.textContent = char;
      wrap.append(span);
    });
    return wrap;
  };
  const inner = document.createElement('span');
  inner.className = 'word';
  inner.setAttribute('aria-hidden', 'true');
  inner.style.display = 'contents';
  inner.append(word(bride), word('&', 'word amp'), word(groom));
  element.replaceChildren(inner);
  element.setAttribute('aria-label', `${bride} & ${groom}`);
}

function renderPeople(couple) {
  const template = document.getElementById('person-template');
  document.querySelectorAll('[data-person]').forEach((container) => {
    const person = couple[container.dataset.person];
    const node = template.content.cloneNode(true);
    node.querySelector('.person-initial').textContent = person.nickname.charAt(0);
    node.querySelector('.person-role').textContent = person.role;
    node.querySelector('.person-nick').textContent = person.nickname;
    node.querySelector('.person-name').textContent =
      person.title ? `${person.fullName}, ${person.title}` : person.fullName;
    node.querySelector('.person-parents').textContent =
      `${person.childOrder} dari Bapak ${person.father} dan Ibu ${person.mother}`;
    setOptionalText(node.querySelector('.person-origin'), person.origin);
    container.replaceChildren(node);
  });
}

function renderStory(chapters) {
  if (!chapters.length) {
    document.getElementById('cerita').hidden = true;
    return;
  }
  const nodes = chapters.map(({ title, text }, index) => {
    const item = document.createElement('li');
    item.dataset.anim = index % 2 ? 'fade-left' : 'fade-right';
    const card = document.createElement('div');
    card.className = 'chapter';
    const heading = document.createElement('h3');
    const body = document.createElement('p');
    heading.textContent = title;
    body.textContent = text;
    card.append(heading, body);
    item.append(card);
    return item;
  });
  document.getElementById('story').replaceChildren(...nodes);
}

function dateParts(iso, timeZone) {
  const parts = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone,
  }).formatToParts(new Date(iso));
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return { weekday: get('weekday'), day: get('day'), month: get('month'), year: get('year') };
}

function formatDate(iso, timeZone) {
  const { weekday, day, month, year } = dateParts(iso, timeZone);
  return `${weekday}, ${day} ${month} ${year}`;
}

function formatNumericDate(iso, timeZone) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone,
  }).format(new Date(iso)).replace(/\//g, ' · ');
}

function formatTime(iso, timeZone) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone,
  }).format(new Date(iso));
}

function calendarDate(iso) {
  return new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '');
}

function calendarUrl(event, title) {
  const end = event.end || new Date(new Date(event.start).getTime() + 2 * 3600 * 1000).toISOString();
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${event.name} ${title}`,
    dates: `${calendarDate(event.start)}/${calendarDate(end)}`,
    location: `${event.venue}, ${event.address}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function formatTimeRange(event, { timeZone, timeLabel }) {
  const start = formatTime(event.start, timeZone);
  if (event.end) return `${start} – ${formatTime(event.end, timeZone)} ${timeLabel}`;
  return event.endLabel ? `${start} ${timeLabel} – ${event.endLabel}` : `${start} ${timeLabel}`;
}

function renderEvents(events, schedule, title) {
  const template = document.getElementById('event-template');
  const { timeZone } = schedule;
  const nodes = events.map((event, index) => {
    const node = template.content.cloneNode(true);
    const hasSchedule = Boolean(event.start);
    const map = node.querySelector('.event-map');
    const calendar = node.querySelector('.event-calendar');

    node.querySelector('.event-card').style.setProperty('--d', `${index * 0.12}s`);
    node.querySelector('.event-icon').innerHTML = index === 0 ? ICONS.rings : ICONS.feast;
    node.querySelector('.event-name').textContent = event.name;
    setOptionalText(node.querySelector('.event-note'), event.note);

    if (hasSchedule) {
      const { weekday, day, month, year } = dateParts(event.start, timeZone);
      node.querySelector('.event-weekday').textContent = weekday;
      node.querySelector('.event-day').textContent = day;
      node.querySelector('.event-month').textContent = `${month} ${year}`;
    } else {
      node.querySelector('.event-date-block').replaceChildren(PENDING_TEXT);
    }
    node.querySelector('.event-time').textContent =
      hasSchedule ? formatTimeRange(event, schedule) : PENDING_TEXT;
    node.querySelector('.event-venue').textContent = event.venue || PENDING_TEXT;
    setOptionalText(node.querySelector('.event-address'), event.address);
    node.querySelector('.event-address-label').hidden = !event.address;

    if (event.mapsUrl) map.href = event.mapsUrl;
    else map.hidden = true;
    if (hasSchedule) calendar.href = calendarUrl(event, title);
    else calendar.hidden = true;
    node.querySelector('.btn-row').hidden = !event.mapsUrl && !hasSchedule;
    return node;
  });
  document.getElementById('events').replaceChildren(...nodes);
}

function startCountdown(targetIso) {
  const container = document.getElementById('countdown');
  const target = new Date(targetIso).getTime();
  const units = [['Hari', 86400], ['Jam', 3600], ['Menit', 60], ['Detik', 1]];
  const values = units.map(([label]) => {
    const unit = document.createElement('div');
    const value = document.createElement('strong');
    unit.className = 'countdown-unit';
    unit.append(value, label);
    container.append(unit);
    return value;
  });
  container.hidden = false;

  const tick = () => {
    let remaining = Math.floor((target - Date.now()) / 1000);
    if (remaining <= 0) {
      const done = document.createElement('p');
      done.className = 'countdown-done';
      done.textContent = 'Alhamdulillah, acara telah berlangsung.';
      container.replaceChildren(done);
      clearInterval(timer);
      return;
    }
    units.forEach(([, seconds], index) => {
      const text = String(Math.floor(remaining / seconds)).padStart(2, '0');
      remaining %= seconds;
      const value = values[index];
      if (value.textContent === text) return;
      value.textContent = text;
      value.classList.remove('tick');
      void value.offsetWidth; // Mengulang animasi balik angka.
      value.classList.add('tick');
    });
  };
  const timer = setInterval(tick, 1000);
  tick();
}

function renderGuestInfo(items) {
  const nodes = items.map((text, index) => {
    const item = document.createElement('li');
    item.dataset.anim = 'fade-up';
    item.style.setProperty('--d', `${index * 0.1}s`);
    const icon = document.createElement('span');
    icon.className = 'info-icon';
    icon.innerHTML = INFO_ICONS[index] || ICONS.star;
    const body = document.createElement('span');
    body.textContent = text;
    item.append(icon, body);
    return item;
  });
  document.getElementById('guest-info').replaceChildren(...nodes);
}

function setupTilt(card) {
  if (REDUCED_MOTION) return;
  card.addEventListener('pointermove', (event) => {
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty('--rx', `${(-y * 14).toFixed(2)}deg`);
    card.style.setProperty('--ry', `${(x * 18).toFixed(2)}deg`);
  });
  card.addEventListener('pointerleave', () => {
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  });
}

function renderGifts(accounts) {
  if (!accounts.length) {
    document.getElementById('hadiah').hidden = true;
    document.querySelector('.bottom-nav a[href="#hadiah"]').hidden = true;
    return;
  }
  const template = document.getElementById('gift-template');
  const nodes = accounts.map((account, index) => {
    const node = template.content.cloneNode(true);
    node.querySelector('.gift-card').style.setProperty('--d', `${index * 0.12}s`);
    node.querySelector('.gift-bank').textContent = account.bank;
    node.querySelector('.gift-number').textContent = account.number.replace(/(\d{4})(?=\d)/g, '$1 ');
    node.querySelector('.gift-holder').textContent = account.holder;
    setupTilt(node.querySelector('.gift-card-inner'));
    const button = node.querySelector('.gift-copy');
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(account.number);
        button.textContent = 'Tersalin ✓';
        showToast(`Nomor ${account.bank} tersalin`);
      } catch {
        button.textContent = 'Gagal, salin manual';
      }
      setTimeout(() => { button.textContent = 'Salin Nomor'; }, 2000);
    });
    return node;
  });
  document.getElementById('gifts').replaceChildren(...nodes);
}

function setupRsvp(whatsapp, title, guest) {
  const form = document.getElementById('rsvp-form');
  const note = document.getElementById('rsvp-note');
  const count = form.elements.count;
  const message = form.elements.message;
  const chars = document.getElementById('rsvp-chars');
  if (guest) form.elements.name.value = guest;

  form.querySelectorAll('[data-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = Number(count.value || 1) + Number(button.dataset.step);
      count.value = Math.min(Number(count.max), Math.max(Number(count.min), next));
    });
  });
  message.addEventListener('input', () => {
    chars.textContent = `${message.value.length}/${message.maxLength}`;
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!whatsapp) {
      note.textContent = 'Nomor WhatsApp penerima konfirmasi belum diatur.';
      note.hidden = false;
      return;
    }
    const lines = [
      `Assalamu'alaikum. Konfirmasi undangan ${title}`,
      `Nama: ${form.elements.name.value.trim()}`,
      `Kehadiran: ${form.elements.attend.value}`,
      `Jumlah: ${count.value} orang`,
    ];
    if (message.value.trim()) lines.push(`Ucapan: ${message.value.trim()}`);
    burstConfetti();
    const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank', 'noopener');
  });
}

function setupMusic(src) {
  const audio = document.getElementById('music');
  const toggle = document.getElementById('music-toggle');
  if (!src) return () => {};

  const play = () => audio.play().catch((error) => console.warn('Musik tidak dapat diputar:', error));
  const setState = (isPlaying) => {
    toggle.setAttribute('aria-pressed', String(isPlaying));
    toggle.setAttribute('aria-label', isPlaying ? 'Matikan musik' : 'Nyalakan musik');
  };

  audio.src = src;
  audio.volume = 0.65;
  audio.addEventListener('play', () => setState(true));
  audio.addEventListener('pause', () => setState(false));
  audio.addEventListener('error', () => { toggle.hidden = true; });
  toggle.addEventListener('click', () => {
    if (audio.paused) play();
    else audio.pause();
  });

  let resumeOnReturn = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      resumeOnReturn = !audio.paused;
      audio.pause();
    } else if (resumeOnReturn) {
      play();
    }
  });

  toggle.hidden = false;
  return play;
}

/* ---------- Efek kanvas: kelopak bunga jatuh dan konfeti ---------- */

function fitCanvas(canvas) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width, height };
}

function startPetals() {
  if (REDUCED_MOTION) return;
  const canvas = document.getElementById('petals');
  let { ctx, width, height } = fitCanvas(canvas);
  window.addEventListener('resize', () => ({ ctx, width, height } = fitCanvas(canvas)));

  const colors = ['#b3242a', '#d9545b', '#f1b5a8', '#8c1c1f', '#fde6df'];
  const random = (min, max) => min + Math.random() * (max - min);
  const make = (initial) => {
    const sparkle = Math.random() < 0.3;
    return {
      sparkle,
      x: random(0, width),
      y: initial ? random(-height, height) : random(-60, -10),
      size: sparkle ? random(1, 2.4) : random(6, 12),
      speed: random(0.35, 1),
      drift: random(0.4, 1.4),
      phase: random(0, Math.PI * 2),
      spin: random(-0.02, 0.02),
      angle: random(0, Math.PI * 2),
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: sparkle ? random(0.5, 1) : random(0.45, 0.85),
    };
  };
  const items = Array.from({ length: 26 }, () => make(true));

  const drawPetal = (p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.globalAlpha = p.alpha;
    if (p.sparkle) {
      ctx.fillStyle = '#f6dc9f';
      ctx.shadowColor = '#e2b866';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Skala horizontal berubah agar kelopak terlihat berputar di udara.
      ctx.scale(Math.cos(p.phase * 1.3) * 0.5 + 0.7, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.bezierCurveTo(p.size * 0.9, -p.size * 0.6, p.size * 0.7, p.size * 0.7, 0, p.size);
      ctx.bezierCurveTo(-p.size * 0.7, p.size * 0.7, -p.size * 0.9, -p.size * 0.6, 0, -p.size);
      ctx.fill();
    }
    ctx.restore();
  };

  let running = true;
  const frame = () => {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);
    items.forEach((p, index) => {
      p.phase += 0.012;
      p.y += p.speed;
      p.x += Math.sin(p.phase) * p.drift * 0.6;
      p.angle += p.spin;
      if (p.y > height + 20) items[index] = make(false);
      drawPetal(p);
    });
    requestAnimationFrame(frame);
  };
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(frame);
  });
  requestAnimationFrame(frame);
}

function burstConfetti() {
  if (REDUCED_MOTION) return;
  const canvas = document.getElementById('confetti');
  const { ctx, width, height } = fitCanvas(canvas);
  const colors = ['#e2b866', '#f6dc9f', '#8c1c1f', '#d9545b', '#fbf3e4'];
  const pieces = Array.from({ length: 140 }, () => ({
    x: width / 2,
    y: height * 0.6,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 15 - 5,
    size: 4 + Math.random() * 6,
    angle: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const start = performance.now();
  const frame = (now) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, width, height);
    pieces.forEach((p) => {
      p.vy += 0.42;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.globalAlpha = Math.max(0, 1 - elapsed / 2600);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    });
    if (elapsed < 2600) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, width, height);
  };
  requestAnimationFrame(frame);
}

/* ---------- Photobooth ---------- */

const BOOTH_FILTERS = [
  { name: 'Asli' },
  { name: 'Hangat', brightness: 1.05, saturate: 1.25, sepia: 0.25 },
  { name: 'Lembut', brightness: 1.08, contrast: 0.9, saturate: 0.9 },
  { name: 'Klasik', brightness: 0.95, contrast: 1.05, sepia: 0.55 },
  { name: 'Cerah', brightness: 1.12, contrast: 1.08, saturate: 1.2 },
  { name: 'Monokrom', contrast: 1.15, saturate: 0 },
];

function cssFilter(f) {
  return [
    f.brightness !== undefined && `brightness(${f.brightness})`,
    f.contrast !== undefined && `contrast(${f.contrast})`,
    f.saturate !== undefined && `saturate(${f.saturate})`,
    f.sepia !== undefined && `sepia(${f.sepia})`,
  ].filter(Boolean).join(' ') || 'none';
}

// Filter diterapkan per piksel (urutan sama dengan CSS) karena tidak semua browser mendukung ctx.filter.
function applyPixelFilter(ctx, width, height, f) {
  if (f.brightness === undefined && f.contrast === undefined && f.saturate === undefined && f.sepia === undefined) return;
  const image = ctx.getImageData(0, 0, width, height);
  const d = image.data;
  const b = f.brightness ?? 1;
  const c = f.contrast ?? 1;
  const s = f.saturate ?? 1;
  const a = 1 - (f.sepia ?? 0);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] * b;
    let g = d[i + 1] * b;
    let bl = d[i + 2] * b;
    r = (r - 128) * c + 128;
    g = (g - 128) * c + 128;
    bl = (bl - 128) * c + 128;
    const r1 = (0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * bl;
    const g1 = (0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * bl;
    const b1 = (0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * bl;
    d[i] = (0.393 + 0.607 * a) * r1 + (0.769 - 0.769 * a) * g1 + (0.189 - 0.189 * a) * b1;
    d[i + 1] = (0.349 - 0.349 * a) * r1 + (0.686 + 0.314 * a) * g1 + (0.168 - 0.168 * a) * b1;
    d[i + 2] = (0.272 - 0.272 * a) * r1 + (0.534 - 0.534 * a) * g1 + (0.131 + 0.869 * a) * b1;
  }
  ctx.putImageData(image, 0, 0);
}

function drawBoothFrame(ctx, W, H, title, dateText) {
  const shade = ctx.createLinearGradient(0, H * 0.6, 0, H);
  shade.addColorStop(0, 'rgba(27,13,12,0)');
  shade.addColorStop(1, 'rgba(27,13,12,.88)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, H * 0.6, W, H * 0.4);

  ctx.strokeStyle = '#e2b866';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 2;
  ctx.strokeRect(38, 38, W - 76, H - 76);
  ctx.globalAlpha = 1;

  // Motif pucuak rabuang di sepanjang tepi bawah.
  ctx.fillStyle = 'rgba(226,184,102,.85)';
  for (let x = 44; x < W - 44; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, H - 44);
    ctx.lineTo(x + 18, H - 70);
    ctx.lineTo(x + 36, H - 44);
    ctx.closePath();
    ctx.fill();
  }

  const houseWidth = 280;
  const scale = houseWidth / 600;
  const gold = ctx.createLinearGradient(0, H - 380, 0, H - 270);
  gold.addColorStop(0, '#f6dc9f');
  gold.addColorStop(1, '#a87c32');
  ctx.save();
  ctx.translate((W - houseWidth) / 2, H - 390);
  ctx.scale(scale, scale);
  ctx.fillStyle = gold;
  ctx.fill(new Path2D(HOUSE_ROOF));
  ctx.fill(new Path2D(HOUSE_BODY));
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,.6)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#f6dc9f';
  ctx.font = '96px "Pinyon Script", cursive';
  ctx.fillText(title, W / 2, H - 170);
  ctx.fillStyle = '#fbf3e4';
  ctx.font = '600 26px "Josefin Sans", sans-serif';
  ctx.fillText(dateText.toUpperCase().split('').join(String.fromCharCode(8202)), W / 2, H - 112);
  ctx.shadowBlur = 0;
}

function setupPhotobooth(title, dateText) {
  const stage = document.getElementById('booth-stage');
  const video = document.getElementById('booth-video');
  const result = document.getElementById('booth-result');
  const idle = document.getElementById('booth-idle');
  const filters = document.getElementById('booth-filters');
  const startButton = document.getElementById('booth-start');
  const shotButton = document.getElementById('booth-shot');
  const download = document.getElementById('booth-download');
  const share = document.getElementById('booth-share');
  const retake = document.getElementById('booth-retake');
  const note = document.getElementById('booth-note');
  const count = document.getElementById('booth-count');
  const flash = document.getElementById('booth-flash');

  document.getElementById('booth-frame-names').textContent = title;
  document.getElementById('booth-frame-date').textContent = dateText;

  let stream = null;
  let current = BOOTH_FILTERS[0];
  let resultUrl = null;
  let resultBlob = null;

  const filterButtons = BOOTH_FILTERS.map((filter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', String(filter === current));
    button.textContent = filter.name;
    button.addEventListener('click', () => {
      current = filter;
      video.style.filter = cssFilter(filter);
      filterButtons.forEach((other) => other.setAttribute('aria-checked', String(other === button)));
    });
    return button;
  });
  filters.replaceChildren(...filterButtons);

  const showLive = () => {
    stage.classList.remove('has-result');
    result.hidden = true;
    video.hidden = false;
    idle.hidden = true;
    filters.hidden = false;
    shotButton.hidden = false;
    startButton.hidden = true;
    download.hidden = true;
    share.hidden = true;
    retake.hidden = true;
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  };

  startButton.addEventListener('click', async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      note.textContent = 'Kamera tidak tersedia di browser ini. Coba buka lewat Google Chrome atau Safari terbaru.';
      return;
    }
    startButton.disabled = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      video.srcObject = stream;
      await video.play();
      showLive();
      note.textContent = 'Pilih filter, lalu tekan tombol bulat untuk mengambil foto.';
    } catch (error) {
      note.textContent = error.name === 'NotAllowedError'
        ? 'Izin kamera ditolak. Izinkan akses kamera di pengaturan browser, lalu coba lagi.'
        : 'Kamera tidak dapat dibuka. Pastikan tidak sedang dipakai aplikasi lain.';
    } finally {
      startButton.disabled = false;
    }
  });

  const countdown = async () => {
    for (const number of [3, 2, 1]) {
      count.textContent = number;
      count.classList.remove('pop');
      void count.offsetWidth;
      count.classList.add('pop');
      await new Promise((resolve) => { setTimeout(resolve, 900); });
    }
    count.textContent = '';
  };

  shotButton.addEventListener('click', async () => {
    shotButton.disabled = true;
    await countdown();
    flash.classList.remove('go');
    void flash.offsetWidth;
    flash.classList.add('go');

    const W = 900;
    const H = 1200;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.max(W / vw, H / vh);
    const sw = W / scale;
    const sh = H / scale;
    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, W, H);
    ctx.restore();
    applyPixelFilter(ctx, W, H, current);
    await document.fonts.load('96px "Pinyon Script"').catch(() => {});
    drawBoothFrame(ctx, W, H, title, dateText);

    resultBlob = await new Promise((resolve) => { canvas.toBlob(resolve, 'image/jpeg', 0.92); });
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(resultBlob);
    result.src = resultUrl;
    download.href = resultUrl;

    stage.classList.add('has-result');
    result.hidden = false;
    video.hidden = true;
    filters.hidden = true;
    shotButton.hidden = true;
    shotButton.disabled = false;
    download.hidden = false;
    retake.hidden = false;
    const file = new File([resultBlob], 'swafoto-pernikahan.jpg', { type: 'image/jpeg' });
    share.hidden = !navigator.canShare?.({ files: [file] });
    stopCamera();
    note.textContent = 'Foto siap. Simpan atau bagikan sebagai kenang-kenangan.';
  });

  share.addEventListener('click', async () => {
    const file = new File([resultBlob], 'swafoto-pernikahan.jpg', { type: 'image/jpeg' });
    try {
      await navigator.share({ files: [file], title: `The Wedding of ${title}` });
    } catch (error) {
      if (error.name !== 'AbortError') showToast('Gagal membagikan foto');
    }
  });

  retake.addEventListener('click', () => {
    startButton.click();
  });
}

/* ---------- Gulir: animasi muncul, navigasi, progres, dan paralaks ---------- */

function setupReveal() {
  const elements = document.querySelectorAll('[data-anim]');
  if (!('IntersectionObserver' in window) || REDUCED_MOTION) {
    elements.forEach((element) => element.classList.add('in'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  elements.forEach((element) => observer.observe(element));
}

function setupNavHighlight() {
  if (!('IntersectionObserver' in window)) return;
  const links = [...document.querySelectorAll('.bottom-nav a:not([hidden])')];
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => {
        if (link.getAttribute('href') === `#${entry.target.id}`) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((link) => observer.observe(document.querySelector(link.getAttribute('href'))));
}

function setupScrollEffects() {
  const progress = document.getElementById('scroll-progress');
  const timeline = document.getElementById('story');
  const parallax = REDUCED_MOTION ? [] : [...document.querySelectorAll('[data-parallax]')];
  let queued = false;

  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;

    const rect = timeline.getBoundingClientRect();
    const filled = (window.innerHeight * 0.7 - rect.top) / rect.height;
    timeline.style.setProperty('--progress', Math.min(1, Math.max(0, filled)).toFixed(3));

    parallax.forEach((element) => {
      const box = element.parentElement.getBoundingClientRect();
      if (box.bottom < 0 || box.top > window.innerHeight) return;
      element.style.translate = `0 ${(-box.top * Number(element.dataset.parallax)).toFixed(1)}px`;
    });
  };
  const request = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
}

/* ---------- Mulai ---------- */

function getGuestName() {
  const name = new URLSearchParams(window.location.search).get('to');
  return name ? name.trim().slice(0, GUEST_NAME_MAX) : '';
}

let opened = false;
function openInvitation({ focus = true } = {}) {
  if (opened) return;
  opened = true;
  const cover = document.getElementById('cover');
  document.body.classList.remove('is-locked');
  document.body.classList.add('is-open');
  cover.classList.add('is-open');
  if (focus) document.getElementById('content').focus({ preventScroll: true });
  setTimeout(() => { cover.hidden = true; }, REDUCED_MOTION ? 50 : 2200);
  startPetals();
}

async function init() {
  const openButton = document.getElementById('open-invitation');
  openButton.disabled = true;
  const guest = getGuestName();
  if (guest) document.getElementById('guest-name').textContent = guest;

  try {
    const data = await loadFile(DATA_FILE, 'json');
    const { bride, groom } = data.couple;
    const title = `${bride.nickname} & ${groom.nickname}`;
    const firstEvent = data.events[0];
    const { timeZone } = data.schedule;

    document.title = `The Wedding of ${title}`;
    document.getElementById('cover-initials').textContent = `${bride.nickname[0]}&${groom.nickname[0]}`;
    renderAnimatedNames(document.getElementById('cover-names'), bride.nickname, groom.nickname);
    renderAnimatedNames(document.getElementById('hero-names'), bride.nickname, groom.nickname);
    renderAnimatedNames(document.getElementById('closing-names'), bride.nickname, groom.nickname);

    const longDate = firstEvent.start ? formatDate(firstEvent.start, timeZone) : 'Tanggal segera diumumkan';
    const shortDate = firstEvent.start ? formatNumericDate(firstEvent.start, timeZone) : 'Segera';
    document.getElementById('cover-date').textContent = longDate;
    document.getElementById('hero-date').textContent = shortDate;
    document.getElementById('music-credit').textContent = MUSIC.credit;

    await bindText();
    renderPeople(data.couple);
    renderStory(data.story.chapters);
    renderEvents(data.events, data.schedule, title);
    renderGuestInfo(data.guestInfo.items);
    renderGifts(data.gifts.accounts);
    setupRsvp(data.rsvp.whatsapp, title, guest);
    setupPhotobooth(title, longDate);
    if (firstEvent.start) startCountdown(firstEvent.start);
    const playMusic = setupMusic(MUSIC.src);
    setupReveal();
    setupNavHighlight();
    setupScrollEffects();

    const draft = await getEnv(ENV_FILE, 'DRAFT_MODE').catch(() => 'false');
    document.getElementById('draft-banner').hidden = draft !== 'true';

    openButton.disabled = false;
    openButton.addEventListener('click', () => {
      playMusic(); // Browser hanya mengizinkan suara setelah tamu menekan tombol.
      openInvitation();
    });

    const section = document.getElementById(window.location.hash.slice(1));
    if (section) {
      openInvitation({ focus: false });
      section.scrollIntoView();
    }
  } catch (error) {
    console.error(error);
    openButton.hidden = true;
    const message = document.getElementById('load-error');
    message.textContent = window.location.protocol === 'file:'
      ? 'Buka undangan lewat server lokal atau link GitHub Pages, bukan langsung dari file.'
      : 'Isi undangan gagal dimuat. Silakan muat ulang halaman ini.';
    message.hidden = false;
  }
}

init();
