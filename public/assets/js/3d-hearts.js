/**
 * ============================================================
 * Romance Engine V1 — assets/js/3d-hearts.js
 * Modul F-004: WebGL 3D Particle Scene (Three.js)
 * ============================================================
 *
 * KONTRAK PUBLIK (dipakai oleh view.html — jangan diubah sepihak):
 *   window.RomanceScene.init(container, { reducedMotion })
 *     -> { start(), celebrate(), destroy() }  jika WebGL tersedia
 *     -> null                                 jika WebGL gagal/tidak ada
 *        (view.html kemudian mengaktifkan fallback CSS via body.webgl-off)
 *
 * KEPUTUSAN TEKNIS TERDOKUMENTASI (NN-007):
 *  1. devicePixelRatio dibatasi maksimal 2 (spesifikasi §12/§17).
 *  2. Jumlah objek dibedakan untuk device mobile vs desktop
 *     agar GPU mobile tidak terbebani.
 *  3. Animation loop dihentikan total saat tab hidden
 *     (visibilitychange), bukan sekadar throttle.
 *  4. `webglcontextlost` ditangani: loop dihentikan, scene dibersihkan,
 *     dan fallback CSS diaktifkan — experience tidak berhenti.
 *  5. prefers-reduced-motion: scene dirender sebagai satu frame statis
 *     (tanpa loop). celebrate() pada mode ini hanya menaikkan intensitas
 *     cahaya lalu merender ulang satu frame — tanpa animasi berjalan.
 *  6. Renderer memakai alpha=true sehingga gradien obsidian dari CSS
 *     body tetap terlihat menembus canvas (konsisten palet §20).
 *  7. PointLight menggunakan decay=0 agar intensitas deterministik
 *     pada Three.js r150+ (legacy lights tidak dipakai).
 *  8. Hero heart + seluruh floating objects memakai geometry bersama
 *     (shared) untuk meminimalkan memory & draw call.
 */
