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
let isGsapInited = false; // Cegah double init

// ===== LOADER =====
let loaderHidden = false;
function hideLoader() {
  if (assetsReady && dataReady && !loaderHidden) {
    loaderHidden = true;
    if (loaderTimer) clearTimeout(loaderTimer);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const loader = document.getElementById('loader');
      loader.classList.add('hidden');

      // FIX #5: Typewriter delay diperpanjang agar tidak muncul saat tirai masih terbuka
      // Animasi clip-path loader = 1.5s, jadi tunggu 1.65s sebelum typewriter mulai
      setTimeout(() => {
        const cg = document.getElementById('cover-guest');
        if (cg && cg.dataset.typingName) {
          typewriterEffect(cg, cg.dataset.typingName);
        }
      }, 1650);
    }));
  }
}

// Fallback: force loader off + init animations after 3.5s if APIs fail
// (dikurangi dari 6s → 3.5s untuk pengalaman pengguna yang lebih responsif)
loaderTimer = setTimeout(() => {
  dataReady = true; assetsReady = true;
  hideLoader();
  // Juga init animasi jika DOMContentLoaded sudah berjalan
  if (!isGsapInited) { setupGallery(); initGSAP(); isGsapInited = true; }
}, 3500);

window.addEventListener('load', () => {
  assetsReady = true;
  hideLoader();
});

// ===== LENIS SCROLL (v1.3.x) =====
let lenis;
function initLenis() {
  if (typeof Lenis === 'undefined') return;
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    // Lenis v1.3+: gunakan 'orientation' & 'gestureOrientation'
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 2,
    syncTouch: false,
  });
  // Lenis di-drive sepenuhnya oleh gsap.ticker di initGSAP()
  // agar tidak terjadi double-call lenis.raf() per frame.
}

// ===== MAIN INIT =====
// Deteksi kemampuan perangkat sekali di awal
const IS_LOW_END_DEVICE = (
  navigator.hardwareConcurrency <= 2 || // CPU 1-2 core
  navigator.deviceMemory <= 1           // RAM ≤ 1GB (jika API tersedia)
);

window.addEventListener('DOMContentLoaded', async () => {
  initLenis();
  initTheme();

  // FIX #4: Gunakan requestIdleCallback untuk init non-kritis (canvas partikel)
  // agar tidak bersaing dengan parsing HTML & rendering awal halaman.
  // Fallback ke setTimeout(0) jika browser tidak mendukung rIC (Safari lama).
  const scheduleIdle = (fn) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(fn, { timeout: 2000 });
    } else {
      setTimeout(fn, 0);
    }
  };

  // FIX #3: Canvas partikel hanya dijalankan di perangkat yang mampu
  if (!IS_LOW_END_DEVICE) {
    scheduleIdle(() => initBgCanvas());
  }

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
  // AOS TIDAK diinisialisasi di sini — dipindah ke openInvitation()
  // agar elemen tidak stuck opacity:0 sebelum #main visible
  if (!isGsapInited) {
    setupGallery();
    initGSAP();
    isGsapInited = true;
  }
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
// FIX #8: Hapus ICON_MOON / ICON_SUN constants dan penggantian innerHTML.
// Ikon dikontrol sepenuhnya oleh CSS via [data-theme] selector
// sehingga tidak ada risiko menghapus kedua SVG yang sudah ada di HTML.

function toggleTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const nextTheme = isLight ? '' : 'light';
  document.documentElement.setAttribute('data-theme', nextTheme);
  // Tidak perlu set btn.innerHTML — CSS sudah handle tampilan ikon via data-theme
  try { localStorage.setItem('inv_theme_v11', nextTheme); } catch {}
}
function initTheme() {
  try {
    const saved = localStorage.getItem('inv_theme_v11');
    // B4: Ikon sekarang dikontrol sepenuhnya oleh CSS via data-theme attribute.
    // data-theme sudah di-set oleh inline script di <head>, SEBELUM DOM render,
    // sehingga tidak ada FOUC. Fungsi ini hanya perlu sync attribute jika ada perbedaan.
    if (saved !== null) {
      document.documentElement.setAttribute('data-theme', saved === 'light' ? 'light' : '');
    }
  } catch {}
}

