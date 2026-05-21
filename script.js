/* ======================================================================
   SOLEM ENGINE - CORE DE TRANSMUTACIÓN CUÁNTICA DE PARTÍCULAS
   ====================================================================== */

class QuantumEngine {
  constructor() {
    // 1. Contenedores WebGL y Escena
    this.canvas = document.getElementById('webgl-scene');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    
    // 2. Parámetros del Sistema de Partículas
    this.particleCount = 28000;
    this.geometry = null;
    this.points = null;
    
    // 3. Arrays de Posiciones (Estaciones 0 a 5)
    this.posHero = null;
    this.posWeb = null;
    this.posAuto = null;
    this.posMkt = null;
    this.posCap = null;
    this.posContact = null;
    this.randomDirs = null; // Para efecto dispersión
    
    // 4. Parámetros de Animación y Simulación
    this.scrollObj = { progress: 0.0 };
    this.mouse = { x: 0, y: 0 };
    this.mouseWorld = new THREE.Vector3(9999, 9999, 0); // Fuera de pantalla de inicio
    
    // 5. Parámetros específicos para animar formas individuales
    // Engranajes
    this.gearIds = null;
    this.gearAngles = null;
    this.gearRadii = null;
    this.gearHeights = null;
    // Vórtice
    this.vortexY = null;
    this.vortexAngles = null;
    this.vortexRadii = null;
    // Constelación
    this.constelTypes = null;
    this.currentTab = 'training';
    
    // Inicialización del flujo
    this.initThree();
    this.initParticleArrays();
    this.createSystem();
    this.initNavigation();
    this.initAnimations();
    this.initInteraction();
    
    // Bucle de renderizado
    this.animate();
  }

  // ======================================================================
  // 1. CONFIGURACIÓN THREE.JS
  // ======================================================================
  initThree() {
    this.scene = new THREE.Scene();
    
    // Cámara de Perspectiva Cinematográfica
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.z = 6.8;
    
    // Renderizador de Alto Rendimiento
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }

