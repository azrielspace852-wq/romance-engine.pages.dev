/**
 * ============================================================
 * Romance Engine V1 — assets/js/audio-player.js
 * Modul F-003: Gesture Audio Gateway
 * ============================================================
 *
 * KONTRAK PUBLIK (dipakai oleh view.html — jangan diubah sepihak):
 *   window.RomanceAudio.init({ musicUrl, defaultBgmSrc, chimeSrc })
 *     -> controller { unlock(), toggleMute(), playChime(), destroy(), isMuted }
 *     -> null jika audio tidak tersedia / inisialisasi gagal
 *        (view.html melanjutkan experience tanpa suara)
 *
 * KEPUTUSAN TEKNIS TERDOKUMENTASI (NN-007):
 *  1. Tidak ada autoplay sebelum user gesture. `unlock()` adalah satu-satunya
 *     titik yang memanggil `HTMLMediaElement.play()`, dan view.html menjamin
 *     pemanggilannya terjadi langsung di dalam click handler gateway (F-003).
 *  2. Prioritas sumber BGM: custom musicUrl -> default-bgm.mp3.
 *     Pergantian ke fallback terjadi via event 'error' pada elemen BGM;
 *     flag `usingFallback` mencegah loop fallback berulang.
 *  3. Keputusan mute: mute memengaruhi BGM dan chime sekaligus.
 *     Label tombol adalah "Musik" sehingga user mengharapkan seluruh audio
 *     halaman ikut diam saat dimatikan. Celebration tetap memiliki feedback
 *     visual penuh (confetti + scene) tanpa bergantung pada suara.
 *  4. `crossOrigin` sengaja TIDAK diset. Menyetelnya dapat mengubah request
 *     menjadi CORS request dan menggagalkan playback URL yang servernya
 *     tidak mengirim header CORS — padahal playback audio tidak membutuhkannya.
 *  5. Semua operasi audio dibungkus try/catch dan promise rejection ditangani,
 *     sehingga kegagalan audio tidak pernah menjadi uncaught exception (NN-010).
 *  6. Event listener disimpan sebagai named reference dan dilepas di destroy()
 *     untuk menghindari memory leak (§17).
 */
(function () {
  'use strict';

  /* ==================== KONFIGURASI ==================== */

  var BGM_VOLUME = 0.6;
  var CHIME_VOLUME = 0.85;

  /* ==================== UTILITAS ==================== */

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /* ==================== ENTRY POINT ==================== */

  /**
   * Inisialisasi audio controller. Return controller, atau null jika
   * audio tidak tersedia. Tidak pernah melempar exception keluar.
   */
  function init(config) {
    try {
      return createAudioController(config);
    } catch (err) {
      console.warn('[RomanceAudio] Inisialisasi audio gagal; experience dilanjutkan tanpa suara.', err);
      return null;
    }
  }

  function createAudioController(config) {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      return null;
    }

    var customMusicUrl = config && isNonEmptyString(config.musicUrl)
      ? config.musicUrl.trim()
      : null;
    var defaultBgmSrc = config && isNonEmptyString(config.defaultBgmSrc)
      ? config.defaultBgmSrc.trim()
      : null;
    var chimeSrc = config && isNonEmptyString(config.chimeSrc)
      ? config.chimeSrc.trim()
      : null;

    if (!customMusicUrl && !defaultBgmSrc) {
      return null;
    }

    /* ---------- State ---------- */
    var muted = false;
    var unlocked = false;
    var destroyed = false;
    var usingFallback = !customMusicUrl;

    /* ---------- Elemen audio ---------- */

    var bgm = document.createElement('audio');
    bgm.loop = true;
    bgm.preload = 'auto';
    bgm.volume = BGM_VOLUME;

    var chime = null;
    if (chimeSrc) {
      chime = document.createElement('audio');
      chime.preload = 'auto';
      chime.volume = CHIME_VOLUME;
      chime.src = chimeSrc;
      chime.load();
    }

    function setBgmSource(src) {
      bgm.src = src;
      bgm.load();
    }

    if (customMusicUrl) {
      setBgmSource(customMusicUrl);
    } else {
      setBgmSource(defaultBgmSrc);
    }

    /* ---------- Playback helper ---------- */

    function tryPlay() {
      if (destroyed) {
        return;
      }
      try {
        var playPromise = bgm.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(function (err) {
            if (err && err.name === 'NotAllowedError') {
              console.warn('[RomanceAudio] Autoplay diblokir browser; audio menunggu gesture berikutnya.');
            } else if (err && err.name === 'AbortError') {
              // Sumber diganti saat play sedang berjalan — tidak perlu ditindaklanjuti.
            } else {
              console.warn('[RomanceAudio] Playback BGM gagal.', err);
            }
          });
        }
      } catch (err) {
        console.warn('[RomanceAudio] play() melempar exception; audio dilewati.', err);
      }
    }

    function switchToFallback() {
      if (destroyed || usingFallback || !defaultBgmSrc) {
        return;
      }
      usingFallback = true;
      setBgmSource(defaultBgmSrc);
      if (unlocked) {
        tryPlay();
      }
    }

    /* ---------- Event handler (named reference untuk cleanup) ---------- */

    function handleBgmError() {
      if (destroyed) {
        return;
      }
      if (!usingFallback) {
        console.warn('[RomanceAudio] Sumber musik custom gagal; beralih ke default-bgm.mp3.');
        switchToFallback();
      } else {
        console.warn('[RomanceAudio] BGM tidak dapat diputar; experience dilanjutkan tanpa musik.');
      }
    }

    bgm.addEventListener('error', handleBgmError);

    /* ---------- API publik ---------- */

    /**
     * Memulai playback BGM. HARUS dipanggil langsung di dalam user gesture.
     */
    function unlock() {
      if (unlocked || destroyed) {
        return;
      }
      unlocked = true;
      tryPlay();
    }

    /**
     * Toggle mute untuk seluruh audio (BGM + chime).
     * Return state mute terbaru.
     */
    function toggleMute() {
      if (destroyed) {
        return muted;
      }
      muted = !muted;
      try {
        bgm.muted = muted;
        if (chime) {
          chime.muted = muted;
        }
      } catch (err) {
        console.warn('[RomanceAudio] Toggle mute gagal.', err);
      }
      return muted;
    }

    /**
     * Memainkan success chime (sekali). Tidak melempar exception.
     */
    function playChime() {
      if (destroyed || !chime) {
        return;
      }
      try {
        chime.currentTime = 0;
        chime.muted = muted;
        var chimePromise = chime.play();
        if (chimePromise && typeof chimePromise.catch === 'function') {
          chimePromise.catch(function (err) {
            console.warn('[RomanceAudio] Chime gagal diputar; celebration tetap berjalan.', err);
          });
        }
      } catch (err) {
        console.warn('[RomanceAudio] Chime dilewati.', err);
      }
    }

    /**
     * Bersihkan seluruh resource audio dan listener.
     */
    function destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;

      try {
        bgm.removeEventListener('error', handleBgmError);
        bgm.pause();
        bgm.removeAttribute('src');
        bgm.load();
      } catch (err) {
        // best-effort cleanup
      }

      if (chime) {
        try {
          chime.pause();
          chime.removeAttribute('src');
          chime.load();
        } catch (err) {
          // best-effort cleanup
        }
      }
    }

    return Object.freeze({
      unlock: unlock,
      toggleMute: toggleMute,
      playChime: playChime,
      destroy: destroy,
      get isMuted() {
        return muted;
      }
    });
  }

  /* ==================== EXPORT ==================== */

  window.RomanceAudio = Object.freeze({
    init: init
  });
})();