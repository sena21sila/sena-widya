// ============================================================
//  V11 — DARK VINTAGE GOLD POSTCARD
//  Struktur: V9 (Rustic Postcard) | Warna: V1 (Dark Luxury Gold)
//  Layout:   2-kolom hero di desktop ≥1024px, single col mobile
// ============================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby6-9XACW2cOPFGpBIVxa0-tSSDar3JRhy6rk_NJ2YXfFUp37l8kfDEWoscB30CyCzeKg/exec";
const STATIC = {
  couple: "Sena & Widya",
  date:   "Rabu, 27 Mei 2026",
  time:   "14.00",
  place:  "Br. Grokgak Gg. Bima No. 5 Sempidi, Mengwi, Badung"
};
const MEDIA = {
  hero:   "https://res.cloudinary.com/drijzjqnq/video/upload/v1774483234/hero_rxzpuz.mp4",
  pria:   "https://res.cloudinary.com/drijzjqnq/image/upload/f_auto,q_auto/v1774483119/foto-pria_ldildu.webp",
  wanita: "https://res.cloudinary.com/drijzjqnq/image/upload/f_auto,q_auto/v1774483120/foto-wanita_atjfr4.webp",
  galeri: [
    "https://res.cloudinary.com/drijzjqnq/image/upload/f_auto,q_auto/v1774483120/galeri-1_vudpqq.webp",
    "https://res.cloudinary.com/drijzjqnq/image/upload/f_auto,q_auto/v1774483120/galeri-2_byvqkr.webp",
    "https://res.cloudinary.com/drijzjqnq/image/upload/f_auto,q_auto/v1774483120/galeri-3_bl3l91.webp",
    "https://res.cloudinary.com/drijzjqnq/image/upload/f_auto,q_auto/v1774483122/galeri-4_jykrju.webp",
    "https://res.cloudinary.com/drijzjqnq/image/upload/f_auto,q_auto/v1774483121/galeri-5_qtwwz1.webp",
    "https://res.cloudinary.com/drijzjqnq/image/upload/f_auto,q_auto/v1774483121/galeri-6_fzgdbd.webp"
  ]
};

let guestToken = null, guestNama = "", settings = Object.assign({}, STATIC);
let cdTimer = null, assetsReady = false, dataReady = false, loaderTimer = null;
let scrollObserver = null;

// ===== LOADER =====
let loaderHidden = false;
function hideLoader() {
  if (assetsReady && dataReady && !loaderHidden) {
    loaderHidden = true;
    if (loaderTimer) clearTimeout(loaderTimer);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById('loader').classList.add('hidden');
      // Trigger typewriter setelah loader tersembunyi
      setTimeout(() => {
        const cg = document.getElementById('cover-guest');
        if (cg && cg.dataset.typingName) {
          typewriterEffect(cg, cg.dataset.typingName);
        }
      }, 400);
    }));
  }
}

// Fallback: force loader off + init animations after 6s if APIs fail
loaderTimer = setTimeout(() => {
  dataReady = true; assetsReady = true;
  hideLoader();
  // Also init animations in case DOMContentLoaded already ran
  if (!scrollObserver) { setupScrollAnim(); setupGallery(); }
  initFilmGrain();
}, 6000);

window.addEventListener('load', () => {
  assetsReady = true;
  hideLoader();
  initFilmGrain();
});

