const DATA_FILE = 'data/wedding.json';
const ENV_FILE = 'config/public.env';
const GUEST_NAME_MAX = 60;
const PENDING_TEXT = 'Menyusul';

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

// getJson('data/wedding.json', 'couple.bride.nickname')
async function getJson(file, key) {
  const data = await loadFile(file, 'json');
  return key.split('.').reduce((value, part) => value?.[part], data);
}

// getEnv('config/public.env', 'DRAFT_MODE')
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
    const value = await getJson(DATA_FILE, element.dataset.key);
    setOptionalText(element, value);
  }));
}

function renderPeople(couple) {
  const template = document.getElementById('person-template');
  document.querySelectorAll('[data-person]').forEach((container) => {
    const person = couple[container.dataset.person];
    const node = template.content.cloneNode(true);
    node.querySelector('.person-initial').textContent = person.nickname.charAt(0);
    node.querySelector('.person-role').textContent = person.role;
    node.querySelector('.person-name').textContent = person.fullName;
    setOptionalText(node.querySelector('.person-title'), person.title);
    node.querySelector('.person-parents').textContent =
      `${person.childOrder} dari Bapak ${person.father} dan Ibu ${person.mother}`;
    setOptionalText(node.querySelector('.person-origin'), person.origin);
    container.replaceChildren(node);
  });
}

function renderStory(chapters) {
  // Bagian cerita baru tampil setelah isinya ada.
  if (!chapters.length) {
    document.getElementById('cerita').hidden = true;
    return;
  }
  const nodes = chapters.map(({ title, text }) => {
    const item = document.createElement('li');
    const heading = document.createElement('h3');
    const body = document.createElement('p');
    heading.textContent = title;
    body.textContent = text;
    item.append(heading, body);
    return item;
  });
  document.getElementById('story').replaceChildren(...nodes);
}

function formatDate(iso, timeZone) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone,
  }).format(new Date(iso));
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
  // Acara tanpa jam selesai dicatat berdurasi dua jam di kalender.
  const end = event.end || new Date(new Date(event.start).getTime() + 2 * 3600 * 1000).toISOString();
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${event.name} ${title}`,
    dates: `${calendarDate(event.start)}/${calendarDate(end)}`,
    location: `${event.venue}, ${event.address}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

// "09.00 WIB", "11.00 WIB – selesai", atau "08.00 – 10.00 WIB"
function formatTimeRange(event, { timeZone, timeLabel }) {
  const start = formatTime(event.start, timeZone);
  if (event.end) return `${start} – ${formatTime(event.end, timeZone)} ${timeLabel}`;
  return event.endLabel ? `${start} ${timeLabel} – ${event.endLabel}` : `${start} ${timeLabel}`;
}

function renderEvents(events, schedule, title) {
  const template = document.getElementById('event-template');
  const { timeZone } = schedule;
  const nodes = events.map((event) => {
    const node = template.content.cloneNode(true);
    const hasSchedule = Boolean(event.start);
    const map = node.querySelector('.event-map');
    const calendar = node.querySelector('.event-calendar');

    node.querySelector('.event-name').textContent = event.name;
    setOptionalText(node.querySelector('.event-note'), event.note);
    node.querySelector('.event-date').textContent =
      hasSchedule ? formatDate(event.start, timeZone) : PENDING_TEXT;
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
      values[index].textContent = String(Math.floor(remaining / seconds)).padStart(2, '0');
      remaining %= seconds;
    });
  };
  const timer = setInterval(tick, 1000);
  tick();
}

function renderGuestInfo(items) {
  const nodes = items.map((text) => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  });
  document.getElementById('guest-info').replaceChildren(...nodes);
}

