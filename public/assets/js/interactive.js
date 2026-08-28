/**
 * ============================================================
 * Romance Engine V1 — assets/js/interactive.js
 * Modul F-005: YES / NO Interaction System
 * ============================================================
 *
 * KONTRAK PUBLIK (dipakai oleh view.html — jangan diubah sepihak):
 *   window.RomanceInteractive.init({
 *     yesButton,     // elemen tombol YES
 *     noButton,      // elemen tombol NO
 *     playground,    // container relatif tempat NO menghindar
 *     reducedMotion, // boolean — hormati prefers-reduced-motion
 *     onYes          // callback saat YES dipilih (celebration)
 *   })
 *   -> controller { destroy() }  jika inisialisasi berhasil
 *   -> null                      jika elemen/kontrak tidak terpenuhi
 *      (view.html kemudian memasang fallback handler YES dasar)
 *
 * KEPUTUSAN TEKNIS TERDOKUMENTASI (NN-007):
 *  1. Tombol NO dipindahkan menggunakan `transform: translate3d`,
 *     BUKAN mengubah top/left/position. Transform tidak memicu layout
 *     ulang dan tidak mengubah flow, sehingga tidak ada overflow
 *     permanen (spesifikasi §13 & §17).
 *  2. Batas perpindahan dihitung dari rect `playground` dan viewport,
 *     sehingga NO selalu berada di area aman (tidak pernah keluar layar).
 *     Batas dihitung ulang setiap dodge → otomatis adaptif saat resize.
 *  3. Cooldown singkat + jumlah kandidat posisi terbatas (bounded)
 *     menjamin tidak ada event loop tak terbatas atau thrashing.
 *  4. Mekanisme menghindar:
 *     - pointerenter (mouse/pen)      → menghindar
 *     - touchstart (passive: false)   → menghindar + preventDefault
 *       agar click sintetis tidak sempat mendarat
 *     - keyboard (Enter/Space)        → TIDAK menghindar; click diterima
 *       dan diberi feedback shake ringan (graceful behavior untuk
 *       input method yang tidak mendukung mekanisme teleport, §13).
 *  5. Setelah MAX_DODGES, tombol NO "menyerah" dan berhenti menghindar —
 *     playful, tetapi tidak pernah memblokir atau membuat dead state.
 *  6. reduced-motion: perpindahan diterapkan instan tanpa tween,
 *     dan shake dilewati sepenuhnya.
 *  7. GSAP bersifat opsional. Jika CDN GSAP gagal dimuat, perpindahan
 *     tetap berjalan via set transform langsung (isolasi kegagalan §21).
 *  8. init() idempoten: pemanggilan berulang pada elemen yang sama
 *     mengembalikan controller yang sama, mencegah listener duplikat.
 */