// ===== CUSTOM MAGNETIC CURSOR =====
// FIX #4A: Fungsi ini tidak lagi dipanggil dari hideLoader().
// Dipindah ke openInvitation() setelah #main.visible agar semua elemen
// sudah ada di DOM sebelum event listener dipasang.
function initCustomCursor() {
  const cursor = document.getElementById('custom-cursor');
  // Guard: tidak aktif di perangkat sentuh atau reduced-motion
  if (!cursor) return;
  if (window.matchMedia('(hover: none)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Gerakkan kursor mengikuti mouse
  document.addEventListener('mousemove', (e) => {
    cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
  });

  // FIX #4B: Gunakan event delegation alih-alih forEach.
  // Ini otomatis bekerja untuk elemen yang baru masuk ke DOM setelah AOS reveal.
  const HOVER_SELECTOR = 'a, button, .btn-gold, .gal-item, .c-polaroid, .lightbox-nav, .theme-btn, .music-btn, .postcard';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(HOVER_SELECTOR)) cursor.classList.add('hovering');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(HOVER_SELECTOR)) cursor.classList.remove('hovering');
  });
}

// ===== BACKGROUND CANVAS (Interactive Ambient Particles) =====
// FIX #3A: Tambahkan rafId untuk mencegah double-loop saat visibilitychange
// FIX #3B: Clamp baseX/baseY agar partikel tidak melayang ke luar layar selamanya
function initBgCanvas() {
  const c = document.getElementById('bg-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  let w = c.width = window.innerWidth;
  let h = c.height = window.innerHeight;
  let mouse = { x: w / 2, y: h / 2 };
  let rafId; // FIX #3A: Track RAF ID

  document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  const PARTICLE_COUNT = 80;
  const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    size: Math.random() * 3 + 1,
    baseX: Math.random() * w,
    baseY: Math.random() * h,
    density: (Math.random() * 20) + 1,
    angle: Math.random() * 360
  }));

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    ctx.fillStyle = light ? '#6a5218' : '#e0bf80';

    particles.forEach(p => {
      // Gerak mengambang pelan
      p.angle += 0.01;
      p.x = p.baseX + Math.cos(p.angle) * 30;
      p.y = p.baseY + Math.sin(p.angle) * 30;

      // Interaksi mouse (menjauh jika didekati)
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        const force = (150 - dist) / 150;
        // FIX #3B: Clamp baseX/baseY agar partikel tidak keluar layar
        p.baseX = Math.max(0, Math.min(w, p.baseX - dx * force * 0.05));
        p.baseY = Math.max(0, Math.min(h, p.baseY - dy * force * 0.05));
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    });

    if (!document.hidden) rafId = requestAnimationFrame(draw);
  }

  draw();

  // FIX #3A: Cancel RAF sebelum memulai yang baru (cegah double-loop)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(draw);
    }
  });

  window.addEventListener('resize', () => {
    w = c.width = window.innerWidth;
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
    seal.classList.add('fly-away');
  }

  // B2: Lazy load video hero
  const heroVid = document.getElementById('hero-video');
  if (heroVid) {
    const src = heroVid.querySelector('source[data-src]');
    if (src && !src.getAttribute('src')) {
      src.setAttribute('src', src.dataset.src);
      heroVid.load();
    }
  }

  setTimeout(() => {
    cover.classList.add('open');
    document.body.classList.remove('no-scroll');

    setTimeout(() => {
      cover.classList.add('done');
      const mainEl = document.getElementById('main');
      mainEl.classList.add('visible');

      // FIX #4A: initCustomCursor dipanggil di sini, setelah #main visible,
      // bukan di hideLoader() — sehingga semua elemen interaktif sudah ada di DOM.
      setTimeout(() => {
        initAOS();
        initCustomCursor(); // Dipanggil setelah visible & layout settle
        if (typeof AOS !== 'undefined') AOS.refresh();
      }, 200);

    }, 1500);
  }, 500);

  // B6: Music fade-in
  const a = document.getElementById('bg-music');
  const musicBtn = document.getElementById('music-btn');
  const audioSrc = (a.querySelector('source')?.src || a.src || '');
  if (audioSrc && !audioSrc.endsWith('/') && !audioSrc.endsWith('.html')) {
    a.volume = 0;
    if (musicBtn) musicBtn.classList.add('active');
    a.play().then(() => {
      if (musicBtn) musicBtn.classList.add('playing');
      let vol = 0;
      const fade = setInterval(() => {
        if (vol < 0.75) { vol += 0.04; a.volume = Math.min(0.75, vol); }
        else clearInterval(fade);
      }, 120);
    }).catch(() => {
      if (musicBtn) {
        musicBtn.classList.remove('playing');
      }
    });
  }
}

