/* ======================================================================
   SOLEM ENGINE v2.0 — COHETE CINEMATICO + SCROLL DESBLOQUEADO
   Motor de Transmutación Cuántica de Partículas — Three.js + GSAP
   ====================================================================== */

class QuantumEngine {
  constructor() {
    // --- Escena WebGL ---
    this.canvas      = document.getElementById('webgl-scene');
    this.scene       = null;
    this.camera      = null;
    this.renderer    = null;
    this.clock       = new THREE.Clock();

    // --- Sistema de Partículas ---
    this.PARTICLE_COUNT = 30000;
    this.geometry    = null;
    this.material    = null;
    this.points      = null;

    // --- Arrays de posición por Estación (0-5) ---
    this.posRocket   = null; // Estación 0 — Cohete Espacial
    this.posWeb      = null; // Estación 1 — Cúmulo Cerebral
    this.posAuto     = null; // Estación 2 — Engranajes
    this.posMkt      = null; // Estación 3 — Vórtice
    this.posCap      = null; // Estación 4 — Geometría Sagrada
    this.posContact  = null; // Estación 5 — Galaxia Espiral

    // --- Perturbaciones animadas por partícula (respiración viva) ---
    this.breathPhase = null; // fase aleatoria por partícula
    this.breathAmp   = null; // amplitud por partícula

    // --- Direcciones aleatorias para explosión de transmutación ---
    this.randomDirs  = null;

    // --- Datos específicos de formas animadas ---
    this.gearIds     = null;
    this.gearAngles  = null;
    this.gearRadii   = null;
    this.gearHeights = null;
    this.vortexY     = null;
    this.vortexAngles= null;
    this.vortexRadii = null;
    this.constelTypes= null;

    // --- Control de Scroll ---
    this.scrollObj   = { progress: 0.0 };
    this.currentTab  = 'training';

    // --- Interacción de Mouse (Raycaster Magnético) ---
    this.mouse        = new THREE.Vector2(9999, 9999);
    this.mouseWorld   = new THREE.Vector3(9999, 9999, 0);
    this.raycaster    = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 0.12;

    // --- Inicialización Secuencial ---
    this.initThree();
    this.initParticleArrays();
    this.createSystem();
    this.initAnimations();
    this.initNavigation();
    this.initInteraction();
    this.animate();
  }