function renderGifts(accounts) {
  // Bagian hadiah dan menunya baru tampil setelah rekening diisi.
  if (!accounts.length) {
    document.getElementById('hadiah').hidden = true;
    document.querySelector('.bottom-nav a[href="#hadiah"]').hidden = true;
    return;
  }

  const template = document.getElementById('gift-template');
  const nodes = accounts.map((account) => {
    const node = template.content.cloneNode(true);
    node.querySelector('.gift-bank').textContent = account.bank;
    node.querySelector('.gift-number').textContent = account.number;
    node.querySelector('.gift-holder').textContent = `a.n. ${account.holder}`;
    const button = node.querySelector('.gift-copy');
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(account.number);
        button.textContent = 'Nomor Tersalin';
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
  if (guest) form.elements.name.value = guest;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!whatsapp) {
      note.textContent = 'Nomor WhatsApp penerima konfirmasi belum diatur.';
      note.hidden = false;
      return;
    }
    const { name, attend, count, message } = form.elements;
    const lines = [
      `Assalamu'alaikum. Konfirmasi undangan ${title}`,
      `Nama: ${name.value.trim()}`,
      `Kehadiran: ${attend.value}`,
      `Jumlah: ${count.value} orang`,
    ];
    if (message.value.trim()) lines.push(`Ucapan: ${message.value.trim()}`);
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
  audio.volume = 0.6;
  audio.addEventListener('play', () => setState(true));
  audio.addEventListener('pause', () => setState(false));
  audio.addEventListener('error', () => { toggle.hidden = true; });
  toggle.addEventListener('click', () => {
    if (audio.paused) play();
    else audio.pause();
  });

  // Berhenti saat tab ditinggalkan, lanjut lagi hanya jika sebelumnya menyala.
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

function getGuestName() {
  const name = new URLSearchParams(window.location.search).get('to');
  return name ? name.trim().slice(0, GUEST_NAME_MAX) : '';
}

function openInvitation({ focus = true } = {}) {
  document.body.classList.remove('is-locked');
  document.getElementById('cover').classList.add('is-open');
  if (focus) document.getElementById('content').focus({ preventScroll: true });
  setTimeout(() => { document.getElementById('cover').hidden = true; }, 900);
}

function setupReveal() {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -5% 0px' });

  document.querySelectorAll('.section > :not(.floral)').forEach((element) => {
    element.classList.add('reveal');
    observer.observe(element);
  });
}

function setupNavHighlight() {
  if (!('IntersectionObserver' in window)) return;
  const links = [...document.querySelectorAll('.bottom-nav a:not([hidden])')];
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => {
        const isCurrent = link.getAttribute('href') === `#${entry.target.id}`;
        if (isCurrent) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  links.forEach((link) => observer.observe(document.querySelector(link.getAttribute('href'))));
}

async function init() {
  const openButton = document.getElementById('open-invitation');
  openButton.disabled = true;
  const guest = getGuestName();
  if (guest) document.getElementById('guest-name').textContent = guest;

  try {
    const data = await loadFile(DATA_FILE, 'json');
    const title = `${data.couple.bride.nickname} & ${data.couple.groom.nickname}`;
    const firstEvent = data.events[0];

    document.title = `The Wedding of ${title}`;
    document.getElementById('cover-date').textContent = firstEvent.start
      ? formatDate(firstEvent.start, data.schedule.timeZone)
      : 'Tanggal segera diumumkan';

    await bindText();
    renderPeople(data.couple);
    renderStory(data.story.chapters);
    renderEvents(data.events, data.schedule, title);
    renderGuestInfo(data.guestInfo.items);
    renderGifts(data.gifts.accounts);
    setupRsvp(data.rsvp.whatsapp, title, guest);
    if (firstEvent.start) startCountdown(firstEvent.start);
    const playMusic = setupMusic(data.music?.src);
    setupReveal();
    setupNavHighlight();

    const draft = await getEnv(ENV_FILE, 'DRAFT_MODE').catch(() => 'false');
    document.getElementById('draft-banner').hidden = draft !== 'true';

    openButton.disabled = false;
    openButton.addEventListener('click', () => {
      playMusic(); // Browser hanya mengizinkan suara setelah tamu menekan tombol.
      openInvitation();
    });

    // Link yang menuju bagian tertentu (mis. #acara) langsung melewati sampul.
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