(function () {
  'use strict';

  /* ==================== KONFIGURASI ==================== */

  var CELEBRATE_DURATION_SECONDS = 3.5;
  var MAX_DELTA_SECONDS = 0.05; // clamp delta agar tidak lompat setelah tab hidden
  var MAX_PIXEL_RATIO = 2;

  var COLORS = Object.freeze({
    fog: 0x0D0208,
    ambient: 0xFF8FB1,
    keyLight: 0xFFF1F6,
    pinkGlow: 0xFF5E94,
    roseMist: 0xE7A0B3,
    heroHeart: 0xFF5E94,
    heroEmissive: 0x7A0D35,
    hearts: [0xFFB3C9, 0xFF8FB1, 0xFF5E94, 0xC94F72],
    petal: 0xFFB3C9,
    petalEmissive: 0x531026,
    stars: ['#FFB3C9', '#FF8FB1', '#C94F72', '#FFF1F6']
  });

  /* ==================== UTILITAS ==================== */

  function isWebGLAvailable() {
    try {
      var canvas = document.createElement('canvas');
      return Boolean(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch (err) {
      return false;
    }
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /** Membungkus nilai agar tetap berada di antara min..max (untuk loop jatuh kelopak). */
  function wrapRange(value, min, max) {
    var span = max - min;
    return min + (((value - min) % span) + span) % span;
  }

  function detectLowPowerDevice() {
    try {
      return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    } catch (err) {
      return false; // aman: gunakan profil desktop
    }
  }

  /* ==================== FACTORY GEOMETRY ==================== */

  /**
   * Bentuk hati klasik (pola resmi three.js examples), dinormalisasi
   * sehingga tingginya = 1 satuan world. Semua heart berbagi geometry ini.
   */
  function createUnitHeartGeometry() {
    var shape = new THREE.Shape();
    var x = 0;
    var y = 0;

    shape.moveTo(x + 5, y + 5);
    shape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
    shape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
    shape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
    shape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
    shape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
    shape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);

    var geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 4,
      bevelEnabled: true,
      bevelThickness: 2,
      bevelSize: 2,
      bevelSegments: 2,
      curveSegments: 10
    });

    geometry.center();
    geometry.computeBoundingBox();
    var height = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
    if (height > 0) {
      var scale = 1 / height;
      geometry.scale(scale, scale, scale);
    }
    return geometry;
  }

  /** Kelopak sederhana (dua kurva kuadratik), tinggi ~1 satuan. */
  function createPetalGeometry() {
    var shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.38, 0.28, 0, 0.95);
    shape.quadraticCurveTo(-0.38, 0.28, 0, 0);

    var geometry = new THREE.ShapeGeometry(shape, 6);
    geometry.center();
    return geometry;
  }

  /** Bintang sebagai Points dengan warna acak dari palet cyan/pink. */
  function createStarField(count) {
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    var color = new THREE.Color();

    for (var i = 0; i < count; i += 1) {
      // Sebaran spherical shell agar bintang mengelilingi scene.
      var radius = randomBetween(6, 24);
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(randomBetween(-1, 1));

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      color.set(pick(COLORS.stars));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    var material = new THREE.PointsMaterial({
      size: 0.14,
      transparent: true,
      opacity: 0.85,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    return new THREE.Points(geometry, material);
  }

  /* ==================== ENTRY POINT ==================== */

  /**
   * Inisialisasi scene. Return controller, atau null jika WebGL
   * tidak tersedia — view.html menangani fallback CSS.
   * Tidak pernah melempar exception keluar.
   */
  function init(container, options) {
    if (!container || typeof THREE === 'undefined' || !isWebGLAvailable()) {
      return null;
    }

    try {
      return createSceneController(container, options);
    } catch (err) {
      console.warn('[RomanceScene] Inisialisasi WebGL gagal; fallback CSS akan dipakai.', err);
      return null;
    }
  }

  function createSceneController(container, options) {
    /* ---------- State ---------- */
    var reducedMotion = Boolean(options && options.reducedMotion);
    var lowPower = detectLowPowerDevice();

    var counts = lowPower
      ? { hearts: 10, petals: 14, stars: 320 }
      : { hearts: 18, petals: 24, stars: 650 };

    var renderer = null;
    var scene = null;
    var camera = null;
    var clock = null;

    var heroHeart = null;
    var heartGroup = null;
    var petalGroup = null;
    var starField = null;
    var pinkLight = null;
    var cyanLight = null;

    var floatingHearts = [];
    var fallingPetals = [];

    var rafId = null;
    var running = false;
    var started = false;
    var destroyed = false;
    var elapsed = 0;
    var celebrateUntil = -1;
    var staticCelebrate = false; // untuk mode reduced-motion

    /* ---------- Renderer & scene dasar ---------- */

    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !lowPower,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(COLORS.fog, 14, 34);

    camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      60
    );
    camera.position.set(0, 0.4, 13);
    camera.lookAt(0, 0.2, 0);

    clock = new THREE.Clock(false);

    /* ---------- Cahaya (sinematik, glow cyan/pink) ---------- */

    scene.add(new THREE.AmbientLight(COLORS.ambient, 0.5));

    var keyLight = new THREE.DirectionalLight(COLORS.keyLight, 1.1);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    // decay=0: intensitas konstan & deterministik pada Three.js r150+.
    pinkLight = new THREE.PointLight(COLORS.pinkGlow, 2.6, 0, 0);
    pinkLight.position.set(0, 1.5, 4);
    scene.add(pinkLight);

    cyanLight = new THREE.PointLight(COLORS.roseMist, 1.6, 0, 0);
    cyanLight.position.set(-5, -2, 3);
    scene.add(cyanLight);

    /* ---------- Objek: hero heart + hati kecil ---------- */

    var heartGeometry = createUnitHeartGeometry();

    var heroMaterial = new THREE.MeshPhysicalMaterial({
      color: COLORS.heroHeart,
      emissive: COLORS.heroEmissive,
      emissiveIntensity: 0.6,
      metalness: 0.1,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.25,
      transparent: true,
      opacity: 0.84
    });

    var HERO_BASE_SCALE = 2.3;
    heroHeart = new THREE.Mesh(heartGeometry, heroMaterial);
    heroHeart.scale.set(HERO_BASE_SCALE, HERO_BASE_SCALE, HERO_BASE_SCALE);
    scene.add(heroHeart);

    heartGroup = new THREE.Group();
    var heartMaterials = COLORS.hearts.map(function (hex) {
      return new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.25,
        metalness: 0.15,
        roughness: 0.35,
        transparent: true,
        opacity: 0.78
      });
    });

    for (var hi = 0; hi < counts.hearts; hi += 1) {
      var heartMesh = new THREE.Mesh(heartGeometry, pick(heartMaterials));
      var heartScale = randomBetween(0.16, 0.5);
      heartMesh.scale.set(heartScale, heartScale, heartScale);

      var baseX = randomBetween(-7, 7);
      var baseY = randomBetween(-3.5, 3.5);
      var baseZ = randomBetween(-6, 2);
      heartMesh.position.set(baseX, baseY, baseZ);
      heartMesh.rotation.set(
        randomBetween(-0.4, 0.4),
        randomBetween(0, Math.PI * 2),
        randomBetween(-0.3, 0.3)
      );

      heartGroup.add(heartMesh);
      floatingHearts.push({
        mesh: heartMesh,
        baseX: baseX,
        baseY: baseY,
        floatAmp: randomBetween(0.4, 1.1),
        floatSpeed: randomBetween(0.4, 0.9),
        driftAmp: randomBetween(0.2, 0.7),
        driftSpeed: randomBetween(0.2, 0.5),
        phase: randomBetween(0, Math.PI * 2),
        spinX: randomBetween(-0.4, 0.4),
        spinY: randomBetween(-0.5, 0.5)
      });
    }
    scene.add(heartGroup);

    /* ---------- Objek: kelopak jatuh ---------- */

    var petalGeometry = createPetalGeometry();
    var petalMaterials = [
      new THREE.MeshStandardMaterial({
        color: COLORS.petal,
        emissive: COLORS.petalEmissive,
        emissiveIntensity: 0.35,
        roughness: 0.6,
        metalness: 0,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide
      }),
      new THREE.MeshStandardMaterial({
        color: 0xFF8FB1,
        emissive: COLORS.petalEmissive,
        emissiveIntensity: 0.3,
        roughness: 0.6,
        metalness: 0,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      })
    ];

    petalGroup = new THREE.Group();
    for (var pi = 0; pi < counts.petals; pi += 1) {
      var petalMesh = new THREE.Mesh(petalGeometry, pick(petalMaterials));
      var petalScale = randomBetween(0.35, 0.8);
      petalMesh.scale.set(petalScale, petalScale, petalScale);
      petalMesh.position.set(randomBetween(-8, 8), randomBetween(-6.5, 6.5), randomBetween(-5, 2));
      petalMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

      petalGroup.add(petalMesh);
      fallingPetals.push({
        mesh: petalMesh,
        baseY: petalMesh.position.y,
        swayAmp: randomBetween(0.3, 1),
        swaySpeed: randomBetween(0.3, 0.8),
        fallSpeed: randomBetween(0.35, 0.85),
        phase: randomBetween(0, Math.PI * 2),
        tumbleX: randomBetween(-1.2, 1.2),
        tumbleZ: randomBetween(-1.2, 1.2)
      });
    }
    scene.add(petalGroup);

    /* ---------- Objek: bintang ---------- */

    starField = createStarField(counts.stars);
    scene.add(starField);

    /* ---------- Nilai dasar untuk efek celebrate ---------- */

    var baseStarSize = starField.material.size;
    var basePinkIntensity = pinkLight.intensity;
    var baseCyanIntensity = cyanLight.intensity;

    /* ---------- Update per-frame ---------- */

    function currentBoost() {
      var remaining = celebrateUntil - elapsed;
      return remaining > 0 ? remaining / CELEBRATE_DURATION_SECONDS : 0;
    }

    function updateScene(dt) {
      var boost = currentBoost();
      var speedFactor = 1 + boost * 1.6;

      // Denyut hero heart (lebih kuat saat celebration).
      var pulse = 1 + 0.05 * Math.sin(elapsed * 2.4) + boost * 0.22 * Math.sin(elapsed * 7);
      heroHeart.scale.set(
        HERO_BASE_SCALE * pulse,
        HERO_BASE_SCALE * pulse,
        HERO_BASE_SCALE * pulse
      );
      heroHeart.rotation.y = Math.sin(elapsed * 0.35) * 0.25;

      // Hati kecil melayang.
      for (var i = 0; i < floatingHearts.length; i += 1) {
        var item = floatingHearts[i];
        item.mesh.position.y = item.baseY + Math.sin(elapsed * item.floatSpeed + item.phase) * item.floatAmp;
        item.mesh.position.x = item.baseX + Math.sin(elapsed * item.driftSpeed + item.phase) * item.driftAmp;
        item.mesh.rotation.x += dt * item.spinX * speedFactor;
        item.mesh.rotation.y += dt * item.spinY * speedFactor;
      }

      // Kelopak jatuh perlahan dengan goyangan.
      for (var j = 0; j < fallingPetals.length; j += 1) {
        var petal = fallingPetals[j];
        petal.mesh.position.y = wrapRange(
          petal.baseY - elapsed * petal.fallSpeed * speedFactor,
          -6.5,
          6.5
        );
        petal.mesh.position.x += Math.sin(elapsed * petal.swaySpeed + petal.phase) * petal.swayAmp * dt;
        petal.mesh.rotation.x += dt * petal.tumbleX;
        petal.mesh.rotation.z += dt * petal.tumbleZ;
      }

      // Grup berputar lembut; bintang berputar paling lambat.
      heartGroup.rotation.y = Math.sin(elapsed * 0.1) * 0.12 + boost * 0.15;
      starField.rotation.y += dt * 0.02 * speedFactor;
      starField.material.opacity = 0.75 + 0.15 * Math.sin(elapsed * 0.8) + boost * 0.15;
      starField.material.size = baseStarSize * (1 + boost * 0.6);

      // Cahaya naik saat celebration.
      pinkLight.intensity = basePinkIntensity + boost * 2.2;
      cyanLight.intensity = baseCyanIntensity + boost * 1.2;

      // Kamera bergeser halus (parallax sinematik tanpa input listener).
      camera.position.x = Math.sin(elapsed * 0.18) * 0.6;
      camera.position.y = 0.4 + Math.sin(elapsed * 0.13) * 0.3;
      camera.lookAt(0, 0.2, 0);
    }

    function tick() {
      if (!running || destroyed) {
        return;
      }
      rafId = requestAnimationFrame(tick);

      var dt = Math.min(clock.getDelta(), MAX_DELTA_SECONDS);
      elapsed += dt;

      updateScene(dt);
      renderer.render(scene, camera);
    }

    /* ---------- Render statis (prefers-reduced-motion) ---------- */

    function renderStaticFrame() {
      // Posisi objek tetap dihitung sekali agar scene tidak kosong.
      updateScene(0);
      if (staticCelebrate) {
        pinkLight.intensity = basePinkIntensity + 1.8;
        cyanLight.intensity = baseCyanIntensity + 1;
        starField.material.opacity = 1;
      }
      renderer.render(scene, camera);
    }

    /* ---------- Kontrol loop ---------- */

    function startLoop() {
      if (running || destroyed || reducedMotion) {
        return;
      }
      running = true;
      clock.start();
      rafId = requestAnimationFrame(tick);
    }

    function stopLoop() {
      running = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      clock.stop();
    }

    /* ---------- Event handlers ---------- */

    function handleResize() {
      if (destroyed || !renderer) {
        return;
      }
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (started && reducedMotion) {
        renderStaticFrame();
      }
    }

    function handleVisibilityChange() {
      if (destroyed || !started || reducedMotion) {
        return;
      }
      if (document.hidden) {
        stopLoop();
      } else {
        startLoop();
      }
    }

    function handleContextLost(event) {
      // Context hilang (GPU reset, dsb.): aktifkan fallback CSS,
      // lalu bersihkan scene. Experience tetap berlanjut tanpa WebGL.
      event.preventDefault();
      console.warn('[RomanceScene] WebGL context lost; beralih ke fallback CSS.');
      document.body.classList.add('webgl-off');
      destroy();
    }

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);

    /* ---------- Cleanup ---------- */

    function disposeResources() {
      scene.traverse(function (object) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (Array.isArray(object.material)) {
          object.material.forEach(function (material) {
            material.dispose();
          });
        } else if (object.material) {
          object.material.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    }

    function destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      stopLoop();

      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('webglcontextlost', handleContextLost, false);
      }

      try {
        disposeResources();
      } catch (err) {
        console.warn('[RomanceScene] Cleanup resource dilewati.', err);
      }

      renderer = null;
      scene = null;
      camera = null;
      floatingHearts = [];
      fallingPetals = [];
    }

    /* ---------- API publik controller ---------- */

    function start() {
      if (started || destroyed) {
        return;
      }
      started = true;

      if (reducedMotion) {
        renderStaticFrame();
        return;
      }
      startLoop();
    }

    function celebrate() {
      if (destroyed) {
        return;
      }
      if (reducedMotion) {
        // Mode reduced-motion: tanpa animasi berjalan, cukup satu frame
        // dengan cahaya lebih terang sebagai feedback celebration.
        staticCelebrate = true;
        renderStaticFrame();
        return;
      }
      celebrateUntil = elapsed + CELEBRATE_DURATION_SECONDS;
      if (started && !running) {
        startLoop(); // jaga-jaga jika tab baru kembali visible
      }
    }

    return Object.freeze({
      start: start,
      celebrate: celebrate,
      destroy: destroy
    });
  }

  /* ==================== EXPORT ==================== */

  window.RomanceScene = Object.freeze({
    init: init
  });
})();