// ===== MAIN INIT =====
window.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  if (!checkAccess()) return;

  guestToken = new URLSearchParams(window.location.search).get('to');
  startCountdown(STATIC.date, STATIC.time);
  applyStaticMedia();

  const promises = [loadSettings(), loadRsvpStats(), loadRsvpSlideshow()];

  if (guestToken) {
    promises.push((async () => {
      try {
        const r = await api('getGuestByToken', { token: guestToken });
        const cg = document.getElementById('cover-guest');
        if (r.ok && r.nama) {
          guestNama = r.nama;
          const namaInput = document.getElementById('rsvp-nama');
          if (namaInput) namaInput.value = r.nama;
          // Simpan nama untuk typewriter — jangan langsung set textContent
          if (cg) cg.dataset.typingName = r.nama;
        } else {
          // Token format valid tapi tidak ada di database → BLOKIR
          const blocked  = document.getElementById('blocked-page');
          const cover    = document.getElementById('cover');
          const themeBtn = document.getElementById('theme-btn');
          const loader   = document.getElementById('loader');
          if (blocked)  blocked.classList.add('show');
          if (cover)    cover.style.display = 'none';
          if (themeBtn) themeBtn.style.display = 'none';
          if (loader)   loader.classList.add('hidden');
          dataReady = true; // Hentikan loader
          return;
        }
      } catch {
        // Jika API gagal, tampilkan sebagai Honorable Guest (fallback jaringan)
        const cg = document.getElementById('cover-guest');
        if (cg) cg.dataset.typingName = 'Honorable Guest';
      }
    })());
  } else {
    const cg = document.getElementById('cover-guest');
    if (cg) cg.dataset.typingName = 'Honorable Guest';
  }

  await Promise.all(promises);
  dataReady = true;
  hideLoader();
  setupScrollAnim();
  setupGallery();
});

// ===== ACCESS CONTROL =====
function checkAccess() {
  const t = new URLSearchParams(window.location.search).get('to');
  if (!t || !/^[A-Za-z0-9_-]{10}$/.test(t)) {
    const blocked = document.getElementById('blocked-page');
    const cover   = document.getElementById('cover');
    const themeBtn = document.getElementById('theme-btn');
    const loader  = document.getElementById('loader');
    if (blocked)  blocked.classList.add('show');
    if (cover)    cover.style.display = 'none';
    if (themeBtn) themeBtn.style.display = 'none';
    if (loader)   loader.classList.add('hidden');
    return false;
  }
  return true;
}

// ===== THEME =====
const ICON_MOON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
const ICON_SUN = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';

function toggleTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const nextTheme = isLight ? '' : 'light';
  document.documentElement.setAttribute('data-theme', nextTheme);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.innerHTML = isLight ? ICON_MOON : ICON_SUN;
  try { localStorage.setItem('inv_theme_v11', nextTheme); } catch {}
}
function initTheme() {
  try {
    const saved = localStorage.getItem('inv_theme_v11');
    const btn = document.getElementById('theme-btn');
    if (saved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (btn) btn.innerHTML = ICON_SUN;
    } else {
      if (btn) btn.innerHTML = ICON_MOON;
    }
  } catch {}
}

