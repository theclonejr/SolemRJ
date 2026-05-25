/* ======================================================================
   SOLEM ENGINE v3.0
   Scroll Suavizado · Cohete 45° · Paleta Espacial · Carrusel Horizontal
   ====================================================================== */

class QuantumEngine {
  constructor() {
    this.canvas          = document.getElementById('webgl-scene');
    this.scene           = null;
    this.camera          = null;
    this.renderer        = null;
    this.clock           = new THREE.Clock();

    // Detección de capacidad del dispositivo — ajusta la carga de GPU
    const _isMobile = window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const _isTablet = !_isMobile && window.innerWidth <= 1024;
    this.PARTICLE_COUNT  = _isMobile ? 12000 : _isTablet ? 20000 : 30000;
    this.geometry        = null;
    this.material        = null;
    this.points          = null;

    // ── DIRECTIVE 3: Depth BG secondary particle system ──
    this.bgGeometry      = null;
    this.bgMaterial      = null;
    this.bgPoints        = null;
    this.BG_PARTICLE_COUNT = 1800;

    // Arrays de posición por Estación
    this.posRocket       = null;
    this.posWeb          = null;
    this.posAuto         = null;
    this.posMkt          = null;
    this.posCap          = null;
    this.posContact      = null;

    // Animación viva
    this.breathPhase     = null;
    this.breathAmp       = null;
    this.randomDirs      = null;

    // Datos de formas
    this.gearIds         = null;
    this.gearAngles      = null;
    this.gearRadii       = null;
    this.gearHeights     = null;
    this.vortexY         = null;
    this.vortexAngles    = null;
    this.vortexRadii     = null;
    this.constelTypes    = null;

    // Control de scroll — DOBLE SUAVIZADO
    this.scrollObj        = { progress: 0.0 };
    this.smoothedProgress = 0.0;
    this.activeStationIdx = 0;
    this.currentTab       = 'training';
    this.lastTransitionTime = 0; // Cooldown timer to prevent inertial wheel/touch events from skipping slides

    // Carrusel Horizontal (Estación 4)
    this.carouselIndex    = 0;
    this.carouselLocked   = false;
    this._noCarouselReset = false; // Guardia anti-recursión

    // ── Global slide-lock (wheel + touch) ──
    // isAnimating = true during ANY GSAP slide transition.
    // ALL wheel and touch inputs are silently dropped while locked.
    this.isAnimating      = false;   // Global animation state guard
    this._touchStartY     = 0;       // Touch start Y for vertical swipe detection
    this._touchHandled    = false;   // Single-gesture flag — reset only on touchstart

    // ── DIRECTIVE 1: Mobile-specific secondary gesture lock ──
    // isMobileScrolling is a dedicated mobile brake that persists until BOTH
    // the GSAP animation completes AND the touchend event fires.
    // This eliminates carry-over inertia that isAnimating alone cannot block
    // when the finger is still physically on the screen post-transition.
    this.isMobileScrolling = false;  // Mobile-specific single-swipe guardrail
    this._touchEndPending  = false;  // Tracks whether finger is still on screen

    // ── Depth BG ping-pong oscillator state ──
    // bgOscTime tracks accumulated time for the sine-wave bounce
    this._bgOscTime       = 0;       // Elapsed oscillator time (seconds)
    this.BG_X_LIMIT       = 4.0;     // World-space X boundary for the oscillation

    // Limitador de frame rate para móvil (30 FPS) — ahorra CPU/GPU en gama baja
    this._lastFrame   = 0;
    this._frameLimit  = _isMobile ? 1000 / 30 : 0; // 0 = ilimitado en desktop

    // Mouse
    this.mouse       = new THREE.Vector2(9999, 9999);
    this.mouseWorld  = new THREE.Vector3(9999, 9999, 0);

    // ── DIRECTIVE 2: Spring-physics hover state ──
    // Per-particle velocity and current offset for elastic recovery
    // Stored as flat Float32Arrays (x/y) for performance in the hot path
    this._hoverVelX  = null;   // initialized in createSystem after N is known
    this._hoverVelY  = null;
    this._hoverCurX  = null;
    this._hoverCurY  = null;

    // Boot
    this.initThree();
    this.initParticleArrays();
    this.createSystem();
    this.createDepthBackground();  // D3: secondary starfield
    this.initAnimations();
    this.initNavigation();
    this.initCarousel();
    this.initInteraction();
    this.animate();
  }