// ===== MUSIC CONTROL =====
function toggleMusic() {
  const a = document.getElementById('bg-music');
  const btn = document.getElementById('music-btn');
  if (a.paused) {
    a.play().then(() => {
      btn.classList.add('active');   // Pastikan tombol selalu terlihat
      btn.classList.add('playing');
    }).catch(() => {});
  } else {
    a.pause();
    btn.classList.remove('playing');
  }
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
  // Gallery: TIDAK rebuild di sini — tunggu sampai Swiper sudah diinit di setupGallery()
  // buildDynamicGallery() akan dipanggil dari setupGallery() setelah Swiper ready
}

function buildDynamicGallery(imgs) {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
  grid.innerHTML = imgs.map((url, i) =>
    `<div class="gal-item gsap-gallery">
      <img src="${url}" alt="Foto Prewedding Sena &amp; Widya ${i + 1}" loading="lazy">
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

  // GSAP flip animation untuk angka countdown
  function animateFlip(el) {
    if (!el || typeof gsap === 'undefined') return;
    gsap.fromTo(el,
      { y: -16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.4)' }
    );
  }

  let prevVals = { d: null, h: null, m: null, s: null };

  function tick() {
    const diff = target - Date.now();
    const pad  = n => String(Math.max(0, n)).padStart(2, '0');
    if (diff <= 0) {
      ['cd-d','cd-h','cd-m','cd-s'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '00';
      });
      const titleEl = document.querySelector('.cd-title');
      if (titleEl) {
        titleEl.textContent = '\u2756 Hari Bahagia Telah Tiba \u2756';
        titleEl.style.color = 'var(--accent)';
      }
      clearInterval(cdTimer);
      return;
    }
    const vals = {
      d: pad(Math.floor(diff / 864e5)),
      h: pad(Math.floor((diff % 864e5) / 36e5)),
      m: pad(Math.floor((diff % 36e5) / 6e4)),
      s: pad(Math.floor((diff % 6e4) / 1e3))
    };
    const idMap = { d: 'cd-d', h: 'cd-h', m: 'cd-m', s: 'cd-s' };
    Object.keys(vals).forEach(key => {
      const el = document.getElementById(idMap[key]);
      if (el) {
        if (vals[key] !== prevVals[key]) {
          el.textContent = vals[key];
          animateFlip(el); // GSAP flip hanya kalau angka berubah
        }
        prevVals[key] = vals[key];
      }
    });
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
      // RFC 5545: gunakan \r\n dan TZID eksplisit agar waktu tidak salah interpretasi sebagai UTC
      const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Undangan Sena & Widya//ID\r\nBEGIN:VEVENT\r\nDTSTART;TZID=Asia/Makassar:${dtS}\r\nDTEND;TZID=Asia/Makassar:${dtE}\r\nSUMMARY:${title}\r\nDESCRIPTION:${desc}\r\nLOCATION:${loc}\r\nSTATUS:CONFIRMED\r\nEND:VEVENT\r\nEND:VCALENDAR`;
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
      const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) {
          el.textContent = val || 0;
          // B9: Hapus skeleton shimmer setelah data nyata tiba
          el.classList.remove('loading');
        }
      };
      set('stat-hadir', r.hadir);
      set('stat-tidak', r.tidak);
      set('stat-ragu',  r.ragu);
    }
  } catch {
    // Jika gagal, hapus skeleton agar tidak stuck shimmer selamanya
    ['stat-hadir','stat-tidak','stat-ragu'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = '—'; el.classList.remove('loading'); }
    });
  }
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
  const jumlahRaw = parseInt(jumlahEl.value);
  if (isNaN(jumlahRaw) || jumlahRaw < 1 || jumlahRaw > 20) {
    jumlahEl.style.animation = 'shake 0.4s';
    setTimeout(() => jumlahEl.style.animation = '', 400);
    showToast('Jumlah rombongan tidak valid (1–20)');
    return;
  }
  const jumlah  = jumlahRaw;
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
    // Char counter untuk textarea
    const pesan   = document.getElementById('rsvp-pesan');
    const counter = document.getElementById('rsvp-char-counter');
    if (pesan && counter && !pesan.dataset.counterBound) {
      pesan.dataset.counterBound = '1';
      const maxLen = parseInt(pesan.getAttribute('maxlength') || 500);
      pesan.addEventListener('input', () => {
        const len = pesan.value.length;
        counter.textContent = len + ' / ' + maxLen;
        counter.classList.toggle('near-limit', len >= maxLen * 0.85 && len < maxLen);
        counter.classList.toggle('at-limit',   len >= maxLen);
      });
    }
  }
  document.addEventListener('DOMContentLoaded', tryAttach);
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

  // B5: Jika catatan kosong, tampilkan placeholder elegan alih-alih petik kosong ""
  const msgText = (w.catatan || '').trim();
  const msgHtml = msgText
    ? `<p class="book-msg">"${esc(msgText)}"</p>`
    : `<p class="book-msg" style="opacity:.35;font-size:.85em">— Tanpa pesan tertulis —</p>`;

  let html = `
    <div class="book-page-num">— ${pageNum} —</div>
    <div class="book-ornament">✦ &nbsp; ✦ &nbsp; ✦</div>
    ${msgHtml}
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
  if (MEDIA.galeri?.length) buildDynamicGallery(MEDIA.galeri);

  // Lightbox: ambil gambar
  function refreshGalItems() {
    galItems = Array.from(document.querySelectorAll('#gallery-grid .gal-item img'))
      .map(img => img.src);
  }
  refreshGalItems();

  // Klik gambar buka lightbox
  document.addEventListener('click', e => {
    const item = e.target.closest('#gallery-grid .gal-item');
    if (!item) return;
    refreshGalItems();
    const clickedSrc = item.querySelector('img')?.src;
    galIdx = galItems.indexOf(clickedSrc);
    if (galIdx < 0) galIdx = 0;
    
    const lbImg = document.getElementById('lightbox-img');
    lbImg.src = galItems[galIdx];
    document.getElementById('lightbox').classList.add('open');
    updateLightboxCounter();
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

  // Keyboard navigation: lightbox + buku tamu
  document.addEventListener('keydown', e => {
    const lbEl = document.getElementById('lightbox');
    if (lbEl && lbEl.classList.contains('open')) {
      if (e.key === 'ArrowRight') navGallery(1);
      if (e.key === 'ArrowLeft')  navGallery(-1);
      if (e.key === 'Escape') lbEl.classList.remove('open');
      return;
    }
    if (e.key === 'ArrowRight' && WISHES.length > 2) {
      if (!bookAnimating) turnBookAuto();
    }
    if (e.key === 'ArrowLeft' && WISHES.length > 2) {
      if (!bookAnimating) {
        bookPrevIdx = bookIdx;
        bookIdx = (bookIdx - 2 + WISHES.length) % WISHES.length;
        if (bookIdx % 2 !== 0) bookIdx = Math.max(0, bookIdx - 1);
        flipBook();
      }
    }
  });
} // end setupGallery

function navGallery(step) {
  if (!galItems.length) return;
  galIdx = (galIdx + step + galItems.length) % galItems.length;
  const imgEl = document.getElementById('lightbox-img');
  imgEl.style.opacity = '0';
  setTimeout(() => { imgEl.src = galItems[galIdx]; imgEl.style.opacity = '1'; updateLightboxCounter(); }, 200);
}

function updateLightboxCounter() {
  const counter = document.getElementById('lightbox-counter');
  if (counter && galItems.length > 1) {
    counter.textContent = (galIdx + 1) + ' / ' + galItems.length;
  }
}

// ===== AOS — ANIMATE ON SCROLL =====
function initAOS() {
  if (typeof AOS === 'undefined') return;
  AOS.init({
    duration: 800,          // Default durasi
    easing: 'ease-out-cubic',
    once: true,             // Animasi hanya sekali (tidak diulang saat scroll balik)
    offset: 60,             // Trigger 60px sebelum masuk viewport
    delay: 0,
    disable: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  });
}

// ===== GSAP =====
function initGSAP() {
  if (typeof gsap === 'undefined') return;

  // Register ScrollTrigger plugin
  if (typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    // Parallax halus pada background countdown
    gsap.to('.cd-bg', {
      yPercent: -15,
      ease: 'none',
      scrollTrigger: {
        trigger: '.cd-section',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    });

    // Animasi parallax backgroundPositionY pada footer 
    // telah dihapus karena membebani CPU/GPU pada perangkat mobile (menyebabkan patah-patah).

    // Ornamen bunga section muncul dengan rotate + scale
    gsap.utils.toArray('.theme-flower, .theme-flower-2, .theme-flower-3, .theme-flower-4, .theme-flower-5, .theme-flower-6').forEach(el => {
      gsap.fromTo(el,
        { scale: 0, rotation: -45, opacity: 0 },
        {
          scale: 1, rotation: 0, opacity: 1,
          duration: 1.2, ease: 'elastic.out(1, 0.5)',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        }
      );
    });

    // Divider lines grow dari tengah
    gsap.utils.toArray('.divider').forEach(el => {
      gsap.fromTo(el,
        { scaleX: 0, opacity: 0 },
        {
          scaleX: 1, opacity: 1,
          duration: 1, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true }
        }
      );
    });

    // Lenis di-drive oleh gsap.ticker (satu-satunya RAF loop).
    if (lenis) {
      // Lenis v1.3+ menggunakan method lenis.raf(time) — waktu dalam ms
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
      // Sinkronisasi ScrollTrigger setiap kali Lenis scroll event terjadi
      lenis.on('scroll', ScrollTrigger.update);
    }

    // Animasi Galeri (Stagger Grid ala V11 Pro)
    if (document.querySelector('.gsap-gallery')) {
      gsap.fromTo('.gsap-gallery',
        { scale: 0.85, opacity: 0, y: 50, rotationY: 10 },
        {
          scale: 1, opacity: 1, y: 0, rotationY: 0,
          duration: 1.2,
          stagger: 0.15,
          ease: 'power3.out',
          force3D: true,
          scrollTrigger: {
            trigger: '#gallery-grid',
            start: 'top 85%',
            once: true
          }
        }
      );
    }
  }
}


// ===== SCROLL REVEAL (dipertahankan sebagai fallback jika AOS tidak tersedia) =====
function setupScrollAnim() {
  if (typeof AOS !== 'undefined') {
    initAOS(); // Delegasikan ke AOS
    return;
  }

  // Fallback IntersectionObserver jika AOS gagal load
  if (scrollObserver) scrollObserver.disconnect();

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

  document.querySelectorAll(SEL.join(', ')).forEach(el => {
    if (!el.closest('#hero')) el.classList.add('reveal');
  });

  document.querySelectorAll('#gallery-grid .gal-item, .couple-grid .c-polaroid').forEach(el => {
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