// ===== FILM GRAIN — V9 STYLE (adaptive dark/light) =====
function initFilmGrain() {
  const c = document.getElementById('grain-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  let w = c.width = window.innerWidth;
  let h = c.height = window.innerHeight;

  // More particles for visible grain effect
  const PARTICLE_COUNT = 120;
  const dust = Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    size: Math.random() * 2.2 + 0.3,
    type: Math.floor(Math.random() * 3), // 0=dot, 1=hscratck, 2=square
  }));

    function isLightMode() {
      return document.documentElement.getAttribute('data-theme') === 'light';
    }

    function draw() {
      w = c.width; h = c.height;
      ctx.clearRect(0, 0, w, h);

      const light = isLightMode();
      // Dark mode: bright gold grain on black bg (screen blend makes it glow)
      // Light mode: dark rich brown grain on cream bg (multiply blend makes it bold)
      const grainColor = light ? '#312313' : '#d4b47a';
      const maxAlpha   = light ? 0.75       : 0.45;
      const scratchAlpha = light ? 0.35     : 0.20;

      ctx.fillStyle   = grainColor;
      ctx.strokeStyle = grainColor;

    dust.forEach((d, i) => {
      // Random jitter — each frame grain moves slightly (old film feel)
      d.x += (Math.random() - 0.5) * 6;
      d.y += (Math.random() - 0.5) * 6;
      if (d.x < 0) d.x = w; if (d.x > w) d.x = 0;
      if (d.y < 0) d.y = h; if (d.y > h) d.y = 0;

      // ~75% of particles visible each frame (flickering grain)
      if (Math.random() > 0.25) {
        ctx.globalAlpha = Math.random() * maxAlpha + 0.05;
        ctx.beginPath();
        if (d.type === 0) {
          // Round dust dot
          ctx.arc(d.x, d.y, d.size * 0.65, 0, Math.PI * 2);
          ctx.fill();
        } else if (d.type === 1) {
          // Short horizontal hair/scratch
          ctx.fillRect(d.x, d.y, d.size * 3, 0.7);
        } else {
          // Tiny square grain
          ctx.fillRect(d.x, d.y, d.size * 0.9, d.size * 0.9);
        }
      }
    });

    // Occasional long vertical film scratch (~35% chance each frame)
    if (Math.random() > 0.65) {
      const x       = Math.random() * w;
      const yStart  = Math.random() * h * 0.25;
      const yEnd    = yStart + h * (0.4 + Math.random() * 0.5);
      ctx.beginPath();
      ctx.moveTo(x, yStart);
      ctx.lineTo(x + (Math.random() - 0.5) * 1.5, yEnd);
      ctx.lineWidth   = Math.random() * 0.9 + 0.2;
      ctx.globalAlpha = Math.random() * scratchAlpha + 0.05;
      ctx.stroke();
    }

    // Rare bright hot-spot (frame dirt/dust on projector lens)
    if (Math.random() > 0.92) {
      const rx = Math.random() * w;
      const ry = Math.random() * h;
      ctx.globalAlpha = Math.random() * 0.18;
      ctx.beginPath();
      ctx.arc(rx, ry, Math.random() * 3 + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    // ~12fps — authentic old film speed
    if (!document.hidden) setTimeout(() => requestAnimationFrame(draw), 82);
  }

  draw();

  // Pause grain saat tab tidak terlihat (hemat resource)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) requestAnimationFrame(draw);
  });

  window.addEventListener('resize', () => {
    w = c.width  = window.innerWidth;
    h = c.height = window.innerHeight;
  });
}

// ===== OPEN INVITATION (Postcard flip & Bird Fly Away) =====
function openInvitation() {
  const seal  = document.getElementById('seal-btn');
  const cover = document.getElementById('cover');
  if (!cover || cover.classList.contains('open')) return;

  if (seal && !seal.dataset.clicked) {
    seal.dataset.clicked = '1';
    seal.classList.add('fly-away'); // Trigger animasi terbang
  }

  // Delay 1000ms agar tamu menikmati sejenak kepakan burung merpati sebelum sampul terbuka
  setTimeout(() => {
    cover.classList.add('open');
    document.body.classList.remove('no-scroll');

    setTimeout(() => {
      cover.classList.add('done');
      document.getElementById('main').classList.add('visible');
    }, 1500);
  }, 500);

  // Music fade-in
  const a = document.getElementById('bg-music');
  const src = (a.querySelector('source')?.src || a.src || '');
  if (src && !src.endsWith('/') && !src.endsWith('.html')) {
    a.volume = 0;
    a.play().catch(() => {});
    let vol = 0;
    const fade = setInterval(() => {
      if (vol < 0.75) { vol += 0.04; a.volume = Math.min(0.75, vol); }
      else clearInterval(fade);
    }, 120);
    const musicBtn = document.getElementById('music-btn');
    if (musicBtn) musicBtn.classList.add('active', 'playing');
  }
}

// ===== MUSIC CONTROL =====
function toggleMusic() {
  const a = document.getElementById('bg-music');
  const btn = document.getElementById('music-btn');
  if (a.paused) { a.play().catch(() => {}); btn.classList.add('playing'); }
  else          { a.pause(); btn.classList.remove('playing'); }
}

// ===== API =====
async function api(action, body = {}) {
  const r = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, ...body })
  });
  return r.json();
}