  // ====================================================================
  // 1. THREE.JS SETUP
  // ====================================================================
  initThree() {
    this.scene = new THREE.Scene();
    // ── DIRECTIVE 4: Compress FOV + push camera back to shrink shapes ──
    // FOV reduced from 60 → 50 (tighter lens = shapes appear smaller & more refined)
    // camera.z increased from 7.2 → 8.8 (pushes geometry further back)
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300);
    this.camera.position.z = 8.8;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.renderer.setClearColor(0x000000, 0);
  }

  // Textura radial espacial — sin fucsia
  createParticleTexture() {
    const size = 96;
    const c    = document.createElement('canvas');
    c.width    = c.height = size;
    const ctx  = c.getContext('2d');
    const half = size / 2;
    const g    = ctx.createRadialGradient(half, half, 0, half, half, half);
    g.addColorStop(0,    'rgba(255,255,255,1.0)');
    g.addColorStop(0.07, 'rgba(255,255,255,0.98)');
    g.addColorStop(0.22, 'rgba(140,220,255,0.88)');
    g.addColorStop(0.50, 'rgba(0,120,255,0.40)');
    g.addColorStop(0.82, 'rgba(255,110,0,0.10)');
    g.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  // ====================================================================
  // 2. PRE-CÁLCULO DE POSICIONES POR ESTACIÓN
  // ====================================================================
  initParticleArrays() {
    const N = this.PARTICLE_COUNT;

    this.posRocket  = new Float32Array(N * 3);
    this.posWeb     = new Float32Array(N * 3);
    this.posAuto    = new Float32Array(N * 3);
    this.posMkt     = new Float32Array(N * 3);
    this.posCap     = new Float32Array(N * 3);
    this.posContact = new Float32Array(N * 3);

    // Respiración viva — amplitud alta para figuras con energía real
    this.breathPhase = new Float32Array(N);
    this.breathAmp   = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      this.breathPhase[i] = Math.random() * Math.PI * 2;
      this.breathAmp[i]   = 0.055 + Math.random() * 0.085; // Alta vs v2.0 (era 0.018-0.050)
    }

    // Direcciones unitarias para explosión radial caótica
    this.randomDirs = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      this.randomDirs[i*3]   = Math.sin(ph) * Math.cos(th);
      this.randomDirs[i*3+1] = Math.sin(ph) * Math.sin(th);
      this.randomDirs[i*3+2] = Math.cos(ph);
    }

    // ------------------------------------------------------------------
    // ESTACIÓN 0 — COHETE ESPACIAL ESTILIZADO (Proporcional para Mobile/Desktop)
    // ------------------------------------------------------------------
    const noseLimit = Math.floor(N * 0.18);
    const bodyLimit = Math.floor(N * 0.48);
    const finsLimit = Math.floor(N * 0.64);
    const nozLimit  = Math.floor(N * 0.74);

    for (let i = 0; i < N; i++) {
      let x = 0, y = 0, z = 0;

      if (i < noseLimit) {
        // Cono de nariz aerodinámico (punta aguda)
        const h      = Math.pow(Math.random(), 0.65); // Más denso en la base del cono
        const coneR  = (1 - h) * 0.36;
        const ang    = Math.random() * Math.PI * 2;
        x = (coneR + (Math.random() - 0.5) * 0.025) * Math.cos(ang);
        z = (coneR + (Math.random() - 0.5) * 0.025) * Math.sin(ang);
        y = 2.3 + h * 1.6;  // Y: 2.3 (base cono) → 3.9 (punta)

      } else if (i < bodyLimit) {
        // Cuerpo cilíndrico delgado y largo
        const ang    = Math.random() * Math.PI * 2;
        const isOuter= Math.random() < 0.82;
        const r      = isOuter ? 0.34 + (Math.random() - 0.5) * 0.03 : Math.random() * 0.26;
        y = -1.7 + Math.random() * 4.0;
        x = r * Math.cos(ang);
        z = r * Math.sin(ang);

      } else if (i < finsLimit) {
        // Alerones triangulares con sweepback (3 aletas)
        const finIdx  = Math.floor(Math.random() * 3);
        const baseAng = (finIdx / 3) * Math.PI * 2;
        const finW    = Math.random(); // 0=inner 1=tip
        const finH    = Math.random(); // 0=top 1=bottom
        const outerR  = 0.34 + finW * 1.10;
        const finY    = -1.7 - finH * 1.25;
        const swpAng  = baseAng + finW * 0.40; // Sweepback
        x = outerR * Math.cos(swpAng + (Math.random() - 0.5) * 0.15);
        z = outerR * Math.sin(swpAng + (Math.random() - 0.5) * 0.15);
        y = finY;

      } else if (i < nozLimit) {
        // Tobera de motor (campana pronunciada)
        const nH  = Math.pow(Math.random(), 0.45);
        const nR  = 0.10 + nH * 0.56;
        const nAng= Math.random() * Math.PI * 2;
        x = nR * Math.cos(nAng);
        z = nR * Math.sin(nAng);
        y = -2.95 - nH * 0.40;

      } else {
        // Estela de propulsión — cola de fuego
        const ex    = Math.pow(Math.random(), 0.55);
        const exAng = Math.random() * Math.PI * 2;
        const exR   = Math.random() * (0.28 + ex * 0.90);
        const exY   = -3.38 - ex * 2.1;
        const sctr  = (Math.random() - 0.5) * ex * 0.65;
        x = exR * Math.cos(exAng) + sctr;
        z = exR * Math.sin(exAng) + sctr;
        y = exY;
      }

      this.posRocket[i*3]   = x;
      this.posRocket[i*3+1] = y;
      this.posRocket[i*3+2] = z;
    }

    // Rotar todo el cohete -45° en Z → inclinación diagonal (apunta hacia arriba-derecha)
    const cosA = Math.cos(-Math.PI / 4);
    const sinA = Math.sin(-Math.PI / 4);
    for (let i = 0; i < N; i++) {
      const ox = this.posRocket[i*3];
      const oy = this.posRocket[i*3+1];
      this.posRocket[i*3]   = ox * cosA - oy * sinA;
      this.posRocket[i*3+1] = ox * sinA + oy * cosA;
    }

    // ------------------------------------------------------------------
    // ESTACIÓN 1 — WEB SYSTEMS & AI MODELS (Neural Nodes webbed in Browser Shell)
    // ------------------------------------------------------------------
    const nodes = [
      { x: -1.0, y:  0.4, z:  0.0 }, // Top left node
      { x:  1.0, y:  0.5, z:  0.0 }, // Top right node
      { x: -0.4, y: -0.5, z:  0.1 }, // Bottom left-ish node
      { x:  0.4, y: -0.4, z: -0.1 }, // Bottom right-ish node
      { x:  0.0, y:  0.0, z:  0.0 }, // Center node
      { x: -1.2, y: -0.2, z: -0.05}, // Far left node
      { x:  1.2, y: -0.1, z:  0.05}  // Far right node
    ];

    const connections = [
      [0, 1], [0, 4], [1, 4], [2, 4], [3, 4], [2, 3],
      [5, 0], [5, 2], [6, 1], [6, 3]
    ];

    const shellLimit = Math.floor(N * 0.35);
    const nodesLimit = Math.floor(N * 0.55);

    for (let i = 0; i < N; i++) {
      let x = 0, y = 0, z = 0;

      if (i < shellLimit) {
        // --- 1. Browser Interface Shell ---
        const sub = i % 4;
        const zSpread = (Math.random() - 0.5) * 0.05;
        if (sub === 0) {
          // Horizontal borders (Top and Bottom)
          const isTop = Math.random() > 0.4;
          x = (Math.random() - 0.5) * 3.2;
          y = isTop ? 1.1 : -1.1;
          z = zSpread;
        } else if (sub === 1) {
          // Vertical borders (Left and Right)
          const isLeft = Math.random() > 0.5;
          x = isLeft ? -1.6 : 1.6;
          y = (Math.random() - 0.5) * 2.2;
          z = zSpread;
        } else if (sub === 2) {
          // Top bar division (e.g. at Y = 0.8)
          x = (Math.random() - 0.5) * 3.2;
          y = 0.8;
          z = zSpread;
        } else {
          // Window Control Dots (3 dots in top-left)
          const dotIdx = Math.floor(Math.random() * 3);
          const dotX = -1.4 + dotIdx * 0.15;
          const dotY = 0.95;
          const dotR = 0.03 + Math.random() * 0.02;
          const ang = Math.random() * Math.PI * 2;
          x = dotX + dotR * Math.cos(ang);
          y = dotY + dotR * Math.sin(ang);
          z = zSpread;
        }
      } else if (i < nodesLimit) {
        // --- 2. Neural Nodes (Spherical Clusters) ---
        const nodeIdx = i % nodes.length;
        const node = nodes[nodeIdx];
        const r = Math.pow(Math.random(), 2.0) * 0.15; // dense core
        const theta = Math.random() * Math.PI;
        const phi = Math.random() * Math.PI * 2;
        x = node.x + r * Math.sin(theta) * Math.cos(phi);
        y = node.y + r * Math.cos(theta);
        z = node.z + r * Math.sin(theta) * Math.sin(phi);
      } else {
        // --- 3. Interconnecting Neural Web ---
        const connIdx = i % connections.length;
        const conn = connections[connIdx];
        const nodeA = nodes[conn[0]];
        const nodeB = nodes[conn[1]];
        // Lerp along connection path
        const t = Math.random();
        const offsetMag = 0.03 * Math.sin(t * Math.PI);
        const randX = (Math.random() - 0.5) * 0.02;
        const randY = (Math.random() - 0.5) * 0.02;
        const randZ = (Math.random() - 0.5) * 0.02;
        x = nodeA.x + (nodeB.x - nodeA.x) * t + randX;
        y = nodeA.y + (nodeB.y - nodeA.y) * t + offsetMag + randY;
        z = nodeA.z + (nodeB.z - nodeA.z) * t + randZ;
      }

      this.posWeb[i*3]   = x;
      this.posWeb[i*3+1] = y;
      this.posWeb[i*3+2] = z;
    }

    // ------------------------------------------------------------------
    // ESTACIÓN 2 — ENGRANAJES ACOPLADOS (Proporcional para Mobile/Desktop)
    // ------------------------------------------------------------------
    this.gearIds     = new Uint8Array(N);
    this.gearAngles  = new Float32Array(N);
    this.gearRadii   = new Float32Array(N);
    this.gearHeights = new Float32Array(N);

    const gear0Limit = Math.floor(N * 0.33);
    const gear1Limit = Math.floor(N * 0.66);

    for (let i = 0; i < N; i++) {
      const gId = i < gear0Limit ? 0 : i < gear1Limit ? 1 : 2;
      this.gearIds[i] = gId;
      let R, Nd;
      if      (gId === 0) { R = 1.2; Nd = 12; }
      else if (gId === 1) { R = 1.6; Nd = 16; }
      else                { R = 1.2; Nd = 12; }
      const angle   = Math.random() * Math.PI * 2;
      const isTooth = Math.random() > 0.35;
      let r;
      if (isTooth) {
        const h  = 0.16;
        const rB = R + h * Math.min(Math.max(Math.cos(Nd * angle) * 1.5, -1), 1);
        r = rB - Math.random() * 0.12;
      } else {
        const type = Math.random();
        if (type < 0.4) {
          r = Math.random() * 0.38;
        } else {
          const spokes = [0, Math.PI/2, Math.PI, 3*Math.PI/2];
          this.gearAngles[i] = spokes[Math.floor(Math.random() * 4)] + (Math.random()-0.5)*0.12;
          r = 0.38 + Math.random() * (R - 0.38);
        }
      }
      if (!this.gearAngles[i]) this.gearAngles[i] = angle;
      this.gearRadii[i]   = r;
      this.gearHeights[i] = (Math.random() - 0.5) * 0.28;
      let cx, cy;
      if      (gId === 0) { cx = -1.2; cy =  0.8; }
      else if (gId === 1) { cx =  1.2; cy = -0.2; }
      else                { cx = -0.8; cy = -1.8; }
      this.posAuto[i*3]   = cx + r * Math.cos(this.gearAngles[i]);
      this.posAuto[i*3+1] = cy + r * Math.sin(this.gearAngles[i]);
      this.posAuto[i*3+2] = this.gearHeights[i];
    }

    // ------------------------------------------------------------------
    // ESTACIÓN 3 — VÓRTICE HIPERBÓLICO
    // ------------------------------------------------------------------
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

    // ------------------------------------------------------------------
    // ESTACIÓN 4 — CONSTELACIÓN GEOMETRÍA SAGRADA (Proporcional para Mobile/Desktop)
    // ------------------------------------------------------------------
    this.constelTypes = new Uint8Array(N);
    const GR  = (1 + Math.sqrt(5)) / 2; // Golden Ratio
    const iGR = 1 / GR;
    const sI  = 2.1, sD = 1.4;

    const icosVerts = [
      [0,-1,-GR],[0,-1,GR],[0,1,-GR],[0,1,GR],
      [-1,-GR,0],[-1,GR,0],[1,-GR,0],[1,GR,0],
      [-GR,0,-1],[-GR,0,1],[GR,0,-1],[GR,0,1]
    ].map(v => [v[0]*sI, v[1]*sI, v[2]*sI]);

    const dodecVerts = [
      [-1,-1,-1],[-1,-1,1],[-1,1,-1],[-1,1,1],
      [1,-1,-1],[1,-1,1],[1,1,-1],[1,1,1],
      [0,-iGR,-GR],[0,-iGR,GR],[0,iGR,-GR],[0,iGR,GR],
      [-iGR,-GR,0],[-iGR,GR,0],[iGR,-GR,0],[iGR,GR,0],
      [-GR,0,-iGR],[-GR,0,iGR],[GR,0,-iGR],[GR,0,iGR]
    ].map(v => [v[0]*sD, v[1]*sD, v[2]*sD]);

    const buildEdges = (verts, expSq, tol = 0.25) => {
      const edges = [];
      for (let a = 0; a < verts.length; a++) {
        for (let b = a+1; b < verts.length; b++) {
          const dx=verts[a][0]-verts[b][0], dy=verts[a][1]-verts[b][1], dz=verts[a][2]-verts[b][2];
          if (Math.abs(dx*dx+dy*dy+dz*dz - expSq) < tol) edges.push([verts[a], verts[b]]);
        }
      }
      return edges;
    };
    const icosEdges  = buildEdges(icosVerts,  4 * sI * sI);
    const dodecEdges = buildEdges(dodecVerts, (4 / (GR*GR)) * sD * sD);

    const const0Limit = Math.floor(N * 0.27);
    const const1Limit = Math.floor(N * 0.54);
    const const2Limit = Math.floor(N * 0.74);
    const ringStep    = Math.floor(N * 0.09); // (const1Limit - const0Limit) / 3

    for (let i = 0; i < N; i++) {
      let x, y, z;
      if (i < const0Limit) {
        this.constelTypes[i] = 0;
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2*Math.random()-1), r = 2.8;
        x = r * Math.sin(ph) * Math.cos(th); y = r * Math.sin(ph) * Math.sin(th); z = r * Math.cos(ph);
      } else if (i < const1Limit) {
        const ringId = Math.floor((i - const0Limit) / ringStep) + 1;
        this.constelTypes[i] = Math.min(3, ringId);
        const ang = Math.random() * Math.PI * 2, r = 2.3;
        if      (this.constelTypes[i] === 1) { x = r*Math.cos(ang); y = r*Math.sin(ang); z = 0; }
        else if (this.constelTypes[i] === 2) { x = 0; y = r*Math.cos(ang); z = r*Math.sin(ang); }
        else                                  { x = r*Math.cos(ang); y = 0; z = r*Math.sin(ang); }
      } else if (i < const2Limit) {
        this.constelTypes[i] = 4;
        const edge = icosEdges[Math.floor(Math.random() * icosEdges.length)], t = Math.random();
        x = edge[0][0]+(edge[1][0]-edge[0][0])*t+(Math.random()-.5)*.05;
        y = edge[0][1]+(edge[1][1]-edge[0][1])*t+(Math.random()-.5)*.05;
        z = edge[0][2]+(edge[1][2]-edge[0][2])*t+(Math.random()-.5)*.05;
      } else {
        this.constelTypes[i] = 5;
        const edge = dodecEdges[Math.floor(Math.random() * dodecEdges.length)], t = Math.random();
        x = edge[0][0]+(edge[1][0]-edge[0][0])*t+(Math.random()-.5)*.05;
        y = edge[0][1]+(edge[1][1]-edge[0][1])*t+(Math.random()-.5)*.05;
        z = edge[0][2]+(edge[1][2]-edge[0][2])*t+(Math.random()-.5)*.05;
      }
      this.posCap[i*3] = x; this.posCap[i*3+1] = y; this.posCap[i*3+2] = z;
    }

    // ------------------------------------------------------------------
    // ESTACIÓN 5 — GALAXIA ESPIRAL LOGARÍTMICA (3 Brazos)
    // ------------------------------------------------------------------
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
  // 3. THREE.POINTS — PALETA ESPACIAL NUEVA
  // ====================================================================
  createSystem() {
    const N = this.PARTICLE_COUNT;
    this.geometry = new THREE.BufferGeometry();
    const initPos = new Float32Array(N * 3);
    initPos.set(this.posRocket);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(initPos, 3));

    // Paleta: Azul Eléctrico · Cian Cuántico · Naranja Espacial · Blanco Estelar
    // SIN fucsias ni rosas — espectro frío-cálido controlado
    const colors = new Float32Array(N * 3);
    const palette = [
      new THREE.Color(0x0055FF), // Azul Eléctrico profundo
      new THREE.Color(0x00C8FF), // Cian Cuántico
      new THREE.Color(0xFF5E00), // Naranja Espacial Incandescente
      new THREE.Color(0xFFFFFF), // Blanco Estelar
      new THREE.Color(0x0088EE), // Cian-Azul medio
      new THREE.Color(0xFFAA22)  // Ámbar Cósmico
    ];
    for (let i = 0; i < N; i++) {
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
    }
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.092,
      sizeAttenuation: true,
      depthWrite: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      map: this.createParticleTexture()
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    // ── DIRECTIVE 2: Allocate spring-physics hover buffers ──
    this._hoverVelX = new Float32Array(N);
    this._hoverVelY = new Float32Array(N);
    this._hoverCurX = new Float32Array(N);
    this._hoverCurY = new Float32Array(N);
  }

  // ====================================================================
  // DIRECTIVE 3: DEPTH BACKGROUND — Secondary isolated starfield
  // 1,800 cosmic dust particles at far Z, galactic amber/pearl palette
  // ====================================================================
  createDepthBackground() {
    const BN = this.BG_PARTICLE_COUNT;
    const bgPos = new Float32Array(BN * 3);
    const bgCol = new Float32Array(BN * 3);

    // Galactic palette: dim amber, starlight pearl, cosmic dust blue — low intensity
    const bgPalette = [
      new THREE.Color(0x4a3010), // Deep space amber (dim)
      new THREE.Color(0x3d3020), // Warm cosmic dust
      new THREE.Color(0x8a7a60), // Starlight pearl (muted gold)
      new THREE.Color(0x5a5060), // Distant nebula mauve
      new THREE.Color(0x2a3040), // Cold deep-space blue
      new THREE.Color(0x706050)  // Faint cosmic tan
    ];

    for (let i = 0; i < BN; i++) {
      // Distribute uniformly in a wide 3D volume, pushed deep behind primary shapes
      bgPos[i*3]   = (Math.random() - 0.5) * 60;  // X: wide spread
      bgPos[i*3+1] = (Math.random() - 0.5) * 40;  // Y: tall spread
      bgPos[i*3+2] = -20 - Math.random() * 60;    // Z: far behind (–20 to –80)

      const c = bgPalette[Math.floor(Math.random() * bgPalette.length)];
      // Randomise per-particle brightness to simulate stellar magnitude variation
      const brightness = 0.25 + Math.random() * 0.55;
      bgCol[i*3]   = c.r * brightness;
      bgCol[i*3+1] = c.g * brightness;
      bgCol[i*3+2] = c.b * brightness;
    }

    this.bgGeometry = new THREE.BufferGeometry();
    this.bgGeometry.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
    this.bgGeometry.setAttribute('color',    new THREE.BufferAttribute(bgCol, 3));

    // Slightly larger point size so they're faintly visible at depth
    this.bgMaterial = new THREE.PointsMaterial({
      size: 0.28,
      sizeAttenuation: true,
      depthWrite: false,
      transparent: true,
      opacity: 0.70,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      map: this.createParticleTexture()
    });

    this.bgPoints = new THREE.Points(this.bgGeometry, this.bgMaterial);
    // Add BEFORE primary points so it renders behind them
    this.scene.add(this.bgPoints);
  }

  // ====================================================================
  // 4. RENDER LOOP — Lerp · Explosión Asimétrica · Respiración · Hover
  // ====================================================================
  animate() {
    requestAnimationFrame(() => this.animate());

    // Limitador de FPS para móviles: 30fps cap para reducir carga de GPU
    if (this._frameLimit > 0) {
      const now = performance.now();
      if (now - this._lastFrame < this._frameLimit) return;
      this._lastFrame = now;
    }

    const elapsed = this.clock.getElapsedTime();

    // Lerp secundario: suaviza cualquier salto residual que supere el scrub de GSAP
    this.smoothedProgress += (this.scrollObj.progress - this.smoothedProgress) * 0.055;
    const progress = this.smoothedProgress;

    const INTERVAL = 0.2;
    let idx = Math.min(4, Math.floor(progress / INTERVAL));
    let t   = (progress % INTERVAL) / INTERVAL;
    if (progress >= 1.0) { idx = 4; t = 1.0; }

    // Factor de explosión asimétrico:
    // Primera mitad → explosión agresiva/caótica (exponente < 1 = curva más corta)
    // Segunda mitad → convergencia suave/elegante (exponente > 1)
    const ep_raw = Math.sin(t * Math.PI);
    const ep = t < 0.5
      ? Math.pow(ep_raw, 0.60) * 1.18   // Estallido rápido
      : Math.pow(ep_raw, 1.40) * 0.88;  // Recomposición fluida

    const posAttr  = this.geometry.attributes.position;
    const posArray = posAttr.array;
    const N        = this.PARTICLE_COUNT;

    // ── DIRECTIVE 2: Spring-physics hover constants ──
    // springFriction: acceleration toward target; dampening: velocity decay per frame
    const springFriction = 0.048;  // Gentle attraction toward displaced target
    const dampening      = 0.72;   // Velocity decay (lower = snappier recovery)
    const hoverRadius    = 1.65;   // World-space influence radius
    const hoverStrength  = 0.52;   // Max displacement magnitude

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;

      // Coordenada de Origen (Estación A)
      let xA=0, yA=0, zA=0;
      this.computeCoord(idx, i, i3, elapsed, (x,y,z)=>{ xA=x; yA=y; zA=z; });

      // Coordenada de Destino (Estación B)
      let xB=xA, yB=yA, zB=zA;
      this.computeCoord(idx+1, i, i3, elapsed, (x,y,z)=>{ xB=x; yB=y; zB=z; });

      // Interpolación Lineal A → B
      let rx = xA + (xB - xA) * t;
      let ry = yA + (yB - yA) * t;
      let rz = zA + (zB - zA) * t;

      // Explosión Caótica Asimétrica con varianza por partícula
      if (ep > 0.001) {
        const len = Math.sqrt(rx*rx + ry*ry + rz*rz) || 1;
        const pf  = 0.82 + this.breathAmp[i] * 4.8; // Factor individual caótico
        const push = ep * 5.8 * pf;
        const turb = ep * 2.9 * pf;
        rx += (rx/len) * push + this.randomDirs[i3]   * turb;
        ry += (ry/len) * push + this.randomDirs[i3+1] * turb;
        rz += (rz/len) * push + this.randomDirs[i3+2] * turb;
      }

      // Respiración Viva — alta amplitud, se apaga en explosión
      const bFade  = 1 - Math.min(1, ep * 1.75);
      const bAmp   = this.breathAmp[i] * bFade;
      const nLen   = Math.sqrt(rx*rx + ry*ry + rz*rz) || 1;
      const breath = Math.sin(elapsed * 2.15 + this.breathPhase[i]) * bAmp;
      rx += (rx/nLen) * breath;
      ry += (ry/nLen) * breath;
      rz += (rz/nLen) * breath;

      // ── DIRECTIVE 2: Elastic spring-physics hover (replaces instant push) ──
      // Particles glide away on hover and snap back via velocity-based spring.
      // Only active when NOT in transition explosion phase.
      if (ep < 0.08) {
        const hdx  = rx - this.mouseWorld.x;
        const hdy  = ry - this.mouseWorld.y;
        const dist = Math.sqrt(hdx*hdx + hdy*hdy);

        // Compute target displacement: push outward when inside influence radius
        let targetOffX = 0, targetOffY = 0;
        if (dist < hoverRadius && dist > 0.001) {
          const attenuation = (1 - dist / hoverRadius);  // Distance falloff
          const forceMag    = attenuation * hoverStrength;
          targetOffX = (hdx / dist) * forceMag;
          targetOffY = (hdy / dist) * forceMag;
        }
        // Spring: velocity accelerates toward target, then decays (elastic recovery)
        this._hoverVelX[i] += (targetOffX - this._hoverCurX[i]) * springFriction;
        this._hoverVelY[i] += (targetOffY - this._hoverCurY[i]) * springFriction;
        this._hoverVelX[i] *= dampening;
        this._hoverVelY[i] *= dampening;
        this._hoverCurX[i] += this._hoverVelX[i];
        this._hoverCurY[i] += this._hoverVelY[i];

        rx += this._hoverCurX[i];
        ry += this._hoverCurY[i];
      } else {
        // Fade out accumulated spring offsets during explosion transitions
        this._hoverCurX[i] *= 0.88;
        this._hoverCurY[i] *= 0.88;
        this._hoverVelX[i] *= 0.88;
        this._hoverVelY[i] *= 0.88;
      }

      posArray[i3]   = rx;
      posArray[i3+1] = ry;
      posArray[i3+2] = rz;
    }

    posAttr.needsUpdate = true;
    this.updateSystemLayoutPosition(idx, t);

    // ── DIRECTIVE 3: Infinite ping-pong sine-wave oscillator for depth BG ──
    // bgOscTime grows each frame by a fixed step, driving a sin() wave that
    // bounces bgPoints.position.x between –BG_X_LIMIT and +BG_X_LIMIT.
    // Period ≈ 40 s (2π / 0.157). Rotation adds slow cosmic drift on Y.
    // This is ISOLATED to bgPoints — primary particle arrays are untouched.
    if (this.bgPoints) {
      this._bgOscTime += 0.00157;  // ~40-second full oscillation period
      this.bgPoints.position.x = Math.sin(this._bgOscTime) * this.BG_X_LIMIT;
      this.bgPoints.rotation.y += 0.00015;  // slow Y-drift for cosmic parallax
    }

    this.renderer.render(this.scene, this.camera);
  }

  // Calcula coordenadas de una estación con callback (evita objetos temporales en hot path)
  computeCoord(stationIdx, i, i3, elapsed, cb) {
    let x = 0, y = 0, z = 0;

    if (stationIdx === 0) {
      x = this.posRocket[i3]; y = this.posRocket[i3+1]; z = this.posRocket[i3+2];

    } else if (stationIdx === 1) {
      x = this.posWeb[i3]; y = this.posWeb[i3+1]; z = this.posWeb[i3+2];

    } else if (stationIdx === 2) {
      const gId = this.gearIds[i], r = this.gearRadii[i], bA = this.gearAngles[i];
      let cx, cy, rotS;
      if      (gId === 0) { cx = -1.2; cy =  0.8; rotS =  elapsed * 1.4; }
      else if (gId === 1) { cx =  1.2; cy = -0.2; rotS = -elapsed * 1.05; }
      else                { cx = -0.8; cy = -1.8; rotS =  elapsed * 1.4; }
      const ang = bA + rotS;
      x = cx + r * Math.cos(ang); y = cy + r * Math.sin(ang); z = this.gearHeights[i];

    } else if (stationIdx === 3) {
      const r = this.vortexRadii[i], bA = this.vortexAngles[i], vy = this.vortexY[i];
      const spS = elapsed * 2.0 + vy * 1.25;
      x = r * Math.cos(bA + spS); y = vy; z = r * Math.sin(bA + spS);

    } else if (stationIdx === 4) {
      const gType = this.constelTypes[i];
      const bx = this.posCap[i3], by = this.posCap[i3+1], bz = this.posCap[i3+2];
      // Eje de rotación varía con el panel del carrusel activo (+30° por panel)
      const carBias = this.carouselIndex * (Math.PI / 6);

      if (gType === 0) {
        const a = elapsed * 0.12 + carBias * 0.3;
        x = bx*Math.cos(a) - bz*Math.sin(a); y = by; z = bx*Math.sin(a) + bz*Math.cos(a);
      } else if (gType === 1) {
        const a = elapsed * 1.2 + carBias;
        x = bx*Math.cos(a) - by*Math.sin(a); y = bx*Math.sin(a) + by*Math.cos(a); z = bz;
      } else if (gType === 2) {
        const a = elapsed * 1.2;
        x = bx; y = by*Math.cos(a) - bz*Math.sin(a); z = by*Math.sin(a) + bz*Math.cos(a);
      } else if (gType === 3) {
        const a = elapsed * 1.2 - carBias;
        x = bx*Math.cos(a) - bz*Math.sin(a); y = by; z = bx*Math.sin(a) + bz*Math.cos(a);
      } else {
        const aY = elapsed * 0.18 + carBias * 0.5, aX = elapsed * 0.10;
        const rx2 = bx*Math.cos(aY) - bz*Math.sin(aY), rz2 = bx*Math.sin(aY) + bz*Math.cos(aY);
        x = rx2; y = by*Math.cos(aX) - rz2*Math.sin(aX); z = by*Math.sin(aX) + rz2*Math.cos(aX);
      }

    } else if (stationIdx === 5) {
      const rx0 = this.posContact[i3], rz0 = this.posContact[i3+2];
      const rr  = Math.sqrt(rx0*rx0 + rz0*rz0);
      const rot = elapsed * 0.75 * (1.2 / (rr + 0.25));
      x = rx0*Math.cos(rot) - rz0*Math.sin(rot); y = this.posContact[i3+1]; z = rx0*Math.sin(rot) + rz0*Math.cos(rot);

    } else {
      x = this.posContact[i3]; y = this.posContact[i3+1]; z = this.posContact[i3+2];
    }
    cb(x, y, z);
  }

  // ====================================================================
  // 5. POSICIONAMIENTO DINÁMICO DEL SISTEMA 3D
  // ====================================================================
  updateSystemLayoutPosition(idx, t) {
    const isDesktop = window.innerWidth >= 1024;
    let tX = 0, tY = 0, tScale = 1.0;

    if (isDesktop) {
      const offsetsX = [2.5, -2.5, 2.5, -2.5, 2.5, 0.0];
      tX = offsetsX[idx] + (offsetsX[Math.min(5, idx+1)] - offsetsX[idx]) * t;
    } else {
      // ── DIRECTIVE 2: Mobile scale matrix — shapes are smaller companions ──
      // oY raised to push geometry higher into the upper quadrant (more sky room for text).
      // Scales reduced from 0.52 → 0.42 so typography dominates the lower 60% of viewport.
      const oY     = [1.8, 1.8, 1.8, 1.8, 1.8, 0.0];
      const scales = [0.42, 0.42, 0.42, 0.42, 0.42, 0.52];
      tY     = oY[idx]     + (oY[Math.min(5, idx+1)]     - oY[idx])     * t;
      tScale = scales[idx] + (scales[Math.min(5, idx+1)] - scales[idx]) * t;
    }

    this.points.position.x = THREE.MathUtils.lerp(this.points.position.x, tX, 0.07);
    this.points.position.y = THREE.MathUtils.lerp(this.points.position.y, tY, 0.07);
    this.points.scale.setScalar(THREE.MathUtils.lerp(this.points.scale.x, tScale, 0.07));
  }

  // ====================================================================
  // 6. SCROLLTRIGGER — scrub:1.8, SIN snap nativo (controlado por motor propio)
  // ====================================================================
  initAnimations() {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

    this.masterST = ScrollTrigger.create({
      trigger:    '.journey-wrapper',
      start:      'top top',
      end:        'bottom bottom',
      scrub:      1.8,
      pin:        '.scroll-container',
      pinSpacing: true,
      onUpdate: (self) => {
        this.scrollObj.progress = self.progress;
        this.updateActiveSlide(self.progress);
      }
    });
  }

  // ====================================================================
  // 7. SLIDE ACTIVO CON TRANSICIÓN CSS ACELERADA + HIGHLIGHT NAV
  // ====================================================================
  updateActiveSlide(p) {
    let activeIdx;
    if      (p < 0.10) activeIdx = 0;
    else if (p < 0.30) activeIdx = 1;
    else if (p < 0.50) activeIdx = 2;
    else if (p < 0.70) activeIdx = 3;
    else if (p < 0.90) activeIdx = 4;
    else               activeIdx = 5;

    const prev = this.activeStationIdx;
    this.activeStationIdx = activeIdx;

    document.querySelectorAll('.station-slide').forEach((slide, idx) => {
      slide.classList.toggle('active-slide', idx === activeIdx);
      slide.classList.toggle('exit-slide', idx < activeIdx);
    });

    if (activeIdx === 4 && prev !== 4 && !this._noCarouselReset) {
      this._noCarouselReset = true;
      this.goToCarouselCard(prev < 4 ? 0 : 2);
      this._noCarouselReset = false;
    }

    this.refreshNavHighlight();
  }

  // Actualiza solo el highlight del nav — NO llama a updateActiveSlide ni goToCarouselCard
  refreshNavHighlight() {
    const activeIdx = this.activeStationIdx;
    const tabNames  = ['training', 'projects', 'methodology'];
    document.querySelectorAll('.nav-link, .nav-cta').forEach(link => {
      const idx = parseInt(link.getAttribute('data-index'));
      if (idx === activeIdx) {
        const tab = link.getAttribute('data-tab');
        if (activeIdx === 4 && tab) {
          link.classList.toggle('active', tab === tabNames[this.carouselIndex]);
        } else {
          link.classList.add('active');
        }
      } else {
        link.classList.remove('active');
      }
    });
  }

  // ====================================================================
  // 8. CARRUSEL HORIZONTAL — Wheel Hijacking + Touch + Botones
  // ====================================================================
  initCarousel() {
    const track  = document.getElementById('carousel-track');
    if (!track) return;

    // Botones de flecha
    document.getElementById('carr-prev')?.addEventListener('click', () => {
      this.goToCarouselCard(Math.max(0, this.carouselIndex - 1));
    });
    document.getElementById('carr-next')?.addEventListener('click', () => {
      this.goToCarouselCard(Math.min(2, this.carouselIndex + 1));
    });

    // Indicadores de punto
    document.querySelectorAll('.cind').forEach(dot => {
      dot.addEventListener('click', () => {
        this.goToCarouselCard(parseInt(dot.getAttribute('data-ci')));
      });
    });

    // Swipe táctil
    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      const deltaX = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(deltaX) > 45) {
        if (deltaX > 0) this.goToCarouselCard(Math.min(2, this.carouselIndex + 1));
        else            this.goToCarouselCard(Math.max(0, this.carouselIndex - 1));
      }
    }, { passive: true });

    // Wheel Hijacking — capture:true intercepta ANTES de que el scroll nativo actualice scrollY
    // Cuando se previene el default, ScrollTrigger no recibe el evento de scroll → se congela en 0.8
    window.addEventListener('wheel', (e) => {
      if (this.activeStationIdx !== 4) return;

      const down = e.deltaY > 0;

      if (down && this.carouselIndex < 2) {
        // Todavía hay paneles → interceptar
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!this.carouselLocked) {
          this.carouselLocked = true;
          this.goToCarouselCard(this.carouselIndex + 1);
          setTimeout(() => { this.carouselLocked = false; }, 860);
        }
      } else if (!down && this.carouselIndex > 0) {
        // Retroceder en el carrusel → interceptar
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!this.carouselLocked) {
          this.carouselLocked = true;
          this.goToCarouselCard(this.carouselIndex - 1);
          setTimeout(() => { this.carouselLocked = false; }, 860);
        }
      }
      // else: propaga → ScrollTrigger avanza/retrocede estación
    }, { passive: false, capture: true });
  }

  goToCarouselCard(index) {
    this.carouselIndex = Math.max(0, Math.min(2, index));
    const vp = document.querySelector('.carousel-viewport');
    if (!vp) return;

    gsap.to('#carousel-track', {
      x:        -this.carouselIndex * vp.offsetWidth,
      duration: 0.78,
      ease:     'power3.inOut'
    });

    // Indicadores
    document.querySelectorAll('.cind').forEach((d, i) => {
      d.classList.toggle('active', i === this.carouselIndex);
    });

    // Breadcrumbs
    document.querySelectorAll('.crumb').forEach((c, i) => {
      c.classList.toggle('active', i === this.carouselIndex);
    });

    // Sincronizar tab — llama refreshNavHighlight (NO updateActiveSlide) para romper la recursión
    const tabNames = ['training', 'projects', 'methodology'];
    this.currentTab = tabNames[this.carouselIndex];
    this.refreshNavHighlight();
  }

  // ====================================================================
  // 9. NAVEGACIÓN (Nav + Botones de Viaje)
  // ====================================================================
  initNavigation() {
    document.querySelectorAll('.nav-links a, .nav-logo, .btn-journey').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const ti  = link.getAttribute('data-index') || link.getAttribute('data-target');
        const tab = link.getAttribute('data-tab');
        if (ti !== null && ti !== undefined) {
          const idx      = parseInt(ti);
          const totalH   = document.documentElement.scrollHeight - window.innerHeight;
          const scrollTo = idx * 0.2 * totalH;
          this.lastTransitionTime = Date.now();
          this.isAnimating = true;
          gsap.to(window, {
            scrollTo:  scrollTo,
            duration:  0.8,
            ease:      'power2.out',
            onComplete: () => {
              this.isAnimating = false;
              if (tab) {
                const map = { training: 0, projects: 1, methodology: 2 };
                const ci  = map[tab];
                if (ci !== undefined) this.goToCarouselCard(ci);
              }
            }
          });
        }
        document.getElementById('nav-links').classList.remove('open');
        document.getElementById('menu-toggle').classList.remove('open');
      });
    });

    document.getElementById('menu-toggle').addEventListener('click', () => {
      document.getElementById('menu-toggle').classList.toggle('open');
      document.getElementById('nav-links').classList.toggle('open');
    });
  }

  // ====================================================================
  // 10. MOUSE + RESIZE
  // ====================================================================
  initInteraction() {
    // ── Mouse raycaster — window-normalised NDC, no canvas-offset bias ──
    window.addEventListener('mousemove', e => {
      this.mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      const v = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5).unproject(this.camera);
      const d = v.sub(this.camera.position).normalize();
      const tt = -this.camera.position.z / d.z;
      this.mouseWorld.copy(this.camera.position).addScaledVector(d, tt);
    });

    window.addEventListener('mouseleave', () => {
      this.mouseWorld.set(9999, 9999, 0);
    });

    window.addEventListener('scroll', () => {
      document.getElementById('main-nav').classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });

    // ====================================================================
    // DIRECTIVE 1: ABSOLUTE SLIDE LOCKOUT — WHEEL
    // Intercept ALL wheel events before the browser and ScrollTrigger see them.
    // While cooldown or animation is active, every wheel delta is silently consumed.
    // ====================================================================
    window.addEventListener('wheel', e => {
      // Always prevent native scroll — we own the scroll position entirely
      e.preventDefault();
      e.stopImmediatePropagation();

      const now = Date.now();
      if (now - this.lastTransitionTime < 800) return;

      // ── Carousel hijack at station 4 ──
      if (this.activeStationIdx === 4) {
        const down = e.deltaY > 0;
        if (down && this.carouselIndex < 2) {
          if (!this.carouselLocked) {
            this.carouselLocked = true;
            this.goToCarouselCard(this.carouselIndex + 1);
            setTimeout(() => { this.carouselLocked = false; }, 860);
          }
          return;
        } else if (!down && this.carouselIndex > 0) {
          if (!this.carouselLocked) {
            this.carouselLocked = true;
            this.goToCarouselCard(this.carouselIndex - 1);
            setTimeout(() => { this.carouselLocked = false; }, 860);
          }
          return;
        }
      }

      if (this.isAnimating) return;

      const dir = e.deltaY > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(5, this.activeStationIdx + dir));
      if (next === this.activeStationIdx) return;

      this.navigateToSlide(next);
    }, { passive: false, capture: true });

    // ====================================================================
    // DIRECTIVE 1: HARD TOUCH-GESTURE LOCKOUT ENGINE (MOBILE)
    // Cooldown + isAnimating: blocks all swipe triggers during transition and cooldown.
    // ====================================================================
    window.addEventListener('touchstart', e => {
      const now = Date.now();
      if (now - this.lastTransitionTime < 800 || this.isAnimating || this.isMobileScrolling) {
        e.preventDefault();
        return;
      }
      this._touchStartY  = e.touches[0].clientY;
      this._touchHandled = false;
      this._touchEndPending = true;
    }, { passive: false });

    window.addEventListener('touchmove', e => {
      const now = Date.now();
      if (now - this.lastTransitionTime < 800 || this.isAnimating) {
        e.preventDefault();
        return;
      }

      if (this.isMobileScrolling || this._touchHandled) {
        e.preventDefault();
        return;
      }

      const deltaY = this._touchStartY - e.touches[0].clientY;
      if (Math.abs(deltaY) < 32) return;

      if (this.activeStationIdx === 4) return;

      const dir  = deltaY > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(5, this.activeStationIdx + dir));

      if (next !== this.activeStationIdx) {
        this._touchHandled    = true;
        this.isMobileScrolling = true;
        e.preventDefault();
        this.navigateToSlide(next);
      }
    }, { passive: false });

    window.addEventListener('touchend', () => {
      this._touchEndPending = false;
      if (this._gsapDone) {
        this._gsapDone = false;
        this.isMobileScrolling = false;
      }
    }, { passive: true });

    window.addEventListener('touchcancel', () => {
      this._touchEndPending  = false;
      this._touchHandled     = false;
      this.isMobileScrolling = false;
    }, { passive: true });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        ScrollTrigger.refresh(true);
        this.goToCarouselCard(this.carouselIndex);
      }, 150);
    });
  }

  // ====================================================================
  // DIRECTIVE 1: navigateToSlide — GSAP hard-drive to exact snap position
  // ====================================================================
  navigateToSlide(targetIdx) {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this._gsapDone   = false;
    this.lastTransitionTime = Date.now();

    const totalH   = document.documentElement.scrollHeight - window.innerHeight;
    const scrollTo = Math.round(targetIdx * 0.2 * totalH);

    gsap.to(window, {
      scrollTo: { y: scrollTo, autoKill: false },
      duration: 0.65,
      ease:     'power2.out',
      onComplete: () => {
        setTimeout(() => {
          this.isAnimating = false;
          if (!this._touchEndPending) {
            this.isMobileScrolling = false;
          } else {
            this._gsapDone = true;
          }
        }, 150);
      }
    });
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap === 'undefined' || typeof THREE === 'undefined') {
    console.error('[SolemEngine] GSAP o Three.js no cargados. Verifica las CDNs.');
    return;
  }
  window.solemEngine = new QuantumEngine();
  console.log(
    '[SolemEngine v3.3] Mobile UX Pass:\n' +
    '  · D1: isMobileScrolling Layer-2 lock (GSAP+touchend dual-release)\n' +
    '  · D2: Centered mobile layout, carousel arrows safe-zone enforced\n' +
    '  · D3: Sine-wave ping-pong oscillator on bgPoints.x (±4 WS, ~40s period)'
  );
});