  // Textura radial generada matemáticamente para simular stardust brillante
  createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.12, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(0.35, 'rgba(0, 242, 254, 0.7)'); // Cian
    gradient.addColorStop(0.65, 'rgba(127, 0, 255, 0.25)'); // Violeta
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    return new THREE.CanvasTexture(canvas);
  }

  // ======================================================================
  // 2. PRE-CÁLCULO MATEMÁTICO DE COORDENADAS DE ESTACIONES
  // ======================================================================
  initParticleArrays() {
    const count = this.particleCount;
    
    this.posHero = new Float32Array(count * 3);
    this.posWeb = new Float32Array(count * 3);
    this.posAuto = new Float32Array(count * 3);
    this.posMkt = new Float32Array(count * 3);
    this.posCap = new Float32Array(count * 3);
    this.posContact = new Float32Array(count * 3);
    
    // Direcciones unitarias aleatorias para dispersión explosiva
    this.randomDirs = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * Math.random() - 1.0);
      this.randomDirs[i * 3] = Math.sin(phi) * Math.cos(theta);
      this.randomDirs[i * 3 + 1] = Math.sin(phi) * Math.sin(theta);
      this.randomDirs[i * 3 + 2] = Math.cos(phi);
    }
    
    // --- ESTACIÓN 0: MICROPROCESADOR 3D ---
    for (let i = 0; i < count; i++) {
      if (i < 9000) {
        // Núcleo del Chip Central (Grilla densa)
        const rx = (Math.random() - 0.5) * 1.5;
        const ry = (Math.random() - 0.5) * 1.5;
        const x = Math.round(rx * 12) / 12; // Snapping
        const y = Math.round(ry * 12) / 12;
        const z = (Math.random() - 0.5) * 0.12;
        this.posHero[i * 3] = x;
        this.posHero[i * 3 + 1] = y;
        this.posHero[i * 3 + 2] = z;
      } else if (i < 17000) {
        // Tarjeta Substrato Principal (Grilla amplia)
        const rx = (Math.random() - 0.5) * 3.8;
        const ry = (Math.random() - 0.5) * 3.8;
        const x = Math.round(rx * 6) / 6;
        const y = Math.round(ry * 6) / 6;
        const z = -0.15 + (Math.random() - 0.5) * 0.05;
        this.posHero[i * 3] = x;
        this.posHero[i * 3 + 1] = y;
        this.posHero[i * 3 + 2] = z;
      } else if (i < 23000) {
        // Pistas y Canales Conductores (Líneas que corren hacia el exterior)
        const axis = Math.random() > 0.5 ? 'x' : 'y';
        const val = (Math.random() - 0.5) * 3.8;
        const spacing = (Math.random() > 0.5 ? 0.7 : -0.7) * (Math.random() * 2.2);
        let x, y;
        if (axis === 'x') {
          x = val;
          y = Math.round(spacing * 2) / 2;
        } else {
          x = Math.round(spacing * 2) / 2;
          y = val;
        }
        const z = 0.08 + (Math.random() - 0.5) * 0.02;
        this.posHero[i * 3] = x;
        this.posHero[i * 3 + 1] = y;
        this.posHero[i * 3 + 2] = z;
      } else {
        // Pines Periféricos (Alineaciones prismáticas en los bordes)
        const border = Math.random() > 0.5 ? 1.9 : -1.9;
        const borderPos = (Math.random() - 0.5) * 3.8;
        const side = Math.random() > 0.5;
        let x, y;
        if (side) {
          x = border;
          y = Math.round(borderPos * 8) / 8;
        } else {
          x = Math.round(borderPos * 8) / 8;
          y = border;
        }
        const z = -0.3 + Math.random() * 0.45;
        this.posHero[i * 3] = x;
        this.posHero[i * 3 + 1] = y;
        this.posHero[i * 3 + 2] = z;
      }
    }
    
    // --- ESTACIÓN 1: WEB & IA (CÚMULO CEREBRAL POR ARMÓNICOS ESFÉRICOS) ---
    for (let i = 0; i < count; i++) {
      const isLeft = Math.random() > 0.5;
      const xOffset = isLeft ? -0.58 : 0.58;
      
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI; // Latitud
      const phi = v * 2.0 * Math.PI; // Longitud
      
      const rBase = 1.35;
      const pert = 0.18 * Math.sin(5.0 * theta) * Math.cos(5.0 * phi) + 
                   0.05 * Math.sin(18.0 * theta) * Math.cos(18.0 * phi);
      const r = rBase * (1.0 + pert);
      
      // Espesor volumétrico interior
      const w = 0.72 + 0.28 * Math.random();
      
      const x = r * w * Math.sin(theta) * Math.cos(phi) + xOffset;
      const y = r * w * Math.cos(theta);
      const z = r * w * Math.sin(theta) * Math.sin(phi);
      
      this.posWeb[i * 3] = x;
      this.posWeb[i * 3 + 1] = y;
      this.posWeb[i * 3 + 2] = z;
    }
    
    // --- ESTACIÓN 2: AUTOMATIZACIÓN (SISTEMA DE TRES ENGRANAJES) ---
    this.gearIds = new Uint8Array(count);
    this.gearAngles = new Float32Array(count);
    this.gearRadii = new Float32Array(count);
    this.gearHeights = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      let gearId = 0;
      if (i < 10000) gearId = 0; // Engranaje Central-Izquierdo
      else if (i < 20000) gearId = 1; // Engranaje Derecho (Grande)
      else gearId = 2; // Engranaje Inferior
      
      this.gearIds[i] = gearId;
      
      let R, N;
      if (gearId === 0) { R = 1.2; N = 12; }
      else if (gearId === 1) { R = 1.6; N = 16; }
      else { R = 1.2; N = 12; }
      
      const angle = Math.random() * 2.0 * Math.PI;
      const isTooth = Math.random() > 0.35;
      
      let r;
      if (isTooth) {
        // Corona dentada (Onda cuadrada clampada)
        const h = 0.16;
        const rBorder = R + h * Math.min(Math.max(Math.cos(N * angle) * 1.5, -1.0), 1.0);
        r = rBorder - Math.random() * 0.12;
      } else {
        // Estructura interna (Buje central y rayos)
        const type = Math.random();
        if (type < 0.4) {
          r = Math.random() * 0.38; // Eje central
        } else {
          // Rayos ortogonales
          const spokes = [0, Math.PI/2, Math.PI, 3.0*Math.PI/2];
          const closest = spokes[Math.floor(Math.random() * spokes.length)];
          r = 0.38 + Math.random() * (R - 0.38);
          this.gearAngles[i] = closest + (Math.random() - 0.5) * 0.12; // Pequeña amplitud de rayo
        }
      }
      
      if (!this.gearAngles[i]) {
        this.gearAngles[i] = angle;
      }
      this.gearRadii[i] = r;
      
      const z = (Math.random() - 0.5) * 0.28;
      this.gearHeights[i] = z;
      
      // Coordenadas iniciales en el plano
      let cx, cy;
      if (gearId === 0) { cx = -1.2; cy = 0.8; }
      else if (gearId === 1) { cx = 1.2; cy = -0.2; }
      else { cx = -0.8; cy = -1.8; }
      
      this.posAuto[i * 3] = cx + r * Math.cos(this.gearAngles[i]);
      this.posAuto[i * 3 + 1] = cy + r * Math.sin(this.gearAngles[i]);
      this.posAuto[i * 3 + 2] = z;
    }
    
    // --- ESTACIÓN 3: MARKETING (VÓRTICE/EMBUDO HIPERBÓLICO EXPONENCIAL) ---
    this.vortexY = new Float32Array(count);
    this.vortexAngles = new Float32Array(count);
    this.vortexRadii = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      const y = (Math.random() - 0.5) * 5.0; // Rango vertical
      const angle = Math.random() * 2.0 * Math.PI;
      // Trompeta matemática: r(y) = a * e^(-b * y)
      const baseR = 0.65 + 0.3 * Math.pow(y + 2.5, 1.8);
      const r = baseR * (0.92 + 0.08 * Math.random()); // Pequeño espesor
      
      this.vortexY[i] = y;
      this.vortexAngles[i] = angle;
      this.vortexRadii[i] = r;
      
      this.posMkt[i * 3] = r * Math.cos(angle);
      this.posMkt[i * 3 + 1] = y;
      this.posMkt[i * 3 + 2] = r * Math.sin(angle);
    }
    
    // --- ESTACIÓN 4: CAPACITACIÓN / CONSTEALCIÓN SAGRADA (DODEC + ICOS + ANILLOS) ---
    this.constelTypes = new Uint8Array(count);
    
    const phi = (1 + Math.sqrt(5)) / 2;
    const iphi = 1.0 / phi;
    
    // Escala del Icosaedro y Dodecaedro
    const scaleIcos = 2.1;
    const scaleDodec = 1.4;
    
    const icosVerts = [
      [0, -1, -phi], [0, -1, phi], [0, 1, -phi], [0, 1, phi],
      [-1, -phi, 0], [-1, phi, 0], [1, -phi, 0], [1, phi, 0],
      [-phi, 0, -1], [-phi, 0, 1], [phi, 0, -1], [phi, 0, 1]
    ].map(v => [v[0] * scaleIcos, v[1] * scaleIcos, v[2] * scaleIcos]);
    
    const dodecVerts = [
      [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1],
      [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1],
      [0, -iphi, -phi], [0, -iphi, phi], [0, iphi, -phi], [0, iphi, phi],
      [-iphi, -phi, 0], [-iphi, phi, 0], [iphi, -phi, 0], [iphi, phi, 0],
      [-phi, 0, -iphi], [-phi, 0, iphi], [phi, 0, -iphi], [phi, 0, iphi]
    ].map(v => [v[0] * scaleDodec, v[1] * scaleDodec, v[2] * scaleDodec]);
    
    // Filtrar aristas del Icosaedro (largo esperado de arista = 2 * scaleIcos)
    const icosEdges = [];
    for (let a = 0; a < icosVerts.length; a++) {
      for (let b = a + 1; b < icosVerts.length; b++) {
        const dx = icosVerts[a][0] - icosVerts[b][0];
        const dy = icosVerts[a][1] - icosVerts[b][1];
        const dz = icosVerts[a][2] - icosVerts[b][2];
        const dSq = dx*dx + dy*dy + dz*dz;
        const expected = 4.0 * scaleIcos * scaleIcos;
        if (Math.abs(dSq - expected) < 0.2) {
          icosEdges.push([icosVerts[a], icosVerts[b]]);
        }
      }
    }
    
    // Filtrar aristas del Dodecaedro (largo esperado de arista = 2/phi * scaleDodec)
    const dodecEdges = [];
    for (let a = 0; a < dodecVerts.length; a++) {
      for (let b = a + 1; b < dodecVerts.length; b++) {
        const dx = dodecVerts[a][0] - dodecVerts[b][0];
        const dy = dodecVerts[a][1] - dodecVerts[b][1];
        const dz = dodecVerts[a][2] - dodecVerts[b][2];
        const dSq = dx*dx + dy*dy + dz*dz;
        const expected = (4.0 / (phi * phi)) * scaleDodec * scaleDodec;
        if (Math.abs(dSq - expected) < 0.2) {
          dodecEdges.push([dodecVerts[a], dodecVerts[b]]);
        }
      }
    }
    
    for (let i = 0; i < count; i++) {
      let x, y, z;
      if (i < 8000) {
        // Esfera Estructural Externa
        this.constelTypes[i] = 0;
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2 * Math.PI;
        const phiAngle = Math.acos(2.0 * v - 1.0);
        const r = 2.8;
        x = r * Math.sin(phiAngle) * Math.cos(theta);
        y = r * Math.sin(phiAngle) * Math.sin(theta);
        z = r * Math.cos(phiAngle);
      } else if (i < 16000) {
        // Anillos Ortogonales (XY=1, YZ=2, XZ=3)
        const ringId = Math.floor((i - 8000) / 2666) + 1;
        this.constelTypes[i] = Math.min(3, ringId);
        
        const angle = Math.random() * 2 * Math.PI;
        const r = 2.3;
        
        if (this.constelTypes[i] === 1) {
          x = r * Math.cos(angle); y = r * Math.sin(angle); z = 0;
        } else if (this.constelTypes[i] === 2) {
          x = 0; y = r * Math.cos(angle); z = r * Math.sin(angle);
        } else {
          x = r * Math.cos(angle); y = 0; z = r * Math.sin(angle);
        }
      } else if (i < 22000) {
        // Aristas del Icosaedro (Tipo 4)
        this.constelTypes[i] = 4;
        const edge = icosEdges[Math.floor(Math.random() * icosEdges.length)];
        const t = Math.random();
        x = edge[0][0] + (edge[1][0] - edge[0][0]) * t + (Math.random() - 0.5) * 0.05;
        y = edge[0][1] + (edge[1][1] - edge[0][1]) * t + (Math.random() - 0.5) * 0.05;
        z = edge[0][2] + (edge[1][2] - edge[0][2]) * t + (Math.random() - 0.5) * 0.05;
      } else {
        // Aristas del Dodecaedro (Tipo 5)
        this.constelTypes[i] = 5;
        const edge = dodecEdges[Math.floor(Math.random() * dodecEdges.length)];
        const t = Math.random();
        x = edge[0][0] + (edge[1][0] - edge[0][0]) * t + (Math.random() - 0.5) * 0.05;
        y = edge[0][1] + (edge[1][1] - edge[0][1]) * t + (Math.random() - 0.5) * 0.05;
        z = edge[0][2] + (edge[1][2] - edge[0][2]) * t + (Math.random() - 0.5) * 0.05;
      }
      
      this.posCap[i * 3] = x;
      this.posCap[i * 3 + 1] = y;
      this.posCap[i * 3 + 2] = z;
    }
    
    // --- ESTACIÓN 5: CONTACTO (GALAXIA ESPIRAL DE 3 BRAZOS) ---
    for (let i = 0; i < count; i++) {
      const arm = i % 3;
      const r = Math.pow(Math.random(), 1.25) * 4.6;
      const spin = 1.35;
      const angle = arm * (2.0 * Math.PI / 3) + r * spin;
      const dispersion = (Math.random() - 0.5) * (0.28 + 0.32 / (r + 0.18));
      
      const x = r * Math.cos(angle + dispersion);
      const z = r * Math.sin(angle + dispersion);
      const y = (Math.random() - 0.5) * 0.42 * Math.exp(-0.25 * r);
      
      this.posContact[i * 3] = x;
      this.posContact[i * 3 + 1] = y;
      this.posContact[i * 3 + 2] = z;
    }
  }

  // ======================================================================
  // 3. CONSTRUCCIÓN DEL OBJETO 3D DE PARTÍCULAS
  // ======================================================================
  createSystem() {
    this.geometry = new THREE.BufferGeometry();
    
    // Inicializar posiciones en el estado del Hero
    const initialPos = new Float32Array(this.particleCount * 3);
    initialPos.set(this.posHero);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(initialPos, 3));
    
    // Asignación de colores cósmicos (Fucsia, Cian, Violeta, Dorado)
    const colors = new Float32Array(this.particleCount * 3);
    for (let i = 0; i < this.particleCount; i++) {
      const roll = Math.random();
      let color;
      if (roll < 0.25) {
        color = new THREE.Color(0xFF1493); // Fucsia Cósmico
      } else if (roll < 0.50) {
        color = new THREE.Color(0x00F2FE); // Cian Cuántico
      } else if (roll < 0.75) {
        color = new THREE.Color(0x7F00FF); // Violeta Cibernético
      } else {
        color = new THREE.Color(0xFFD700); // Polvo Estelar Dorado
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Material de Partículas
    const material = new THREE.PointsMaterial({
      size: 0.118,
      sizeAttenuation: true,
      depthWrite: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      map: this.createParticleTexture()
    });
    
    this.points = new THREE.Points(this.geometry, material);
    this.scene.add(this.points);
  }

  // ======================================================================
  // 4. ANIMACIÓN DE TRANSMUTACIÓN Y RENDERLOOP
  // ======================================================================
  animate() {
    requestAnimationFrame(() => this.animate());
    
    const elapsed = this.clock.getElapsedTime();
    const progress = this.scrollObj.progress;
    
    // Detalle de interpolación lineal entre estaciones
    const interval = 0.2;
    let idx = Math.floor(progress / interval);
    let t = (progress % interval) / interval;
    
    if (progress >= 1.0) {
      idx = 4;
      t = 1.0;
    }
    
    // Factor de Explosión Intermedio: E(t) = sin(t * PI)
    const ep = Math.sin(t * Math.PI);
    
    const activePosAttr = this.geometry.attributes.position;
    const activeArr = activePosAttr.array;
    const count = this.particleCount;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // A. Calcular coordenadas dinámicas para Estación A (Origen)
      let xA, yA, zA;
      if (idx === 0) {
        // Hero: con reacción magnética sutil del mouse
        xA = this.posHero[i3];
        yA = this.posHero[i3+1];
        zA = this.posHero[i3+2];
        
        if (this.mouseWorld) {
          const dx = xA - this.mouseWorld.x;
          const dy = yA - this.mouseWorld.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const rHover = 2.0;
          
          if (dist < rHover && dist > 0.001) {
            // Empuje inercial magnético que decae al hacer scroll
            const force = (1.0 - dist / rHover) * 0.35 * (1.0 - progress / 0.2);
            xA += (dx / dist) * force;
            yA += (dy / dist) * force;
          }
        }
      } else if (idx === 1) {
        xA = this.posWeb[i3];
        yA = this.posWeb[i3+1];
        zA = this.posWeb[i3+2];
      } else if (idx === 2) {
        // Engranajes rotatorios en sentidos contrarios
        const gearId = this.gearIds[i];
        const r = this.gearRadii[i];
        const z = this.gearHeights[i];
        const baseAngle = this.gearAngles[i];
        
        let cx, cy, rotSpeed;
        if (gearId === 0) {
          cx = -1.2; cy = 0.8; rotSpeed = elapsed * 1.4;
        } else if (gearId === 1) {
          cx = 1.2; cy = -0.2; rotSpeed = -elapsed * 1.4 * 0.75; // R0/R1 ratio
        } else {
          cx = -0.8; cy = -1.8; rotSpeed = elapsed * 1.4;
        }
        const ang = baseAngle + rotSpeed;
        xA = cx + r * Math.cos(ang);
        yA = cy + r * Math.sin(ang);
        zA = z;
      } else if (idx === 3) {
        // Vórtice helicoidal
        const r = this.vortexRadii[i];
        const baseAngle = this.vortexAngles[i];
        const y = this.vortexY[i];
        const spiralSpeed = elapsed * 2.0 + y * 1.25;
        xA = r * Math.cos(baseAngle + spiralSpeed);
        yA = y;
        zA = r * Math.sin(baseAngle + spiralSpeed);
      } else if (idx === 4) {
        // Constelación de Geometría Sagrada (Rotación ortogonal de anillos)
        const gType = this.constelTypes[i];
        const bx = this.posCap[i3];
        const by = this.posCap[i3+1];
        const bz = this.posCap[i3+2];
        
        if (gType === 0) {
          // Esfera: rotación lenta
          const ang = elapsed * 0.12;
          xA = bx * Math.cos(ang) - bz * Math.sin(ang);
          yA = by;
          zA = bx * Math.sin(ang) + bz * Math.cos(ang);
        } else if (gType === 1) {
          // XY Ring
          const ang = elapsed * 1.2;
          xA = bx * Math.cos(ang) - by * Math.sin(ang);
          yA = bx * Math.sin(ang) + by * Math.cos(ang);
          zA = bz;
        } else if (gType === 2) {
          // YZ Ring
          const ang = elapsed * 1.2;
          xA = bx;
          yA = by * Math.cos(ang) - bz * Math.sin(ang);
          zA = by * Math.sin(ang) + bz * Math.cos(ang);
        } else if (gType === 3) {
          // XZ Ring
          const ang = elapsed * 1.2;
          xA = bx * Math.cos(ang) - bz * Math.sin(ang);
          yA = by;
          zA = bx * Math.sin(ang) + bz * Math.cos(ang);
        } else {
          // Poliedros
          const angY = elapsed * 0.18;
          const angX = elapsed * 0.10;
          let rx = bx * Math.cos(angY) - bz * Math.sin(angY);
          let rz = bx * Math.sin(angY) + bz * Math.cos(angY);
          let ry = by;
          
          let rrx = rx;
          let rry = ry * Math.cos(angX) - rz * Math.sin(angX);
          let rrz = ry * Math.sin(angX) + rz * Math.cos(angX);
          xA = rrx; yA = rry; zA = rrz;
        }
      }
      
      // B. Calcular coordenadas dinámicas para Estación B (Destino)
      let xB, yB, zB;
      const nextIdx = idx + 1;
      
      if (nextIdx === 1) {
        xB = this.posWeb[i3];
        yB = this.posWeb[i3+1];
        zB = this.posWeb[i3+2];
      } else if (nextIdx === 2) {
        const gearId = this.gearIds[i];
        const r = this.gearRadii[i];
        const z = this.gearHeights[i];
        const baseAngle = this.gearAngles[i];
        
        let cx, cy, rotSpeed;
        if (gearId === 0) {
          cx = -1.2; cy = 0.8; rotSpeed = elapsed * 1.4;
        } else if (gearId === 1) {
          cx = 1.2; cy = -0.2; rotSpeed = -elapsed * 1.4 * 0.75;
        } else {
          cx = -0.8; cy = -1.8; rotSpeed = elapsed * 1.4;
        }
        const ang = baseAngle + rotSpeed;
        xB = cx + r * Math.cos(ang);
        yB = cy + r * Math.sin(ang);
        zB = z;
      } else if (nextIdx === 3) {
        const r = this.vortexRadii[i];
        const baseAngle = this.vortexAngles[i];
        const y = this.vortexY[i];
        const spiralSpeed = elapsed * 2.0 + y * 1.25;
        xB = r * Math.cos(baseAngle + spiralSpeed);
        yB = y;
        zB = r * Math.sin(baseAngle + spiralSpeed);
      } else if (nextIdx === 4) {
        const gType = this.constelTypes[i];
        const bx = this.posCap[i3];
        const by = this.posCap[i3+1];
        const bz = this.posCap[i3+2];
        
        if (gType === 0) {
          const ang = elapsed * 0.12;
          xB = bx * Math.cos(ang) - bz * Math.sin(ang);
          yB = by;
          zB = bx * Math.sin(ang) + bz * Math.cos(ang);
        } else if (gType === 1) {
          const ang = elapsed * 1.2;
          xB = bx * Math.cos(ang) - by * Math.sin(ang);
          yB = bx * Math.sin(ang) + by * Math.cos(ang);
          zB = bz;
        } else if (gType === 2) {
          const ang = elapsed * 1.2;
          xB = bx;
          yB = by * Math.cos(ang) - bz * Math.sin(ang);
          zB = by * Math.sin(ang) + bz * Math.cos(ang);
        } else if (gType === 3) {
          const ang = elapsed * 1.2;
          xB = bx * Math.cos(ang) - bz * Math.sin(ang);
          yB = by;
          zB = bx * Math.sin(ang) + bz * Math.cos(ang);
        } else {
          const angY = elapsed * 0.18;
          const angX = elapsed * 0.10;
          let rx = bx * Math.cos(angY) - bz * Math.sin(angY);
          let rz = bx * Math.sin(angY) + bz * Math.cos(angY);
          let ry = by;
          
          let rrx = rx;
          let rry = ry * Math.cos(angX) - rz * Math.sin(angX);
          let rrz = ry * Math.sin(angX) + rz * Math.cos(angX);
          xB = rrx; yB = rry; zB = rrz;
        }
      } else if (nextIdx === 5) {
        // Galaxia espiral en rotación kepleriana
        const rx = this.posContact[i3];
        const rz = this.posContact[i3+2];
        const r = Math.sqrt(rx*rx + rz*rz);
        const rot = elapsed * 0.75 * (1.2 / (r + 0.25));
        xB = rx * Math.cos(rot) - rz * Math.sin(rot);
        yB = this.posContact[i3+1];
        zB = rx * Math.sin(rot) + rz * Math.cos(rot);
      }
      
      // C. Interpolación espacial
      let interX = xA + (xB - xA) * t;
      let interY = yA + (yB - yA) * t;
      let interZ = zA + (zB - zA) * t;
      
      // D. Estallido Caótico (Explosión Intermedia)
      if (ep > 0.001) {
        const rx = this.randomDirs[i3];
        const ry = this.randomDirs[i3+1];
        const rz = this.randomDirs[i3+2];
        
        // Empuje radial hacia afuera
        const len = Math.sqrt(interX*interX + interY*interY + interZ*interZ) || 1.0;
        const radX = interX / len;
        const radY = interY / len;
        const radZ = interZ / len;
        
        const pushForce = 3.5 * ep;
        const turbulence = 1.8 * ep;
        
        interX += radX * pushForce + rx * turbulence;
        interY += radY * pushForce + ry * turbulence;
        interZ += radZ * pushForce + rz * turbulence;
      }
      
      activeArr[i3] = interX;
      activeArr[i3+1] = interY;
      activeArr[i3+2] = interZ;
    }
    
    activePosAttr.needsUpdate = true;
    
    // E. Desplazamiento dinámico del centro del objeto
    this.updateSystemLayoutPosition(idx, t);
    
    // Renderizado final
    this.renderer.render(this.scene, this.camera);
  }

  // ======================================================================
  // 5. RESPONSIVE Y DESPLAZAMIENTO CENTRO 3D (QA SENIOR)
  // ======================================================================
  updateSystemLayoutPosition(idx, t) {
    const isDesktop = window.innerWidth >= 1024;
    let targetX = 0;
    let targetY = 0;
    let targetScale = 1.0;
    
    if (isDesktop) {
      // Disposición asimétrica Desktop
      const offsetsX = [2.2, -2.2, 2.2, -2.2, 2.2, 0.0];
      const valA = offsetsX[idx];
      const valB = offsetsX[Math.min(5, idx + 1)];
      targetX = valA + (valB - valA) * t;
      targetY = 0.0;
      targetScale = 1.0;
    } else {
      // Disposición apilada elástica Mobile-First (Objeto arriba y más pequeño)
      const offsetsY = [1.35, 1.35, 1.35, 1.35, 1.35, 0.0];
      const scales = [0.55, 0.55, 0.55, 0.55, 0.55, 0.65];
      
      const valA = offsetsY[idx];
      const valB = offsetsY[Math.min(5, idx + 1)];
      targetY = valA + (valB - valA) * t;
      targetX = 0.0;
      
      const scaleA = scales[idx];
      const scaleB = scales[Math.min(5, idx + 1)];
      targetScale = scaleA + (scaleB - scaleA) * t;
    }
    
    // Lerp amortiguado para una inercia de transición súper premium
    this.points.position.x = THREE.MathUtils.lerp(this.points.position.x, targetX, 0.08);
    this.points.position.y = THREE.MathUtils.lerp(this.points.position.y, targetY, 0.08);
    
    const curScale = this.points.scale.x;
    this.points.scale.setScalar(THREE.MathUtils.lerp(curScale, targetScale, 0.08));
  }

  // ======================================================================
  // 6. TIMELINE DE NAV Y SCROLLTRIGGER (GSAP SLIDE SNAP)
  // ======================================================================
  initAnimations() {
    gsap.registerPlugin(ScrollTrigger);
    
    // Configuración de Scroll Blindado (Inercia unificada para QA)
    ScrollTrigger.normalizeScroll({
      allowNestedScroll: true
    });
    
    // Pin general de la escena
    this.masterTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: ".journey-wrapper",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5,
        pin: ".scroll-container",
        pinSpacing: true,
        snap: {
          snapTo: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
          duration: { min: 0.3, max: 0.7 },
          ease: "power2.inOut",
          delay: 0.05
        }
      }
    });
    
    // Tween de control lineal para mapear la transmutación
    this.masterTimeline.to(this.scrollObj, {
      progress: 1.0,
      ease: "none",
      onUpdate: () => {
        this.updateActiveSlide(this.scrollObj.progress);
      }
    });
  }

  updateActiveSlide(p) {
    const slides = document.querySelectorAll('.station-slide');
    const navLinks = document.querySelectorAll('.nav-link, .nav-cta');
    
    let activeIdx = 0;
    if (p < 0.1) activeIdx = 0;
    else if (p < 0.3) activeIdx = 1;
    else if (p < 0.5) activeIdx = 2;
    else if (p < 0.7) activeIdx = 3;
    else if (p < 0.9) activeIdx = 4;
    else activeIdx = 5;
    
    slides.forEach((slide, idx) => {
      if (idx === activeIdx) {
        slide.classList.add('active-slide');
      } else {
        slide.classList.remove('active-slide');
      }
    });
    
    navLinks.forEach(link => {
      const idx = parseInt(link.getAttribute('data-index'));
      if (idx === activeIdx) {
        const tab = link.getAttribute('data-tab');
        if (activeIdx === 4 && tab) {
          if (tab === this.currentTab) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        } else {
          link.classList.add('active');
        }
      } else {
        link.classList.remove('active');
      }
    });
  }

  // ======================================================================
  // 7. CONTROL DE INTERACCIONES Y PESTAÑAS DEL DASHBOARD (NAV)
  // ======================================================================
  initNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a, .nav-logo, .btn-journey');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        const targetIndex = link.getAttribute('data-index') || link.getAttribute('data-target');
        const tabTarget = link.getAttribute('data-tab');
        
        if (targetIndex !== null && targetIndex !== undefined) {
          const idx = parseInt(targetIndex);
          const totalScrollHeight = document.documentElement.scrollHeight - window.innerHeight;
          const scrollPos = (idx * 0.2) * totalScrollHeight;
          
          gsap.to(window, {
            scrollTo: scrollPos,
            duration: 1.2,
            ease: "power2.inOut",
            onComplete: () => {
              if (tabTarget) {
                this.switchDashboardTab(tabTarget);
              }
            }
          });
        }
        
        // Cerrar menú hamburguesa móvil si está abierto
        document.getElementById('nav-links').classList.remove('open');
        document.getElementById('menu-toggle').classList.remove('open');
      });
    });
    
    // Toggle Menú Móvil
    const menuToggle = document.getElementById('menu-toggle');
    const navLinksContainer = document.getElementById('nav-links');
    
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('open');
      navLinksContainer.classList.toggle('open');
    });
    
    // Configurar clicks internos de pestañas en el Dashboard de la Estación 4
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab-target');
        this.switchDashboardTab(tabName);
      });
    });
  }

  switchDashboardTab(tabName) {
    this.currentTab = tabName;
    const btns = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.tab-pane');
    
    btns.forEach(btn => {
      if (btn.getAttribute('data-tab-target') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    panes.forEach(pane => {
      if (pane.id === `pane-${tabName}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });
    
    // Sincronizar inmediatamente la barra de navegación superior
    this.updateActiveSlide(this.scrollObj.progress);
  }

  initInteraction() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      
      // Proyección inercial al plano 3D
      if (this.camera) {
        const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5);
        vector.unproject(this.camera);
        const dir = vector.sub(this.camera.position).normalize();
        const distance = -this.camera.position.z / dir.z;
        this.mouseWorld.copy(this.camera.position).add(dir.multiplyScalar(distance));
      }
    });
    
    window.addEventListener('mouseleave', () => {
      this.mouseWorld.set(9999, 9999, 0); // Ocultar fuera de foco
    });
    
    // Listener reactivo a resize inteligente (QA anti-rotura)
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      
      ScrollTrigger.refresh();
      if (this.masterTimeline) {
        this.masterTimeline.invalidate();
      }
    });
    
    // Scroll header background toggle
    window.addEventListener('scroll', () => {
      const nav = document.getElementById('main-nav');
      if (window.scrollY > 40) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    });
  }
}

// Inicialización del motor
window.addEventListener('DOMContentLoaded', () => {
  window.solemEngine = new QuantumEngine();
});
