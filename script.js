/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║              ANNIVERSARY WEBSITE — script.js                   ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  DAFTAR MODUL:                                                 ║
 * ║  1. Musik (Play / Pause / Auto-start)                          ║
 * ║  2. Animasi Kelopak Bunga (Canvas)                             ║
 * ║  3. Posisi Foto Cincin (Responsif — dihitung ulang saat resize) ║
 * ║  4. Scroll Reveal (Intersection Observer)                      ║
 * ║  5. Inisialisasi (DOMContentLoaded)                            ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ════════════════════════════════════════════════════════════════
   UTILITAS
════════════════════════════════════════════════════════════════ */

/**
 * Jalankan fungsi hanya sekali setelah delay (debounce).
 * Digunakan pada event resize agar tidak terlalu sering dihitung.
 * @param {Function} fn   - Fungsi yang akan dijalankan
 * @param {number}   wait - Delay dalam milidetik
 */
function debounce(fn, wait = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Konversi derajat ke radian.
 * @param {number} deg
 * @returns {number}
 */
const toRad = (deg) => (deg * Math.PI) / 180;


/* ════════════════════════════════════════════════════════════════
   1. MODUL MUSIK
   ────────────────────────────────────────────────────────────────
   - Tombol music-btn toggle play/pause
   - Auto-play saat interaksi pertama pengguna (klik/tap/scroll)
   - Status "playing" ditandai dengan kelas CSS .playing
════════════════════════════════════════════════════════════════ */
function initMusic() {
  const audio     = document.getElementById('bg-music');
  const btn       = document.getElementById('music-btn');
  const icon      = document.getElementById('music-icon');
  let   hasStarted = false;

  if (!audio || !btn) return;

  /** Perbarui tampilan tombol sesuai status audio */
  function syncUI() {
    if (audio.paused) {
      icon.textContent = '♪';
      btn.classList.remove('playing');
      btn.setAttribute('aria-label', 'Putar musik');
    } else {
      icon.textContent = '♬';
      btn.classList.add('playing');
      btn.setAttribute('aria-label', 'Jeda musik');
    }
  }

  /** Toggle play/pause saat tombol diklik */
  function toggleMusic() {
    if (audio.paused) {
      audio.play().catch(() => {
        // Browser memblokir autoplay — tidak ada aksi
      });
    } else {
      audio.pause();
    }
    syncUI();
  }

  btn.addEventListener('click', toggleMusic);
  audio.addEventListener('play',  syncUI);
  audio.addEventListener('pause', syncUI);

  /**
   * Auto-play saat pengguna pertama kali berinteraksi.
   * Ini diperlukan karena browser modern memblokir autoplay
   * sebelum ada interaksi pengguna.
   */
  function attemptAutoPlay() {
    if (hasStarted) return;
    hasStarted = true;
    audio.play().then(syncUI).catch(() => {
      syncUI(); // Tetap perbarui UI walau play gagal
    });
  }

  // Dengarkan berbagai bentuk interaksi pertama
  ['click', 'touchstart', 'keydown', 'scroll'].forEach((evt) => {
    document.addEventListener(evt, attemptAutoPlay, { once: true, passive: true });
  });
}


/* ════════════════════════════════════════════════════════════════
   2. MODUL ANIMASI KELOPAK BUNGA (Canvas)
   ────────────────────────────────────────────────────────────────
   Menggambar kelopak bunga / hati yang jatuh di latar belakang.
   Menggunakan requestAnimationFrame untuk performa optimal.
════════════════════════════════════════════════════════════════ */
function initPetals() {
  const canvas = document.getElementById('petals-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, petals = [];
  let animId;

  /* Warna dan bentuk kelopak */
  const COLORS = ['#F2C4CE', '#C8536A', '#FDF0F3', '#C9A96E', '#ffd6e0', '#e8a0b4'];
  const SHAPES = ['❤', '•', '✦', '✿'];

  /** Tentukan jumlah kelopak sesuai lebar layar */
  function petalCount() {
    if (W < 480)  return 14;
    if (W < 768)  return 20;
    if (W < 1200) return 28;
    return 36;
  }

  /** Buat satu kelopak dengan nilai acak */
  function makePetal() {
    return {
      x:     Math.random() * W,
      y:     -30,
      size:  8 + Math.random() * 18,
      speed: 0.5 + Math.random() * 1.5,
      drift: (Math.random() - 0.5) * 0.9,
      spin:  (Math.random() - 0.5) * 0.045,
      angle: Math.random() * Math.PI * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      alpha: 0.4 + Math.random() * 0.6,
    };
  }

  /** Sesuaikan ukuran canvas dengan ukuran jendela */
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  /** Inisialisasi semua kelopak, sebagian di posisi acak (tidak semuanya dari atas) */
  function populate() {
    const count = petalCount();
    petals = [];
    for (let i = 0; i < count; i++) {
      const p = makePetal();
      if (i < count * 0.7) {
        p.y = Math.random() * H; // Scatter awal agar tidak semuanya dari atas
      }
      petals.push(p);
    }
  }

  /**
   * Periksa apakah animasi perlu dijeda (prefers-reduced-motion).
   * Jika ya, canvas tetap ada tapi tidak digambar ulang terus-menerus.
   */
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /** Loop animasi utama */
  function draw() {
    if (prefersReduced.matches) {
      ctx.clearRect(0, 0, W, H);
      return; // Hentikan animasi jika pengguna pilih reduced motion
    }

    ctx.clearRect(0, 0, W, H);

    petals.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.font = `${p.size}px Arial, sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.shape, 0, 0);
      ctx.restore();

      // Update posisi
      p.y     += p.speed;
      p.x     += p.drift;
      p.angle += p.spin;

      // Reset jika sudah keluar layar
      if (p.y > H + 40 || p.x < -40 || p.x > W + 40) {
        Object.assign(p, makePetal());
      }
    });

    animId = requestAnimationFrame(draw);
  }

  // Pause saat tab tidak aktif (hemat resource)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      animId = requestAnimationFrame(draw);
    }
  });

  window.addEventListener('resize', debounce(() => {
    resize();
    populate();
  }, 200));

  resize();
  populate();
  draw();
}


/* ════════════════════════════════════════════════════════════════
   3. MODUL POSISI FOTO CINCIN (RESPONSIF)
   ────────────────────────────────────────────────────────────────
   Menghitung posisi setiap slot foto menggunakan trigonometri,
   berdasarkan ukuran aktual .ring-stage saat itu.
   Dipanggil ulang setiap kali jendela di-resize.
════════════════════════════════════════════════════════════════ */
function initRing() {
  const stage = document.getElementById('ring-stage');
  if (!stage) return;

  /**
   * Hitung dan terapkan posisi + ukuran semua slot foto.
   * slotSize dihitung dari lebar stage — TIDAK membaca dari DOM
   * agar tidak terjadi bug "slot pertama baca ukurannya sendiri yang belum di-set".
   */
  function positionSlots() {
    const stageW = stage.offsetWidth;
    const stageH = stage.offsetHeight;

    // Jika stage belum di-render (offsetWidth = 0), tunda sebentar
    if (stageW === 0) {
      requestAnimationFrame(positionSlots);
      return;
    }

    const cx = stageW / 2;
    const cy = stageH / 2;

    // Ukuran slot = 22% dari lebar stage, dibatasi min 52px, max 120px
    // Dihitung dari stage — BUKAN dari elemen slot itu sendiri
    const slotSize = Math.min(120, Math.max(52, Math.round(stageW * 0.22)));
    const slotHalf = slotSize / 2;

    /**
     * Set posisi dan ukuran satu slot foto.
     * @param {Element} el       - Elemen .photo-slot
     * @param {number}  angleDeg - Sudut dalam derajat (0 = jam 12)
     * @param {number}  radius   - Jarak dari pusat stage (px)
     */
    function place(el, angleDeg, radius) {
      if (!el) return;
      const rad = toRad(angleDeg - 90);
      const x   = cx + radius * Math.cos(rad) - slotHalf;
      const y   = cy + radius * Math.sin(rad) - slotHalf;

      el.style.cssText = [
        `left: ${x}px`,
        `top: ${y}px`,
        `width: ${slotSize}px`,
        `height: ${slotSize}px`,
        `border-radius: 50%`,
        `overflow: hidden`,
      ].join('; ');
    }

    // Radius cincin: proporsi dari lebar stage
    const rInner = stageW * 0.30;   // Cincin dalam  — 30%
    const rOuter = stageW * 0.435;  // Cincin luar   — 43.5%

    // Cincin Dalam: 4 slot, tiap 90°
    stage.querySelectorAll('.ring-orbit--inner .photo-slot')
      .forEach((el, i) => place(el, i * 90, rInner));

    // Cincin Luar: 6 slot, tiap 60°
    stage.querySelectorAll('.ring-orbit--outer .photo-slot')
      .forEach((el, i) => place(el, i * 60, rOuter));

    // Sesuaikan ukuran font emoji agar proporsional dengan slot
    const emojiFontSize = Math.round(slotSize * 0.45);
    stage.querySelectorAll('.photo-slot').forEach((el) => {
      // Hanya ubah font-size jika tidak ada <img> di dalamnya
      if (!el.querySelector('img')) {
        el.style.fontSize = `${emojiFontSize}px`;
      }
    });
  }

  // Jalankan pertama kali setelah layout browser selesai
  requestAnimationFrame(positionSlots);

  // Hitung ulang saat resize
  window.addEventListener('resize', debounce(positionSlots, 120));

  // Hitung ulang setelah semua aset (gambar, font) selesai dimuat
  window.addEventListener('load', positionSlots);
}


/* ════════════════════════════════════════════════════════════════
   4. MODUL SCROLL REVEAL (Intersection Observer)
   ────────────────────────────────────────────────────────────────
   Elemen dengan class berikut akan muncul saat digulir ke layar:
     - .js-reveal       → fade up (section, letter, closing)
     - .js-reveal-quote → fade up quote strip
     - .js-reveal-tl    → slide dari kiri (timeline items)

   Menggunakan IntersectionObserver agar performa lebih baik
   daripada event scroll biasa.
════════════════════════════════════════════════════════════════ */
function initScrollReveal() {

  /** Opsi observer default */
  const observerOptions = {
    threshold: 0.12,   // Elemen harus 12% terlihat sebelum trigger
    rootMargin: '0px 0px -40px 0px', // Offset dari bawah viewport
  };

  /** Buat observer yang tambahkan kelas .is-visible pada elemen */
  function makeObserver(extraOptions = {}) {
    return new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target); // Hanya trigger sekali
        }
      });
    }, { ...observerOptions, ...extraOptions });
  }

  // Observer untuk elemen .js-reveal (fade up umum)
  const revealObs = makeObserver();
  document.querySelectorAll('.js-reveal').forEach((el) => revealObs.observe(el));

  // Observer untuk quote strip
  const quoteObs = makeObserver({ threshold: 0.2 });
  document.querySelectorAll('.js-reveal-quote').forEach((el) => quoteObs.observe(el));

  // Observer untuk timeline items (trigger lebih cepat)
  const tlObs = makeObserver({ threshold: 0.08 });
  document.querySelectorAll('.js-reveal-tl').forEach((el, i) => {
    // Tambahkan delay bertahap untuk efek cascade
    el.style.transitionDelay = `${i * 0.1}s`;
    tlObs.observe(el);
  });

  // Observer untuk closing section items
  const closingObs = makeObserver({ threshold: 0.15 });
  document.querySelectorAll('.closing .js-reveal').forEach((el, i) => {
    el.style.transitionDelay = `${i * 0.15}s`;
    closingObs.observe(el);
  });
}


/* ════════════════════════════════════════════════════════════════
   5. INISIALISASI UTAMA
   ────────────────────────────────────────────────────────────────
   Jalankan semua modul setelah DOM selesai dimuat.
════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  initMusic();        // 🎵 Musik background
  initPetals();       // 🌸 Animasi kelopak bunga
  initRing();         // 🔄 Posisi foto cincin responsif
  initScrollReveal(); // ✨ Reveal on scroll

  /**
   * ── Cegah context menu pada foto cincin (opsional) ──
   * Pengguna tidak bisa klik kanan untuk menyimpan foto
   * yang ada di dalam cincin putar.
   * Hapus blok ini jika kamu ingin mengizinkan.
   */
  document.querySelectorAll('.photo-slot img').forEach((img) => {
    img.addEventListener('contextmenu', (e) => e.preventDefault());
  });

});

/**
 * ── Hitung ulang posisi cincin setelah semua aset dimuat ──
 * Ini memastikan ukuran slot sudah benar setelah font dan gambar
 * selesai dirender oleh browser.
 */
window.addEventListener('load', () => {
  initRing();
});