(function () {
  'use strict';

  /* ==================== KONFIGURASI ==================== */

  var MAX_DODGES = 6;            // setelah ini, NO berhenti menghindar
  var DODGE_COOLDOWN_MS = 180;   // jeda antar dodge (anti event-loop)
  var ESCAPE_PADDING = 8;        // jarak aman dari tepi area
  var POINTER_AVOID_DISTANCE = 70; // jarak minimum posisi baru dari pointer
  var CANDIDATE_ATTEMPTS = 5;    // jumlah kandidat posisi (bounded)
  var DODGE_DURATION = 0.35;     // durasi tween GSAP (detik)

  /* ==================== UTILITAS ==================== */

  function isElement(value) {
    return Boolean(value && typeof value === 'object' && value.nodeType === 1);
  }

  function isGsapAvailable() {
    return Boolean(window.gsap && typeof window.gsap.to === 'function');
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  /* ==================== ENTRY POINT ==================== */

  /**
   * Inisialisasi sistem interaksi YES/NO.
   * Return controller, atau null jika kontrak tidak terpenuhi.
   * Tidak pernah melempar exception keluar.
   */
  function init(config) {
    try {
      return createController(config);
    } catch (err) {
      console.warn('[RomanceInteractive] Inisialisasi gagal; fallback dasar akan dipakai.', err);
      return null;
    }
  }

  function createController(config) {
    if (!config || typeof config !== 'object') {
      return null;
    }

    var yesButton = config.yesButton;
    var noButton = config.noButton;
    var playground = config.playground;
    var reducedMotion = Boolean(config.reducedMotion);
    var onYes = typeof config.onYes === 'function' ? config.onYes : null;

    if (!isElement(yesButton) || !isElement(noButton) || !isElement(playground)) {
      console.warn('[RomanceInteractive] Elemen interaksi tidak lengkap.');
      return null;
    }

    // Idempotensi: cegah listener duplikat jika init dipanggil ulang.
    if (noButton.__romanceInteractiveController) {
      return noButton.__romanceInteractiveController;
    }

    /* ---------- State ---------- */
    var dx = 0;
    var dy = 0;
    var dodgeCount = 0;
    var exhausted = false;   // NO sudah "menyerah" setelah MAX_DODGES
    var accepted = false;    // YES sudah dipilih
    var destroyed = false;
    var cooldownUntil = 0;
    var activeTween = null;

    /* ---------- Transform ---------- */

    function applyTransform() {
      noButton.style.transform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0)';
    }

    function killActiveTween() {
      if (activeTween && typeof activeTween.kill === 'function') {
        try {
          activeTween.kill();
        } catch (err) {
          // best-effort
        }
      }
      activeTween = null;
    }

    /**
     * Pindahkan NO ke (targetDx, targetDy) dengan tween jika tersedia,
     * atau instan jika reduced-motion / GSAP tidak ada.
     */
    function animateTo(targetDx, targetDy) {
      killActiveTween();

      if (reducedMotion || !isGsapAvailable()) {
        dx = targetDx;
        dy = targetDy;
        applyTransform();
        return;
      }

      var proxy = { px: dx, py: dy };
      activeTween = window.gsap.to(proxy, {
        px: targetDx,
        py: targetDy,
        duration: DODGE_DURATION,
        ease: 'back.out(1.4)',
        onUpdate: function () {
          dx = proxy.px;
          dy = proxy.py;
          applyTransform();
        },
        onComplete: function () {
          activeTween = null;
        }
      });
    }

    /* ---------- Batas area aman ---------- */

    /**
     * Hitung batas translate agar NO tetap berada di dalam playground
     * dan tetap terlihat di viewport. Return null jika area terlalu
     * sempit untuk menghindar (graceful: dodge dilewati).
     */
    function computeEscapeBounds() {
      var playRect = playground.getBoundingClientRect();
      var noRect = noButton.getBoundingClientRect();

      // Posisi dasar (tanpa transform) dihitung dari rect saat ini.
      var baseLeft = noRect.left - dx;
      var baseTop = noRect.top - dy;
      var width = noRect.width;
      var height = noRect.height;

      var viewWidth = window.innerWidth;
      var viewHeight = window.innerHeight;

      var minDx = Math.max(playRect.left + ESCAPE_PADDING, ESCAPE_PADDING) - baseLeft;
      var maxDx = Math.min(playRect.right - ESCAPE_PADDING, viewWidth - ESCAPE_PADDING) - baseLeft - width;
      var minDy = Math.max(playRect.top + ESCAPE_PADDING, ESCAPE_PADDING) - baseTop;
      var maxDy = Math.min(playRect.bottom - ESCAPE_PADDING, viewHeight - ESCAPE_PADDING) - baseTop - height;

      if (minDx > maxDx || minDy > maxDy) {
        return null;
      }
      return { minDx: minDx, maxDx: maxDx, minDy: minDy, maxDy: maxDy };
    }

    /* ---------- Pemilihan posisi kabur ---------- */

    /**
     * Pilih posisi acak dalam batas, dengan preferensi menjauh dari
     * pointer. Jumlah kandidat dibatasi (bounded) — tidak ada loop
     * tak terbatas.
     */
    function pickEscapeTarget(bounds, pointerX, pointerY) {
      var bestX = randomBetween(bounds.minDx, bounds.maxDx);
      var bestY = randomBetween(bounds.minDy, bounds.maxDy);
      var bestScore = -1;

      for (var attempt = 0; attempt < CANDIDATE_ATTEMPTS; attempt += 1) {
        var candidateX = randomBetween(bounds.minDx, bounds.maxDx);
        var candidateY = randomBetween(bounds.minDy, bounds.maxDy);

        if (typeof pointerX !== 'number' || typeof pointerY !== 'number') {
          bestX = candidateX;
          bestY = candidateY;
          break;
        }

        // Jarak posisi baru terhadap pointer di koordinat layar.
        var noRect = noButton.getBoundingClientRect();
        var candidateCenterX = noRect.left - dx + candidateX + noRect.width / 2;
        var candidateCenterY = noRect.top - dy + candidateY + noRect.height / 2;
        var distance = Math.sqrt(
          Math.pow(candidateCenterX - pointerX, 2) +
          Math.pow(candidateCenterY - pointerY, 2)
        );

        if (distance > bestScore) {
          bestScore = distance;
          bestX = candidateX;
          bestY = candidateY;
        }

        if (bestScore >= POINTER_AVOID_DISTANCE) {
          break; // sudah cukup jauh — tidak perlu coba lagi
        }
      }

      return { x: bestX, y: bestY };
    }

    /* ---------- Dodge (menghindar) ---------- */

    function dodge(pointerX, pointerY) {
      if (destroyed || exhausted) {
        return;
      }

      var now = Date.now();
      if (now < cooldownUntil) {
        return;
      }
      cooldownUntil = now + DODGE_COOLDOWN_MS;

      var bounds = computeEscapeBounds();
      if (!bounds) {
        // Area terlalu sempit — graceful: lewati dodge, jangan paksakan.
        return;
      }

      var target = pickEscapeTarget(bounds, pointerX, pointerY);
      dodgeCount += 1;

      if (dodgeCount >= MAX_DODGES) {
        exhausted = true;
      }

      animateTo(target.x, target.y);
    }

    /* ---------- Feedback saat NO berhasil diaktifkan ---------- */

    /**
     * Click pada NO hanya mungkin terjadi via keyboard, atau setelah
     * NO menyerah. Tidak ada perayaan — hanya feedback shake ringan.
     * Shake dilewati sepenuhnya pada reduced-motion.
     */
    function shakeNo() {
      if (destroyed || reducedMotion) {
        return;
      }

      if (typeof noButton.animate !== 'function') {
        return;
      }

      try {
        var frames = [
          'translate3d(' + dx + 'px, ' + dy + 'px, 0)',
          'translate3d(' + (dx + 7) + 'px, ' + dy + 'px, 0)',
          'translate3d(' + (dx - 7) + 'px, ' + dy + 'px, 0)',
          'translate3d(' + (dx + 4) + 'px, ' + dy + 'px, 0)',
          'translate3d(' + dx + 'px, ' + dy + 'px, 0)'
        ];
        noButton.animate(
          frames.map(function (transform) { return { transform: transform }; }),
          { duration: 320, easing: 'ease-in-out' }
        );
      } catch (err) {
        console.warn('[RomanceInteractive] Animasi shake dilewati.', err);
      }
    }

    /* ---------- Event handlers (named reference untuk cleanup) ---------- */

    function handlePointerEnter(event) {
      // Touch ditangani terpisah via touchstart (dengan preventDefault).
      if (event.pointerType === 'touch') {
        return;
      }
      dodge(event.clientX, event.clientY);
    }

    function handleTouchStart(event) {
      if (destroyed || exhausted) {
        return;
      }
      var touch = event.touches && event.touches[0];
      var touchX = touch ? touch.clientX : undefined;
      var touchY = touch ? touch.clientY : undefined;

      // Cegah click sintetis mendarat setelah tombol berpindah.
      event.preventDefault();
      dodge(touchX, touchY);
    }

    function handleNoClick() {
      if (destroyed) {
        return;
      }
      // Keyboard activation, atau click setelah NO menyerah:
      // tidak ada perayaan, hanya feedback ringan. Experience berlanjut.
      shakeNo();
    }

    function handleYesClick() {
      if (destroyed || accepted) {
        return;
      }
      accepted = true;

      if (onYes) {
        try {
          onYes();
        } catch (err) {
          // Celebration tidak boleh menyebabkan uncaught exception (§14).
          console.warn('[RomanceInteractive] Callback onYes gagal; celebration mungkin parsial.', err);
        }
      }
    }

    /* ---------- Pemasangan listener ---------- */

    noButton.addEventListener('pointerenter', handlePointerEnter);
    noButton.addEventListener('touchstart', handleTouchStart, { passive: false });
    noButton.addEventListener('click', handleNoClick);
    yesButton.addEventListener('click', handleYesClick);

    /* ---------- Cleanup ---------- */

    function destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;

      killActiveTween();

      noButton.removeEventListener('pointerenter', handlePointerEnter);
      noButton.removeEventListener('touchstart', handleTouchStart);
      noButton.removeEventListener('click', handleNoClick);
      yesButton.removeEventListener('click', handleYesClick);

      // Kembalikan tombol NO ke posisi semula.
      dx = 0;
      dy = 0;
      noButton.style.transform = '';

      delete noButton.__romanceInteractiveController;
    }

    /* ---------- Controller ---------- */

    var controller = Object.freeze({
      destroy: destroy
    });

    noButton.__romanceInteractiveController = controller;
    return controller;
  }

  /* ==================== EXPORT ==================== */

  window.RomanceInteractive = Object.freeze({
    init: init
  });
})();