// ===== SETTINGS =====
async function loadSettings() {
  try {
    const r = await api('getSettings');
    if (r.ok && r.settings && Object.keys(r.settings).length) {
      settings = Object.assign({}, STATIC, r.settings);
      startCountdown(settings.date || STATIC.date, settings.time || STATIC.time);
    }
  } catch {}
}

function applyStaticMedia() {
  // Couple photos
  if (MEDIA.pria) {
    const img = document.querySelector('.couple-grid .c-polaroid:nth-child(1) img');
    if (img) img.src = MEDIA.pria;
  }
  if (MEDIA.wanita) {
    const img = document.querySelector('.couple-grid .c-polaroid:nth-child(2) img');
    if (img) img.src = MEDIA.wanita;
  }
  // Gallery
  if (MEDIA.galeri?.length) buildDynamicGallery(MEDIA.galeri);
}

function buildDynamicGallery(imgs) {
  const container = document.querySelector('#gallery-grid');
  if (!container) return;
  const rotations = [-4, 3, -2.5, 4, -3.5, 2];
  container.innerHTML = imgs.map((url, i) =>
    `<div class="polaroid reveal" style="transform:rotate(${rotations[i % rotations.length]}deg)">
      <div class="tape"></div>
      <img src="${url}" alt="Foto ${i + 1}" loading="lazy">
      <div class="polaroid-caption">Momen ${i + 1}</div>
    </div>`
  ).join('');
}

// ===== COUNTDOWN =====
function startCountdown(dateStr, timeStr) {
  if (cdTimer) clearInterval(cdTimer);
  if (!dateStr) return;

  const months = ['januari','februari','maret','april','mei','juni',
                  'juli','agustus','september','oktober','november','desember'];
  const lower = dateStr.toLowerCase();
  const day  = (lower.match(/\d+/)?.[0] || '1').padStart(2, '0');
  const mi   = months.findIndex(m => lower.includes(m));
  const yr   = lower.match(/\d{4}/)?.[0];
  if (mi < 0 || !yr) return;

  const tc = (timeStr || '14.00').replace(/\D/g, '').substring(0, 4).padEnd(4, '0');
  const target = new Date(
    `${yr}-${String(mi + 1).padStart(2,'0')}-${day}T${tc.substring(0,2)}:${tc.substring(2,4)}:00+08:00`
  );

  function tick() {
    const diff = target - Date.now();
    const pad  = n => String(Math.max(0, n)).padStart(2, '0');
    if (diff <= 0) {
      ['cd-d','cd-h','cd-m','cd-s'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '00';
      });
      clearInterval(cdTimer);
      return;
    }
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('cd-d', pad(Math.floor(diff / 864e5)));
    setEl('cd-h', pad(Math.floor((diff % 864e5) / 36e5)));
    setEl('cd-m', pad(Math.floor((diff % 36e5) / 6e4)));
    setEl('cd-s', pad(Math.floor((diff % 6e4) / 1e3)));
  }
  tick();
  cdTimer = setInterval(tick, 1000);
}