  // ====================================================================
  // 1. SETUP THREE.JS
  // ====================================================================
  initThree() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.1, 200
    );
    this.camera.position.z = 7.2;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,     // Desactivo antialias para ganar FPS con 30k partículas
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.setClearColor(0x000000, 0); // Fondo transparente (la page es negra)
  }

  // Textura radial en memoria — stardust brillante
  createParticleTexture() {
    const size = 96;
    const c    = document.createElement('canvas');
    c.width = c.height = size;
    const ctx  = c.getContext('2d');
    const half = size / 2;

    const g = ctx.createRadialGradient(half, half, 0, half, half, half);
    g.addColorStop(0,    'rgba(255,255,255,1)');
    g.addColorStop(0.08, 'rgba(255,255,255,0.98)');
    g.addColorStop(0.25, 'rgba(180,240,255,0.82)');  // Cian helado
    g.addColorStop(0.50, 'rgba(127,0,255,0.38)');    // Violeta
    g.addColorStop(0.80, 'rgba(255,20,147,0.12)');   // Fucsia trace
    g.addColorStop(1,    'rgba(0,0,0,0)');

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  // ====================================================================
  // 2. PRE-CÁLCULO MATEMÁTICO DE COORDENADAS POR ESTACIÓN
  // ====================================================================
  initParticleArrays() {
    const N = this.PARTICLE_COUNT;

    this.posRocket  = new Float32Array(N * 3);
    this.posWeb     = new Float32Array(N * 3);
    this.posAuto    = new Float32Array(N * 3);
    this.posMkt     = new Float32Array(N * 3);
    this.posCap     = new Float32Array(N * 3);
    this.posContact = new Float32Array(N * 3);

    // Fases y amplitudes de la animación de "respiración viva"
    this.breathPhase = new Float32Array(N);
    this.breathAmp   = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      this.breathPhase[i] = Math.random() * Math.PI * 2;
      this.breathAmp[i]   = 0.018 + Math.random() * 0.032; // 0.018 - 0.05
    }

    // Direcciones esféricas unitarias para la explosión de transmutación
    this.randomDirs = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      this.randomDirs[i*3]   = Math.sin(ph) * Math.cos(th);
      this.randomDirs[i*3+1] = Math.sin(ph) * Math.sin(th);
      this.randomDirs[i*3+2] = Math.cos(ph);
    }

    // ----------------------------------------------------------------
    // ESTACIÓN 0 — COHETE ESPACIAL 3D
    // Partes: Cono superior, Cuerpo cilíndrico, Alerones basales,
    //         Boquilla de motor, Estelas de propulsión
    // ----------------------------------------------------------------
    const rocketScale = 1.0;

    for (let i = 0; i < N; i++) {
      let x = 0, y = 0, z = 0;
      const roll = Math.random();

      if (i < 6500) {
        // ---- CONO SUPERIOR (Nariz del cohete) ----
        const h      = Math.random();          // 0 = base cono, 1 = punta
        const coneR  = (1 - h) * 0.55;        // radio decrece hacia la cima
        const angle  = Math.random() * Math.PI * 2;
        const noise  = (Math.random() - 0.5) * 0.04;
        x = (coneR + noise) * Math.cos(angle) * rocketScale;
        z = (coneR + noise) * Math.sin(angle) * rocketScale;
        y = (2.1 + h * 1.4) * rocketScale;    // De y=2.1 (base cono) a y=3.5 (punta)

      } else if (i < 15000) {
        // ---- CUERPO CILÍNDRICO ----
        const bodyAngle = Math.random() * Math.PI * 2;
        // Mezcla de superficie exterior + puntos interiores (densidad)
        const r = (Math.random() < 0.75)
          ? 0.54 + (Math.random() - 0.5) * 0.06   // Casco exterior
          : Math.random() * 0.48;                  // Estructura interna
        const bodyY = -1.1 + Math.random() * 3.2;  // Longitud del cuerpo
        x = r * Math.cos(bodyAngle) * rocketScale;
        z = r * Math.sin(bodyAngle) * rocketScale;
        y = bodyY * rocketScale;

      } else if (i < 19000) {
        // ---- ALERONES / ALETAS BASALES (3 aletas simétricas) ----
        const finIdx   = Math.floor(Math.random() * 3);
        const baseAngle= (finIdx / 3) * Math.PI * 2;
        const finW     = Math.random();             // 0=interior, 1=borde exterior
        const finH     = Math.random();             // 0=base, 1=punta aleta
        // Las aletas se expanden hacia afuera y hacia arriba
        const outerR   = 0.54 + finW * 0.90;
        const finY     = -1.1 - finH * 1.05;       // Debajo del cuerpo
        const spreadA  = baseAngle + (Math.random() - 0.5) * 0.28;
        x = outerR * Math.cos(spreadA) * rocketScale;
        z = outerR * Math.sin(spreadA) * rocketScale;
        y = finY * rocketScale;

      } else if (i < 22500) {
        // ---- BOQUILLA DE MOTOR / TOBERA ----
        const nozzleAngle = Math.random() * Math.PI * 2;
        // Tobera acampanada: r crece hacia la base
        const nH  = Math.random();                 // 0=estrecho, 1=acampanado
        const nR  = 0.18 + nH * 0.42;
        x = nR * Math.cos(nozzleAngle) * rocketScale;
        z = nR * Math.sin(nozzleAngle) * rocketScale;
        y = (-2.15 - nH * 0.38) * rocketScale;

      } else {
        // ---- ESTELAS DE PROPULSIÓN (Partículas dispersas debajo) ----
        const exhaust = Math.random();              // 0=base, 1=lejano
        const exAngle = Math.random() * Math.PI * 2;
        const exR     = Math.random() * (0.4 + exhaust * 0.9);
        const exY     = -2.55 - exhaust * 1.65;    // Baja más que el motor
        const scatter = (Math.random() - 0.5) * exhaust * 0.45;
        x = (exR * Math.cos(exAngle) + scatter) * rocketScale;
        z = (exR * Math.sin(exAngle) + scatter) * rocketScale;
        y = exY * rocketScale;
      }

      this.posRocket[i*3]   = x;
      this.posRocket[i*3+1] = y;
      this.posRocket[i*3+2] = z;
    }

    // ----------------------------------------------------------------
    // ESTACIÓN 1 — CÚMULO CEREBRAL (Armónicos Esféricos)
    // ----------------------------------------------------------------
    for (let i = 0; i < N; i++) {
      const isLeft  = Math.random() > 0.5;
      const xOffset = isLeft ? -0.6 : 0.6;
      const u       = Math.random();
      const v       = Math.random();
      const theta   = u * Math.PI;
      const phi     = v * Math.PI * 2;
      const rBase   = 1.35;
      const pert    = 0.18 * Math.sin(5*theta) * Math.cos(5*phi)
                    + 0.05 * Math.sin(18*theta)* Math.cos(18*phi);
      const r = rBase * (1 + pert);
      const w = 0.72 + 0.28 * Math.random();
      this.posWeb[i*3]   = r * w * Math.sin(theta) * Math.cos(phi) + xOffset;
      this.posWeb[i*3+1] = r * w * Math.cos(theta);
      this.posWeb[i*3+2] = r * w * Math.sin(theta) * Math.sin(phi);
    }

    // ----------------------------------------------------------------
    // ESTACIÓN 2 — ENGRANAJES ACOPLADOS
    // ----------------------------------------------------------------
    this.gearIds     = new Uint8Array(N);
    this.gearAngles  = new Float32Array(N);
    this.gearRadii   = new Float32Array(N);
    this.gearHeights = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const gearId = i < 10000 ? 0 : i < 20000 ? 1 : 2;
      this.gearIds[i] = gearId;

      let R, Nd;
      if      (gearId === 0) { R = 1.2; Nd = 12; }
      else if (gearId === 1) { R = 1.6; Nd = 16; }
      else                   { R = 1.2; Nd = 12; }

      const angle   = Math.random() * Math.PI * 2;
      const isTooth = Math.random() > 0.35;
      let r;

      if (isTooth) {
        const h       = 0.16;
        const rBorder = R + h * Math.min(Math.max(Math.cos(Nd * angle) * 1.5, -1), 1);
        r = rBorder - Math.random() * 0.12;
      } else {
        const type = Math.random();
        if (type < 0.4) {
          r = Math.random() * 0.38;
        } else {
          const spokes = [0, Math.PI/2, Math.PI, 3*Math.PI/2];
          const closest = spokes[Math.floor(Math.random() * spokes.length)];
          r = 0.38 + Math.random() * (R - 0.38);
          this.gearAngles[i] = closest + (Math.random() - 0.5) * 0.12;
        }
      }

      if (!this.gearAngles[i]) this.gearAngles[i] = angle;
      this.gearRadii[i]   = r;
      this.gearHeights[i] = (Math.random() - 0.5) * 0.28;

      let cx, cy;
      if      (gearId === 0) { cx = -1.2; cy =  0.8; }
      else if (gearId === 1) { cx =  1.2; cy = -0.2; }
      else                   { cx = -0.8; cy = -1.8; }

      this.posAuto[i*3]   = cx + r * Math.cos(this.gearAngles[i]);
      this.posAuto[i*3+1] = cy + r * Math.sin(this.gearAngles[i]);
      this.posAuto[i*3+2] = this.gearHeights[i];
    }

    // ----------------------------------------------------------------
    // ESTACIÓN 3 — VÓRTICE HIPERBÓLICO EXPONENCIAL
    // ----------------------------------------------------------------
    this.vortexY      = new Float32Array(N);
    this.vortexAngles = new Float32Array(N);
    this.vortexRadii  = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const y   = (Math.random() - 0.5) * 5.0;
      const ang = Math.random() * Math.PI * 2;
      const bR  = 0.65 + 0.3 * Math.pow(y + 2.5, 1.8);
      const r   = bR * (0.92 + 0.08 * Math.random());
      this.vortexY[i]      = y;
      this.vortexAngles[i] = ang;
      this.vortexRadii[i]  = r;
      this.posMkt[i*3]     = r * Math.cos(ang);
      this.posMkt[i*3+1]   = y;
      this.posMkt[i*3+2]   = r * Math.sin(ang);
    }

    // ----------------------------------------------------------------
    // ESTACIÓN 4 — CONSTELACIÓN GEOMETRÍA SAGRADA (Dodec + Icos + Anillos)
    // ----------------------------------------------------------------
    this.constelTypes = new Uint8Array(N);
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const iGolden     = 1 / goldenRatio;
    const scaleIcos   = 2.1;
    const scaleDodec  = 1.4;

    const icosVerts = [
      [0,-1,-goldenRatio],[0,-1,goldenRatio],[0,1,-goldenRatio],[0,1,goldenRatio],
      [-1,-goldenRatio,0],[-1,goldenRatio,0],[1,-goldenRatio,0],[1,goldenRatio,0],
      [-goldenRatio,0,-1],[-goldenRatio,0,1],[goldenRatio,0,-1],[goldenRatio,0,1]
    ].map(v => [v[0]*scaleIcos, v[1]*scaleIcos, v[2]*scaleIcos]);

    const dodecVerts = [
      [-1,-1,-1],[-1,-1,1],[-1,1,-1],[-1,1,1],
      [1,-1,-1],[1,-1,1],[1,1,-1],[1,1,1],
      [0,-iGolden,-goldenRatio],[0,-iGolden,goldenRatio],
      [0,iGolden,-goldenRatio],[0,iGolden,goldenRatio],
      [-iGolden,-goldenRatio,0],[-iGolden,goldenRatio,0],
      [iGolden,-goldenRatio,0],[iGolden,goldenRatio,0],
      [-goldenRatio,0,-iGolden],[-goldenRatio,0,iGolden],
      [goldenRatio,0,-iGolden],[goldenRatio,0,iGolden]
    ].map(v => [v[0]*scaleDodec, v[1]*scaleDodec, v[2]*scaleDodec]);

    const buildEdges = (verts, expectedSq, tol = 0.25) => {
      const edges = [];
      for (let a = 0; a < verts.length; a++) {
        for (let b = a + 1; b < verts.length; b++) {
          const dx = verts[a][0]-verts[b][0], dy = verts[a][1]-verts[b][1], dz = verts[a][2]-verts[b][2];
          if (Math.abs(dx*dx+dy*dy+dz*dz - expectedSq) < tol) edges.push([verts[a], verts[b]]);
        }
      }
      return edges;
    };

    const icosEdges  = buildEdges(icosVerts,  4 * scaleIcos  * scaleIcos);
    const dodecEdges = buildEdges(dodecVerts, (4 / (goldenRatio*goldenRatio)) * scaleDodec * scaleDodec);

    for (let i = 0; i < N; i++) {
      let x, y, z;
      if (i < 8000) {
        this.constelTypes[i] = 0;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2*Math.random()-1);
        const r  = 2.8;
        x = r * Math.sin(ph) * Math.cos(th);
        y = r * Math.sin(ph) * Math.sin(th);
        z = r * Math.cos(ph);
      } else if (i < 16000) {
        const ringId = Math.floor((i - 8000) / 2666) + 1;
        this.constelTypes[i] = Math.min(3, ringId);
        const ang = Math.random() * Math.PI * 2;
        const r   = 2.3;
        if      (this.constelTypes[i] === 1) { x = r*Math.cos(ang); y = r*Math.sin(ang); z = 0; }
        else if (this.constelTypes[i] === 2) { x = 0; y = r*Math.cos(ang); z = r*Math.sin(ang); }
        else                                  { x = r*Math.cos(ang); y = 0; z = r*Math.sin(ang); }
      } else if (i < 22000) {
        this.constelTypes[i] = 4;
        const edge = icosEdges[Math.floor(Math.random() * icosEdges.length)];
        const t    = Math.random();
        x = edge[0][0]+(edge[1][0]-edge[0][0])*t+(Math.random()-.5)*.05;
        y = edge[0][1]+(edge[1][1]-edge[0][1])*t+(Math.random()-.5)*.05;
        z = edge[0][2]+(edge[1][2]-edge[0][2])*t+(Math.random()-.5)*.05;
      } else {
        this.constelTypes[i] = 5;
        const edge = dodecEdges[Math.floor(Math.random() * dodecEdges.length)];
        const t    = Math.random();
        x = edge[0][0]+(edge[1][0]-edge[0][0])*t+(Math.random()-.5)*.05;
        y = edge[0][1]+(edge[1][1]-edge[0][1])*t+(Math.random()-.5)*.05;
        z = edge[0][2]+(edge[1][2]-edge[0][2])*t+(Math.random()-.5)*.05;
      }
      this.posCap[i*3] = x; this.posCap[i*3+1] = y; this.posCap[i*3+2] = z;
    }

    // ----------------------------------------------------------------
    // ESTACIÓN 5 — GALAXIA ESPIRAL LOGARÍTMICA (3 BRAZOS)
    // ----------------------------------------------------------------
    for (let i = 0; i < N; i++) {
      const arm  = i % 3;
      const r    = Math.pow(Math.random(), 1.22) * 4.6;
      const spin = 1.38;
      const ang  = arm * (Math.PI * 2 / 3) + r * spin;
      const disp = (Math.random() - 0.5) * (0.28 + 0.32 / (r + 0.18));
      this.posContact[i*3]   = r * Math.cos(ang + disp);
      this.posContact[i*3+1] = (Math.random() - 0.5) * 0.42 * Math.exp(-0.25 * r);
      this.posContact[i*3+2] = r * Math.sin(ang + disp);
    }
  }

  // ====================================================================
  // 3. CONSTRUCCIÓN DEL OBJETO THREE.POINTS
  // ====================================================================
  createSystem() {
    const N = this.PARTICLE_COUNT;
    this.geometry = new THREE.BufferGeometry();

    // Posiciones iniciales = Estación 0 (Cohete)
    const initPos = new Float32Array(N * 3);
    initPos.set(this.posRocket);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(initPos, 3));

    // Colores incandescentes por partícula
    const colors = new Float32Array(N * 3);
    const palette = [
      new THREE.Color(0xFF1493), // Fucsia Cósmico
      new THREE.Color(0x00F2FE), // Cian Cuántico
      new THREE.Color(0x7F00FF), // Violeta Cibernético
      new THREE.Color(0xFFD700), // Polvo Estelar Dorado
      new THREE.Color(0x40E0FF), // Cian claro
      new THREE.Color(0xBF00FF)  // Violeta brillante
    ];
    for (let i = 0; i < N; i++) {
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
    }
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.098,
      sizeAttenuation: true,
      depthWrite: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      map: this.createParticleTexture()
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  // ====================================================================
  // 4. RENDER LOOP — Transmutación + Respiración Viva + Hover Magnético
  // ====================================================================
  animate() {
    requestAnimationFrame(() => this.animate());

    const elapsed  = this.clock.getElapsedTime();
    const progress = this.scrollObj.progress;

    // --- Mapeo de estaciones ---
    const INTERVAL = 0.2;
    let idx = Math.min(4, Math.floor(progress / INTERVAL));
    let t   = (progress % INTERVAL) / INTERVAL;
    if (progress >= 1.0) { idx = 4; t = 1.0; }

    // Factor de explosión intermedia: E(t) = sin(t·π)
    const ep = Math.sin(t * Math.PI);

    const posAttr  = this.geometry.attributes.position;
    const posArray = posAttr.array;
    const N        = this.PARTICLE_COUNT;

    // Pre-cómputo de coordenadas de destino (Estación B) fuera del inner loop
    const nextIdx = idx + 1;

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;

      // ---- Coordenada Origen (Estación A) con animación viva ----
      let xA = 0, yA = 0, zA = 0;
      this.computeStationCoord(idx, i, i3, elapsed, true,  (x,y,z) => { xA=x; yA=y; zA=z; });

      // ---- Coordenada Destino (Estación B) ----
      let xB = xA, yB = yA, zB = zA; // fallback: si es la última estación
      this.computeStationCoord(nextIdx, i, i3, elapsed, false, (x,y,z) => { xB=x; yB=y; zB=z; });

      // ---- Interpolación Lineal entre A y B ----
      let rx = xA + (xB - xA) * t;
      let ry = yA + (yB - yA) * t;
      let rz = zA + (zB - zA) * t;

      // ---- Explosión Caótica de Transmutación ----
      if (ep > 0.001) {
        const len    = Math.sqrt(rx*rx + ry*ry + rz*rz) || 1;
        const push   = 3.8 * ep;
        const turb   = 2.0 * ep;
        rx += (rx/len) * push + this.randomDirs[i3]   * turb;
        ry += (ry/len) * push + this.randomDirs[i3+1] * turb;
        rz += (rz/len) * push + this.randomDirs[i3+2] * turb;
      }

      // ---- RESPIRACIÓN VIVA (Oscilación senoidal por partícula) ----
      // Solo en la estación actual (no durante explosión pronunciada)
      const breathFade = 1 - Math.min(1, ep * 2.5);
      const bAmp  = this.breathAmp[i] * breathFade;
      const bPhase= this.breathPhase[i];
      // Perturbación en la dirección radial normalizada del punto
      const normLen = Math.sqrt(rx*rx + ry*ry + rz*rz) || 1;
      const breath  = Math.sin(elapsed * 2.4 + bPhase) * bAmp;
      rx += (rx / normLen) * breath;
      ry += (ry / normLen) * breath;
      rz += (rz / normLen) * breath;

      // ---- HOVER MAGNÉTICO (solo Estación 0) ----
      if (idx === 0 && ep < 0.05) {
        const dx   = rx - this.mouseWorld.x;
        const dy   = ry - this.mouseWorld.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const hoverR = 1.8;
        if (dist < hoverR && dist > 0.001) {
          const force = (1 - dist / hoverR) * 0.55 * (1 - Math.min(1, progress / 0.2));
          rx += (dx / dist) * force;
          ry += (dy / dist) * force;
        }
      }

      posArray[i3]   = rx;
      posArray[i3+1] = ry;
      posArray[i3+2] = rz;
    }

    posAttr.needsUpdate = true;

    // ---- Posicionamiento Dinámico del Sistema (Desktop vs Mobile) ----
    this.updateSystemLayoutPosition(idx, t);

    this.renderer.render(this.scene, this.camera);
  }

  // Función auxiliar para calcular coordenadas de una estación
  // Usa callback para evitar crear objetos temporales en el hot path
  computeStationCoord(stationIdx, i, i3, elapsed, applyBreath, cb) {
    let x = 0, y = 0, z = 0;

    if (stationIdx === 0) {
      x = this.posRocket[i3];
      y = this.posRocket[i3+1];
      z = this.posRocket[i3+2];

    } else if (stationIdx === 1) {
      x = this.posWeb[i3];
      y = this.posWeb[i3+1];
      z = this.posWeb[i3+2];

    } else if (stationIdx === 2) {
      const gId = this.gearIds[i];
      const r   = this.gearRadii[i];
      const bA  = this.gearAngles[i];
      let cx, cy, rotS;
      if      (gId === 0) { cx = -1.2; cy =  0.8; rotS =  elapsed * 1.4; }
      else if (gId === 1) { cx =  1.2; cy = -0.2; rotS = -elapsed * 1.05; }
      else                { cx = -0.8; cy = -1.8; rotS =  elapsed * 1.4; }
      const ang = bA + rotS;
      x = cx + r * Math.cos(ang);
      y = cy + r * Math.sin(ang);
      z = this.gearHeights[i];

    } else if (stationIdx === 3) {
      const r   = this.vortexRadii[i];
      const bA  = this.vortexAngles[i];
      const vy  = this.vortexY[i];
      const spS = elapsed * 2.0 + vy * 1.25;
      x = r * Math.cos(bA + spS);
      y = vy;
      z = r * Math.sin(bA + spS);

    } else if (stationIdx === 4) {
      const gType = this.constelTypes[i];
      const bx = this.posCap[i3], by = this.posCap[i3+1], bz = this.posCap[i3+2];
      if (gType === 0) {
        const a = elapsed * 0.12;
        x = bx*Math.cos(a) - bz*Math.sin(a); y = by; z = bx*Math.sin(a) + bz*Math.cos(a);
      } else if (gType === 1) {
        const a = elapsed * 1.2;
        x = bx*Math.cos(a) - by*Math.sin(a); y = bx*Math.sin(a) + by*Math.cos(a); z = bz;
      } else if (gType === 2) {
        const a = elapsed * 1.2;
        x = bx; y = by*Math.cos(a) - bz*Math.sin(a); z = by*Math.sin(a) + bz*Math.cos(a);
      } else if (gType === 3) {
        const a = elapsed * 1.2;
        x = bx*Math.cos(a) - bz*Math.sin(a); y = by; z = bx*Math.sin(a) + bz*Math.cos(a);
      } else {
        const aY = elapsed * 0.18, aX = elapsed * 0.10;
        let rx2 = bx*Math.cos(aY) - bz*Math.sin(aY);
        let rz2 = bx*Math.sin(aY) + bz*Math.cos(aY);
        x = rx2;
        y = by*Math.cos(aX) - rz2*Math.sin(aX);
        z = by*Math.sin(aX) + rz2*Math.cos(aX);
      }

    } else if (stationIdx === 5) {
      const rx0 = this.posContact[i3], rz0 = this.posContact[i3+2];
      const rr  = Math.sqrt(rx0*rx0 + rz0*rz0);
      const rot = elapsed * 0.75 * (1.2 / (rr + 0.25));
      x = rx0*Math.cos(rot) - rz0*Math.sin(rot);
      y = this.posContact[i3+1];
      z = rx0*Math.sin(rot) + rz0*Math.cos(rot);

    } else {
      // Fallback: última posición conocida
      x = this.posContact[i3];
      y = this.posContact[i3+1];
      z = this.posContact[i3+2];
    }

    cb(x, y, z);
  }

  // ====================================================================
  // 5. POSICIONAMIENTO DINÁMICO DEL SISTEMA 3D (Desktop/Mobile)
  // ====================================================================
  updateSystemLayoutPosition(idx, t) {
    const isDesktop = window.innerWidth >= 1024;
    let tX = 0, tY = 0, tScale = 1.0;

    if (isDesktop) {
      const offsetsX = [2.5, -2.5, 2.5, -2.5, 2.5, 0.0];
      const vA = offsetsX[idx];
      const vB = offsetsX[Math.min(5, idx + 1)];
      tX = vA + (vB - vA) * t;
      tY = 0;
    } else {
      const offsetsY = [1.4, 1.4, 1.4, 1.4, 1.4, 0.0];
      const scales   = [0.52, 0.52, 0.52, 0.52, 0.52, 0.62];
      const vA = offsetsY[idx];
      const vB = offsetsY[Math.min(5, idx + 1)];
      tY = vA + (vB - vA) * t;
      const sA = scales[idx];
      const sB = scales[Math.min(5, idx + 1)];
      tScale = sA + (sB - sA) * t;
    }

    // Lerp suavizado — inercia premium
    this.points.position.x = THREE.MathUtils.lerp(this.points.position.x, tX, 0.07);
    this.points.position.y = THREE.MathUtils.lerp(this.points.position.y, tY, 0.07);
    const cs = this.points.scale.x;
    this.points.scale.setScalar(THREE.MathUtils.lerp(cs, tScale, 0.07));
  }

  // ====================================================================
  // 6. SCROLLTRIGGER + SNAPPING (Sin normalizeScroll — Scroll nativo libre)
  // ====================================================================
  initAnimations() {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    // ---- NO usamos normalizeScroll: permite el scroll nativo en todos los navegadores ----

    this.masterST = ScrollTrigger.create({
      trigger: '.journey-wrapper',
      start:   'top top',
      end:     'bottom bottom',
      scrub:   1.2,
      pin:     '.scroll-container',
      pinSpacing: true,
      onUpdate: (self) => {
        this.scrollObj.progress = self.progress;
        this.updateActiveSlide(self.progress);
      },
      snap: {
        snapTo:   [0, 0.2, 0.4, 0.6, 0.8, 1.0],
        duration: { min: 0.3, max: 0.75 },
        ease:     'power2.inOut',
        delay:    0.04
      }
    });
  }

  // ====================================================================
  // 7. VISIBILIDAD DE SLIDES Y ESTADO ACTIVO DEL NAV
  // ====================================================================
  updateActiveSlide(p) {
    let activeIdx;
    if      (p < 0.10) activeIdx = 0;
    else if (p < 0.30) activeIdx = 1;
    else if (p < 0.50) activeIdx = 2;
    else if (p < 0.70) activeIdx = 3;
    else if (p < 0.90) activeIdx = 4;
    else               activeIdx = 5;

    document.querySelectorAll('.station-slide').forEach((slide, idx) => {
      slide.classList.toggle('active-slide', idx === activeIdx);
    });

    document.querySelectorAll('.nav-link, .nav-cta').forEach(link => {
      const idx = parseInt(link.getAttribute('data-index'));
      if (idx === activeIdx) {
        const tab = link.getAttribute('data-tab');
        if (activeIdx === 4 && tab) {
          link.classList.toggle('active', tab === this.currentTab);
        } else {
          link.classList.add('active');
        }
      } else {
        link.classList.remove('active');
      }
    });
  }

  // ====================================================================
  // 8. NAVEGACIÓN Y TABS DEL DASHBOARD
  // ====================================================================
  initNavigation() {
    document.querySelectorAll('.nav-links a, .nav-logo, .btn-journey').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetIndex = link.getAttribute('data-index') || link.getAttribute('data-target');
        const tabTarget   = link.getAttribute('data-tab');

        if (targetIndex !== null && targetIndex !== undefined) {
          const idx        = parseInt(targetIndex);
          const totalH     = document.documentElement.scrollHeight - window.innerHeight;
          const scrollPos  = idx * 0.2 * totalH;
          gsap.to(window, {
            scrollTo: scrollPos,
            duration: 1.3,
            ease: 'power2.inOut',
            onComplete: () => { if (tabTarget) this.switchDashboardTab(tabTarget); }
          });
        }

        document.getElementById('nav-links').classList.remove('open');
        document.getElementById('menu-toggle').classList.remove('open');
      });
    });

    // Toggle hamburguesa
    document.getElementById('menu-toggle').addEventListener('click', () => {
      document.getElementById('menu-toggle').classList.toggle('open');
      document.getElementById('nav-links').classList.toggle('open');
    });

    // Tabs internos del Dashboard
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchDashboardTab(btn.getAttribute('data-tab-target'));
      });
    });
  }

  switchDashboardTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab-target') === tabName);
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `pane-${tabName}`);
    });
    this.updateActiveSlide(this.scrollObj.progress);
  }

  // ====================================================================
  // 9. INTERACCIONES — Mouse (Hover Magnético) + Resize Reactivo
  // ====================================================================
  initInteraction() {
    // Proyección del cursor al plano Z=0 de la escena 3D
    window.addEventListener('mousemove', (e) => {
      this.mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      // Raycaster → plano Z=0
      const v = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5).unproject(this.camera);
      const d = v.sub(this.camera.position).normalize();
      const t = -this.camera.position.z / d.z;
      this.mouseWorld.copy(this.camera.position).addScaledVector(d, t);
    });

    window.addEventListener('mouseleave', () => {
      this.mouseWorld.set(9999, 9999, 0);
    });

    // Scroll header
    window.addEventListener('scroll', () => {
      const nav = document.getElementById('main-nav');
      nav.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });

    // Resize reactivo
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        ScrollTrigger.refresh(true);
      }, 150);
    });
  }
}

// ======================================================================
// BOOTSTRAP — Espera DOMContentLoaded
// ======================================================================
window.addEventListener('DOMContentLoaded', () => {
  // Asegurar que GSAP y THREE estén disponibles
  if (typeof gsap === 'undefined' || typeof THREE === 'undefined') {
    console.error('[SolemEngine] GSAP o Three.js no disponibles — verifica las CDNs');
    return;
  }
  window.solemEngine = new QuantumEngine();
  console.log('[SolemEngine v2.0] Motor de Transmutación iniciado — 30,000 partículas');
});