// ===== CALENDAR =====
function addToCalendar() {
  const m = document.getElementById('cal-modal');
  if (m) m.classList.add('show');
}
function closeCalendarModal() {
  const m = document.getElementById('cal-modal');
  if (m) m.classList.remove('show');
}
function openCal(type) {
  const s = settings;
  const months = ['januari','februari','maret','april','mei','juni',
                  'juli','agustus','september','oktober','november','desember'];
  const lower = (s.date || '').toLowerCase();
  const day  = (lower.match(/\d+/)?.[0] || '1').padStart(2, '0');
  const mi   = months.findIndex(m => lower.includes(m));
  const yr   = lower.match(/\d{4}/)?.[0] || '2026';
  if (mi < 0) { showToast('Tanggal belum dikonfigurasi'); return; }

  const mon  = String(mi + 1).padStart(2, '0');
  const tc   = (s.time || '1400').replace(/\D/g,'').substring(0,4).padEnd(4,'0');
  const hEnd = String(Math.min(23, parseInt(tc.substring(0,2)) + 3)).padStart(2, '0');
  const dtS  = `${yr}${mon}${day}T${tc.substring(0,2)}${tc.substring(2,4)}00`;
  const dtE  = `${yr}${mon}${day}T${hEnd}${tc.substring(2,4)}00`;
  const title = 'Pernikahan ' + (s.couple || '');
  const loc   = s.place || '';
  const desc  = 'Undangan Pernikahan ' + (s.couple || '');

  switch (type) {
    case 'google':
      window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dtS}/${dtE}&location=${encodeURIComponent(loc)}&details=${encodeURIComponent(desc)}`, '_blank');
      break;
    case 'yahoo':
      window.open(`https://calendar.yahoo.com/?v=60&title=${encodeURIComponent(title)}&st=${dtS}&et=${dtE}&desc=${encodeURIComponent(desc)}&in_loc=${encodeURIComponent(loc)}`, '_blank');
      break;
    case 'ics': {
      const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${dtS}\nDTEND:${dtE}\nSUMMARY:${title}\nDESCRIPTION:${desc}\nLOCATION:${loc}\nEND:VEVENT\nEND:VCALENDAR`;
      const blob = new Blob([ics], { type: 'text/calendar' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'Pernikahan.ics' });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      break;
    }
  }
  closeCalendarModal();
}

// ===== ADAPTIVE TY MODAL =====
function showTyModal(status, nama) {
  const CONTENT = {
    hadir: {
      eyebrow: 'Dengan Suka Cita',
      title: 'Terima Kasih',
      quote: '“Kehadiranmu adalah kado terindah yang tak ternilai harganya. Kami menantikan momen bersama yang takkan terlupakan.”',
      note: 'Sampai jumpa di hari yang membahagiakan kami. ♥',
    },
    tidak: {
      eyebrow: 'Dengan Pengertian',
      title: 'Terima Kasih',
      quote: '“Meski jarak memisahkan langkah, doa dan restu yang kau panjatkan telah menghangatkan hati kami.”',
      note: 'Ketulusan doamu adalah kehadiran yang paling berarti bagi kami.',
    },
    ragu: {
      eyebrow: 'Dengan Kelapangan Hati',
      title: 'Terima Kasih',
      quote: '“Apa pun yang terjadi, doa dan perhatianmu sudah lebih dari cukup untuk mengisi hari bahagia kami.”',
      note: 'Kami tetap berharap dapat bertemu denganmu kelak. ♥',
    },
  };

  const c = CONTENT[status] || CONTENT.hadir;
  const modal = document.getElementById('ty-modal');

  // Inject content
  const set = (cls, val) => { const el = modal.querySelector('.' + cls); if (el) el.innerHTML = val; };
  set('ty-eyebrow', c.eyebrow);
  set('ty-title',   c.title);
  set('ty-quote',   c.quote);
  set('ty-note',    c.note);

  // Personalise with nama if available
  const coupleEl = modal.querySelector('.ty-couple');
  if (coupleEl) {
    const personEl = modal.querySelector('.ty-persona');
    if (personEl && nama) personEl.textContent = nama + ',';
  }

  modal.classList.add('show');
}

// ===== RSVP STATS =====
async function loadRsvpStats() {
  try {
    const r = await api('getRsvpStats');
    if (r.ok) {
      const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val || 0; };
      set('stat-hadir', r.hadir);
      set('stat-tidak', r.tidak);
      set('stat-ragu',  r.ragu);
    }
  } catch {}
}

// ===== SUBMIT RSVP =====
async function submitRsvp() {
  const namaEl   = document.getElementById('rsvp-nama');
  const statusEl = document.getElementById('rsvp-status');
  const jumlahEl = document.getElementById('rsvp-jumlah');
  const pesanEl  = document.getElementById('rsvp-pesan');
  const btn      = document.getElementById('rsvp-btn');

  let nama = namaEl.value.trim();
  if (!nama) {
    namaEl.style.animation = 'shake 0.4s';
    setTimeout(() => namaEl.style.animation = '', 400);
    showToast('Nama wajib diisi');
    return;
  }

  nama = nama.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  namaEl.value = nama;

  const status  = statusEl.value;
  const jumlah  = parseInt(jumlahEl.value) || 1;
  const catatan = pesanEl.value.trim();

  // Cek atau Buat Device ID (Session) di LocalStorage
  let deviceId = localStorage.getItem('sw_guest_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem('sw_guest_device_id', deviceId);
  }

  btn.disabled = true; btn.textContent = 'Mengirim...';
  try {
    const r = await api('submitRsvp', {
      idTamu: guestToken || 'publik',
      deviceId: deviceId, // <== Payload Opsi 3 Hybrid
      nama, status, jumlah, catatan
    });
    if (r.ok) {
      showToast('Terkonfirmasi!');
      showTyModal(status, nama);
      btn.textContent = 'Terkirim ✓';
      await Promise.all([loadRsvpStats(), loadRsvpSlideshow()]);
    } else {
      showToast('Gagal: ' + (r.msg || 'coba lagi'));
      btn.disabled = false; btn.textContent = 'Kirim Buku Tamu';
    }
  } catch {
    showToast('Galat Koneksi');
    btn.disabled = false; btn.textContent = 'Kirim Buku Tamu';
  }
}

// ===== RESET RSVP BUTTON saat user ubah input =====
(function setupRsvpReset() {
  const watchIds = ['rsvp-nama', 'rsvp-status', 'rsvp-jumlah', 'rsvp-pesan'];
  function tryAttach() {
    const btn = document.getElementById('rsvp-btn');
    if (!btn) return;
    const reset = () => {
      if (btn.textContent.includes('Terkirim')) {
        btn.disabled = false;
        btn.textContent = 'Kirim Buku Tamu';
      }
    };
    watchIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.dataset.resetBound) {
        el.addEventListener('input', reset);
        el.addEventListener('change', reset);
        el.dataset.resetBound = '1';
      }
    });
  }
  document.addEventListener('DOMContentLoaded', tryAttach);
  // Re-try setelah cover dibuka (main visible)
  document.addEventListener('click', () => setTimeout(tryAttach, 800), { once: true });
})();

// ===== WISH WALL (3D BOOK FLIP) =====
const BOOK_SPEED = 4500; // ms per spread (faster as requested)
let bookIdx = 0, bookPrevIdx = 0;
let bookTimer = null, bookPaused = false, bookAnimating = false;
let WISHES = [];

async function loadRsvpSlideshow() {
  try {
    const r = await api('getRsvpPublic');
    if (r.ok && r.rsvp) buildBook(r.rsvp);
  } catch {}
}

function buildBook(items) {
  const outer = document.getElementById('wishwall-book');
  if (!outer) return;
  const valid = items || [];

  if (!valid.length) {
    document.getElementById('book-left').innerHTML = `<div style="text-align:center;padding:80px 20px;opacity:.3;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--muted)">Belum ada pesan tertulis</div>`;
    document.getElementById('book-right').innerHTML = '';
    return;
  }

  // Sort newest first
  WISHES = [...valid].sort((a, b) => new Date(b.waktu || 0) - new Date(a.waktu || 0));
  
  const wrap = document.getElementById('book-wrap');
  const dots = document.getElementById('book-dots');
  const spreads = Math.ceil(WISHES.length / 2);

  // Clear existing dots in case of reload
  dots.innerHTML = '';
  bookIdx = 0;
  bookPrevIdx = 0;

  for (let i = 0; i < spreads; i++) {
    const d = document.createElement('div');
    d.className = 'book-dot' + (i === 0 ? ' active' : '');
    d.onclick = () => jumpBook(i * 2);
    dots.appendChild(d);
  }

  // Hover pause
  wrap.addEventListener('mouseenter', () => { bookPaused = true;  stopBookProgress(); });
  wrap.addEventListener('mouseleave', () => { bookPaused = false; startBookAuto(); });

  // Init first spread
  document.getElementById('book-left').innerHTML = renderPage(0, true);
  document.getElementById('book-right').innerHTML = renderPage(1, false);
  updateDots();
  startBookAuto();
}

function startBookAuto() {
  clearTimeout(bookTimer);
  if (bookPaused || WISHES.length <= 2) return; // Don't auto-flip if 1 page
  startBookProgress();
  bookTimer = setTimeout(() => turnBookAuto(), BOOK_SPEED);
}

function stopBookProgress() {
  const fill = document.getElementById('book-progress');
  if(fill) {
    fill.classList.remove('running');
    fill.style.setProperty('--book-speed', BOOK_SPEED + 'ms');
  }
}

function startBookProgress() {
  const fill = document.getElementById('book-progress');
  if(fill) {
    fill.classList.remove('running');
    void fill.offsetWidth; // reflow to restart animation
    fill.style.setProperty('--book-speed', BOOK_SPEED + 'ms');
    fill.classList.add('running');
  }
}

function turnBookAuto() {
  if (bookPaused || bookAnimating || WISHES.length <= 2) return;
  const total = WISHES.length;
  bookPrevIdx = bookIdx;
  bookIdx = (bookIdx + 2) % total;
  flipBook();
}

function jumpBook(idx) {
  if (bookAnimating || idx === bookIdx || WISHES.length <= 2) return;
  bookPrevIdx = bookIdx;
  bookIdx = idx;
  flipBook();
}

function flipBook() {
  if (bookAnimating) return;
  bookAnimating = true;
  clearTimeout(bookTimer);

  const L = document.getElementById('book-left');
  const R = document.getElementById('book-right');
  const flipper = document.getElementById('book-flipper');
  const fFront = document.getElementById('flipper-front');
  const fBack = document.getElementById('flipper-back');

  fFront.innerHTML = renderPage(bookPrevIdx + 1, false);
  fBack.innerHTML = renderPage(bookIdx, true);

  R.innerHTML = renderPage(bookIdx + 1, false);

  flipper.classList.add('flipping');
  updateDots();

  // match CSS animation duration (0.65s)
  setTimeout(() => {
    L.innerHTML = renderPage(bookIdx, true);
    flipper.classList.remove('flipping');
    
    bookPrevIdx = bookIdx;
    bookAnimating = false;
    startBookAuto();
  }, 650);
}

function updateDots() {
  document.querySelectorAll('.book-dot').forEach((d, i) => {
    d.classList.toggle('active', i === Math.floor(bookIdx / 2));
  });
}

function renderPage(idx, isLeft) {
  const total   = WISHES.length;
  if(idx >= total && idx > 0 && total <= 2) return ''; // blank page if odd messages
  
  const w       = WISHES[idx % total];
  const spread  = Math.floor((idx % total) / 2) + 1;
  const spreads = Math.ceil(total / 2);
  const pageNum = (idx % total) + 1;

  const BADGE_MAP = { hadir: 'Bersedia Hadir', tidak: 'Mohon Maaf Belum Bisa', ragu: 'Kondisional' };
  const badge = BADGE_MAP[(w.status || '').toLowerCase()] || 'Tamu Undangan';

  let html = `
    <div class="book-page-num">— ${pageNum} —</div>
    <div class="book-ornament">✦ &nbsp; ✦ &nbsp; ✦</div>
    <p class="book-msg">"${esc(w.catatan || '')}"</p>
    <div class="book-name">${esc(w.nama || 'Tamu')}</div>
    <div class="book-badge">${badge}</div>`;
  
  if (!isLeft) {
    html += `<div style="position:absolute;bottom:14px;right:18px;font-size:9px;color:var(--muted);letter-spacing:2px">${spread} / ${spreads}</div>`;
  }
  return html;
}

// ===== GALLERY LIGHTBOX =====
let galItems = [], galIdx = 0;

function setupGallery() {
  // Only observe gallery images, NOT the hero polaroid
  const galleryPolaroids = document.querySelectorAll('#gallery-grid .polaroid, .couple-grid .c-polaroid');
  galItems = Array.from(document.querySelectorAll('#gallery-grid .polaroid img')).map(img => img.src);

  document.querySelectorAll('#gallery-grid .polaroid').forEach((item, i) => {
    item.addEventListener('click', () => {
      galIdx = i;
      const lbImg = document.getElementById('lightbox-img');
      lbImg.src = galItems[galIdx];
      document.getElementById('lightbox').classList.add('open');
    });
  });

  // Touch swipe on lightbox
  let sx = 0;
  const lb = document.getElementById('lightbox');
  lb.addEventListener('touchstart', e => sx = e.changedTouches[0].screenX, { passive: true });
  lb.addEventListener('touchend', e => {
    const ex = e.changedTouches[0].screenX;
    if (ex < sx - 40) navGallery(1);
    else if (ex > sx + 40) navGallery(-1);
  }, { passive: true });
}

function navGallery(step) {
  if (!galItems.length) return;
  galIdx = (galIdx + step + galItems.length) % galItems.length;
  const imgEl = document.getElementById('lightbox-img');
  imgEl.style.opacity = '0';
  setTimeout(() => { imgEl.src = galItems[galIdx]; imgEl.style.opacity = '1'; }, 200);
}

// ===== SCROLL REVEAL (V9 Style IntersectionObserver) =====
function setupScrollAnim() {
  if (scrollObserver) scrollObserver.disconnect();

  // Elements that should animate in on scroll
  // Note: hero elements animate via CSS class (.h-names etc) NOT here
  const SEL = [
    '.vintage-paper',
    '.cd-wrap',
    '.ev-card',
    '.maps-img',
    '.rek-card',
    '.rsvp-form',
    '.rsvp-stats',
    '.divider',
    '.watermark',
  ];

  // Add reveal to matching elements (excluding those already animated via hero)
  document.querySelectorAll(SEL.join(', ')).forEach(el => {
    if (!el.closest('#hero')) el.classList.add('reveal');
  });

  // Add reveal to gallery and couple polaroids (scroll-triggered)
  document.querySelectorAll('#gallery-grid .polaroid, .couple-grid .c-polaroid').forEach(el => {
    el.classList.add('reveal');
  });

  scrollObserver = new IntersectionObserver((entries) => {
    let delay = 0;
    entries.forEach(e => {
      if (e.isIntersecting && !e.target.classList.contains('visible')) {
        setTimeout(() => e.target.classList.add('visible'), delay);
        delay += 80;
        scrollObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => scrollObserver.observe(el));
}

// ===== UTILITIES =====
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function copyText(txt) {
  navigator.clipboard.writeText(txt)
    .then(() => showToast('Tersalin: ' + txt))
    .catch(() => showToast('Gagal menyalin'));
}

function esc(s) {
  return String(s)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

// ===== TYPEWRITER EFFECT (dari V7) =====
function typewriterEffect(el, text, speed = 55) {
  if (!el) return;
  // Jika pengguna pilih reduced motion, langsung tampilkan teks
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = text; return;
  }
  el.innerHTML = '';
  const cursor = document.createElement('span');
  cursor.className = 'typewriter-cursor';
  el.appendChild(cursor);
  let i = 0;
  const iv = setInterval(() => {
    if (i < text.length) {
      el.insertBefore(document.createTextNode(text[i++]), cursor);
    } else {
      clearInterval(iv);
      // Kursor berkedip 1.8 detik lalu hilang
      setTimeout(() => { if (cursor.parentNode) cursor.remove(); }, 1800);
    }
  }, speed);
}
