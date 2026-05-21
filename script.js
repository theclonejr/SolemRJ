/* ======================================================================
   SOLEMENGINE - MOTOR COLECTIVO DE VANGUARDIA DE SOLEMRJ
   ====================================================================== */

class SolemEngine {
  constructor() {
    // 1. Inicialización de Contenedores y Variables
    this.canvas = document.getElementById('webgl-scene');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // Objetos 3D Principales
    this.galaxy = null;
    this.coreGroup = null;
    this.innerSphere = null;
    this.outerShell = null;
    
    // Parámetros de la Galaxia Cósmica (25,000 partículas en producción)
    this.galaxyParams = {
      count: 25000,
      radius: 11.5,
      arms: 3,
      spin: 1.2,
      coreColor: '#00f2fe',
      outerColor: '#7f00ff',
      outermostColor: '#ff1493'
    };
    
    // Posición base de la cámara (GSAP animará esto)
    this.baseCameraPos = { x: 0, y: 0, z: 8.5 };
    
    // Datos de interacción con el Mouse (Paralaje)
    this.mouse = { x: 0, y: 0 };
    this.targetMouse = { x: 0, y: 0 };
    this.parallaxIntensity = 1.4;
    
    // Control de física dinámica (Explosión y Pasillo)
    // 0 = Galaxia Espiral, 1 = Dos Columnas Laterales
    this.explosionProgress = 0.0;
    this.columnX = 4.8; // Coordenada X base para las columnas laterales
    
    // Control de tiempo para animaciones
    this.clock = new THREE.Clock();
    
    // Inicialización del Motor
    this.initThree();
    this.updateColumnCoords();
    this.createGalaxy();
    this.createCentralCore();
    this.setupLights();
    this.setupInteraction();
    
    // Inicialización de Animaciones Frontales (GSAP)
    this.initAnimations();
    
    // Arrancar el bucle de renderizado
    this.animate();
  }

  // ======================================================================
  // 1. CONFIGURACIÓN DEL ENTORNO THREE.JS
  // ======================================================================
  initThree() {
    // Escena
    this.scene = new THREE.Scene();
    
    // Cámara de Perspectiva Adaptada para Profundidad Cinematográfica
    this.camera = new THREE.PerspectiveCamera(
      58,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(this.baseCameraPos.x, this.baseCameraPos.y, this.baseCameraPos.z);
    
    // Renderizador de alto rendimiento
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

  // ======================================================================
  // 2. TEXTURA RADIAL GENERADA MATEMÁTICAMENTE EN MEMORIA
  // ======================================================================
  createCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Gradiente Radial de Alto Fulgor (Cian a Púrpura y Transparencia)
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.12, 'rgba(0, 242, 254, 0.95)');
    gradient.addColorStop(0.48, 'rgba(127, 0, 255, 0.45)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    return new THREE.CanvasTexture(canvas);
  }

  // ======================================================================
  // 3. GENERADOR DE FÍSICA PARA DOS COLUMNAS Y GALAXIA ESPIRAL
  // ======================================================================
  createGalaxy() {
    const count = this.galaxyParams.count;
    
    // Arreglos de estado
    this.initialPositions = new Float32Array(count * 3);
    this.normalizedTargetX = new Float32Array(count); // -1 = Izquierda, +1 = Derecha
    this.targetY = new Float32Array(count);
    this.targetZ = new Float32Array(count);
    this.galaxySpeedOffsets = new Float32Array(count);
    
    const colors = new Float32Array(count * 3);
    const colorCore = new THREE.Color(this.galaxyParams.coreColor);
    const colorOuter = new THREE.Color(this.galaxyParams.outerColor);
    const colorOutermost = new THREE.Color(this.galaxyParams.outermostColor);
    
    for (let i = 0; i < count; i++) {
      // A. Coordenadas de la Galaxia Espiral (Estado Inicial)
      const r = Math.pow(Math.random(), 2.8) * this.galaxyParams.radius;
      const armAngle = ((i % this.galaxyParams.arms) * Math.PI * 2) / this.galaxyParams.arms;
      const spinAngle = r * this.galaxyParams.spin;
      
      const dispersionPower = 3;
      const spreadFactor = 0.28 * (r * 0.35 + 0.1);
      
      const randomX = Math.pow(Math.random(), dispersionPower) * (Math.random() < 0.5 ? 1 : -1) * spreadFactor;
      const randomY = Math.pow(Math.random(), dispersionPower) * (Math.random() < 0.5 ? 1 : -1) * spreadFactor * 0.65;
      const randomZ = Math.pow(Math.random(), dispersionPower) * (Math.random() < 0.5 ? 1 : -1) * spreadFactor;
      
      const x = Math.cos(armAngle + spinAngle) * r + randomX;
      const y = randomY;
      const z = Math.sin(armAngle + spinAngle) * r + randomZ;
      
      // Guardar posiciones iniciales de la galaxia
      this.initialPositions[i * 3] = x;
      this.initialPositions[i * 3 + 1] = y;
      this.initialPositions[i * 3 + 2] = z;
      
      // B. Coordenadas de las Dos Columnas Laterales (Bandas anchas que se extienden a los bordes)
      // Si la partícula está en el lado izquierdo (x < 0) va a la columna izquierda, si no, a la derecha.
      // normalizedTargetX representa el factor multiplicador de columnX.
      // Debe ir de 1.0 (borde del pasillo) a ~3.2 (borde exterior de la pantalla), garantizando pasillo limpio.
      if (x < 0) {
        this.normalizedTargetX[i] = -1.0 - Math.random() * 2.2;
      } else {
        this.normalizedTargetX[i] = 1.0 + Math.random() * 2.2;
      }
      
      // Distribución vertical en la columna
      this.targetY[i] = (Math.random() - 0.5) * 16.5;
      
      // Distribución en profundidad
      this.targetZ[i] = (Math.random() - 0.5) * 4.5;
      
      // Velocidad individual de rotación kepleriana
      this.galaxySpeedOffsets[i] = (Math.random() * 0.25 + 0.08) * (1 / (r * 0.5 + 0.4));
      
      // C. Interpolación de Colores Cósmicos
      const mixedColor = colorCore.clone();
      const radiusRatio = r / this.galaxyParams.radius;
      
      if (radiusRatio < 0.35) {
        mixedColor.lerp(colorOuter, radiusRatio * 2.85);
      } else {
        mixedColor.lerp(colorOuter, 1.0);
        mixedColor.lerp(colorOutermost, (radiusRatio - 0.35) * 1.54);
      }
      
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.118,
      sizeAttenuation: true,
      depthWrite: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      map: this.createCircleTexture()
    });
    
    this.galaxy = new THREE.Points(geometry, material);
    this.scene.add(this.galaxy);
    
    // Forzar actualización inicial
    this.updateParticlesPhysics(0);
  }

  // ======================================================================
  // 4. CREACIÓN DEL NÚCLEO CENTRAL DE DOBLE MALLA (PLASMA ENERGY CORE)
  // ======================================================================
  createCentralCore() {
    this.coreGroup = new THREE.Group();
    
    // A. Núcleo Interno (Esfera Translúcida Pulsante)
    const innerGeom = new THREE.SphereGeometry(0.85, 64, 64);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x7f00ff,
      emissiveIntensity: 0.95,
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.88
    });
    this.innerSphere = new THREE.Mesh(innerGeom, innerMat);
    this.coreGroup.add(this.innerSphere);
    
    // B. Escudo Exterior (Icosaedro High-Tech Wireframe)
    const outerGeom = new THREE.IcosahedronGeometry(1.25, 2);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    this.outerShell = new THREE.Mesh(outerGeom, outerMat);
    this.coreGroup.add(this.outerShell);
    
    this.coreGroup.position.set(0, 0, 0);
    this.scene.add(this.coreGroup);
  }

  // ======================================================================
  // 5. ILUMINACIÓN VOLUMÉTRICA
  // ======================================================================
  setupLights() {
    const coreLight = new THREE.PointLight(0x00f2fe, 3.8, 14);
    coreLight.position.set(0, 0, 0);
    this.coreGroup.add(coreLight);
    
    const ambientLight = new THREE.AmbientLight(0x070913, 0.45);
    this.scene.add(ambientLight);
    
    const dirLight1 = new THREE.DirectionalLight(0x7f00ff, 1.8);
    dirLight1.position.set(5, 5, 2);
    this.scene.add(dirLight1);
    
    const dirLight2 = new THREE.DirectionalLight(0x00f2fe, 1.2);
    dirLight2.position.set(-5, -5, 2);
    this.scene.add(dirLight2);
  }

  // ======================================================================
  // 6. ADAPTABILIDAD DE COLUMNAS LATERALES (VIEWPORT ADAPTIVO)
  // ======================================================================
  updateColumnCoords() {
    const visibleWidth = 2 * this.baseCameraPos.z * Math.tan((this.camera.fov * Math.PI) / 360);
    
    // Colocar las columnas en los extremos del viewport
    this.columnX = visibleWidth * 0.44;
    
    if (window.innerWidth < 768) {
      // En móviles colocamos las columnas levemente más al borde
      this.columnX = visibleWidth * 0.40;
    }
  }

  setupInteraction() {
    this.mouseWorld = new THREE.Vector3(9999, 9999, 0); // inicializar fuera de pantalla
    
    window.addEventListener('mousemove', (e) => {
      this.targetMouse.x = (e.clientX / window.innerWidth) - 0.5;
      this.targetMouse.y = (e.clientY / window.innerHeight) - 0.5;
      
      // Proyectar el mouse de 2D NDC a coordenadas 3D en el plano Z = 0
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
      
      if (this.camera) {
        const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
        vector.unproject(this.camera);
        const dir = vector.sub(this.camera.position).normalize();
        const distance = -this.camera.position.z / dir.z;
        this.mouseWorld.copy(this.camera.position).add(dir.multiplyScalar(distance));
      }
    });
    
    window.addEventListener('mouseleave', () => {
      // Mover lejos para detener el efecto magnético cuando el mouse sale
      this.mouseWorld.set(9999, 9999, 0);
    });
    
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      
      // Actualizar ancho de columnas
      this.updateColumnCoords();
      
      // Notificar a ScrollTrigger y timeline
      ScrollTrigger.refresh();
      if (this.journeyTimeline) {
        this.journeyTimeline.invalidate();
      }
    });
  }

  // ======================================================================
  // 7. TIMELINE DE PASILLO Y COLAPSO GALÁCTICO (GSAP + SCROLLTRIGGER)
  // ======================================================================
  initAnimations() {
    gsap.registerPlugin(ScrollTrigger);
    
    // A. Control de Opacidad del Canvas Principal
    // Fadecito sutil detrás de las tarjetas para legibilidad
    gsap.to(this.canvas, {
      opacity: 0.12,
      scrollTrigger: {
        trigger: ".journey-wrapper",
        start: "top 20%",
        end: "bottom 80%",
        scrub: true
      }
    });
    
    // B. TIMELINE SECUENCIAL EXCEPCIONAL PARA EL CIERRE DE CONTACTO
    // Ajusta milimétricamente el tramo final de la transición de contacto
    const contactTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: "#sec-contact",
        start: "top 95%",
        end: "top 20%",
        scrub: 1.0
      }
    });
    
    // Paso 1 (0.0 a 0.5 de la transición): colapso de partículas a la galaxia espiral y centrado de la esfera
    contactTimeline.to(this, {
      explosionProgress: 0.0,
      duration: 0.5,
      ease: "power2.inOut"
    }, 0);
    
    contactTimeline.to(this.coreGroup.position, {
      y: 0.0,
      x: 0.0,
      z: 0.0,
      duration: 0.5,
      ease: "power2.inOut"
    }, 0);
    
    contactTimeline.to(this.canvas, {
      opacity: 0.85,
      duration: 0.5,
      ease: "power2.inOut"
    }, 0);
    
    // Paso 2 (0.5 a 1.0 de la transición): emerge suavemente la tarjeta gigante con fade-in y escala
    contactTimeline.to(".sculpted-glass-heavy", {
      opacity: 1,
      scale: 1,
      duration: 0.5,
      ease: "back.out(1.5)"
    }, 0.5);
    
    // C. Selección de Slides
    const slides = [
      document.getElementById('slide-hero'),
      document.getElementById('slide-webdev'),
      document.getElementById('slide-automation'),
      document.getElementById('slide-marketing'),
      document.getElementById('slide-training'),
      document.getElementById('slide-projects'),
      document.getElementById('slide-methodology')
    ];
    
    // Configuración inicial de tarjetas frontales
    gsap.set(slides[0], { autoAlpha: 1, y: 0 });
    gsap.set(slides.slice(1), { autoAlpha: 0, y: 55 });
    
    // TIMELINE MAESTRO PINNED (Estaciones 0 a 6)
    this.journeyTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: ".journey-wrapper",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.15,
        pin: ".scroll-container",
        pinSpacing: true, // pin spacing true para separar limpio del contacto
        snap: {
          snapTo: [0, 1/6, 2/6, 3/6, 4/6, 5/6, 1.0], // 7 estaciones (0 a 6)
          duration: { min: 0.45, max: 0.85 },
          delay: 0.08,
          ease: "power2.out"
        }
      }
    });
    
    // Tramo 1: Hero (Estación 0) -> Web Dev & IA (Estación 1 - COLUMNA IZQUIERDA)
    this.journeyTimeline
      .to(slides[0], { autoAlpha: 0, y: -55, duration: 0.4 }, "t1")
      .to(this, { explosionProgress: 1.0, duration: 0.5, ease: "power2.out" }, "t1")
      .to(this.coreGroup.position, { y: -1.2, x: 0.0, z: 0.0, duration: 0.8, ease: "power2.inOut" }, "t1")
      .to(slides[1], { autoAlpha: 1, y: 0, duration: 0.4 }, "t1+=0.4")
      
      // Tramo 2: Web Dev (Estación 1 - IZQUIERDA) -> Automatización (Estación 2 - COLUMNA DERECHA)
      .to(slides[1], { autoAlpha: 0, y: -55, duration: 0.4 }, "t2")
      .to(this.coreGroup.position, { y: -2.4, x: 0.0, z: 0.0, duration: 0.8, ease: "power2.inOut" }, "t2")
      .to(slides[2], { autoAlpha: 1, y: 0, duration: 0.4 }, "t2+=0.4")
      
      // Tramo 3: Automatización (Estación 2 - DERECHA) -> Marketing (Estación 3 - COLUMNA IZQUIERDA)
      .to(slides[2], { autoAlpha: 0, y: -55, duration: 0.4 }, "t3")
      .to(this.coreGroup.position, { y: -3.6, x: 0.0, z: 0.0, duration: 0.8, ease: "power2.inOut" }, "t3")
      .to(slides[3], { autoAlpha: 1, y: 0, duration: 0.4 }, "t3+=0.4")
      
      // Tramo 4: Marketing (Estación 3 - IZQUIERDA) -> Capacitación (Estación 4 - COLUMNA DERECHA)
      .to(slides[3], { autoAlpha: 0, y: -55, duration: 0.4 }, "t4")
      .to(this.coreGroup.position, { y: -4.8, x: 0.0, z: 0.0, duration: 0.8, ease: "power2.inOut" }, "t4")
      .to(slides[4], { autoAlpha: 1, y: 0, duration: 0.4 }, "t4+=0.4")
      
      // Tramo 5: Capacitación (Estación 4 - DERECHA) -> Proyectos (Estación 5 - COLUMNA IZQUIERDA)
      .to(slides[4], { autoAlpha: 0, y: -55, duration: 0.4 }, "t5")
      .to(this.coreGroup.position, { y: -6.0, x: 0.0, z: 0.0, duration: 0.8, ease: "power2.inOut" }, "t5")
      .to(slides[5], { autoAlpha: 1, y: 0, duration: 0.4 }, "t5+=0.4")
      
      // Tramo 6: Proyectos (Estación 5 - IZQUIERDA) -> Metodología (Estación 6 - COLUMNA DERECHA)
      .to(slides[5], { autoAlpha: 0, y: -55, duration: 0.4 }, "t6")
      .to(this.coreGroup.position, { y: -7.2, x: 0.0, z: 0.0, duration: 0.8, ease: "power2.inOut" }, "t6")
      .to(slides[6], { autoAlpha: 1, y: 0, duration: 0.4 }, "t6+=0.4");
      
    this.setupNavigation();
  }

  // ======================================================================
  // 8. CONTROLADORES DE DIRECCIONAMIENTO E INTERCEPTACIÓN DE SCROLL
  // ======================================================================
  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a, .nav-logo, .btn-journey');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        const targetIndex = link.getAttribute('data-index') || link.getAttribute('data-target');
        
        if (targetIndex !== null && targetIndex !== undefined) {
          const idx = parseInt(targetIndex);
          if (idx < 7) {
            // Estaciones inmersivas (0 a 6)
            const targetY = idx * window.innerHeight;
            gsap.to(window, {
              scrollTo: targetY,
              duration: 1.2,
              ease: "power3.out"
            });
          } else {
            // Contacto (index 7)
            const targetEl = document.querySelector('#sec-contact');
            if (targetEl) {
              const rect = targetEl.getBoundingClientRect();
              const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
              const targetY = rect.top + scrollTop;
              gsap.to(window, {
                scrollTo: targetY,
                duration: 1.4,
                ease: "power3.out"
              });
            }
          }
        } else {
          // Fallback por ID si no tiene index
          const targetId = link.getAttribute('href');
          const targetEl = document.querySelector(targetId);
          if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const targetY = rect.top + scrollTop;
            
            gsap.to(window, {
              scrollTo: targetY,
              duration: 1.4,
              ease: "power3.out"
            });
          }
        }
        
        // Cerrar menú móvil
        document.getElementById('nav-links').classList.remove('open');
        document.getElementById('menu-toggle').classList.remove('open');
      });
    });
    
    // Unificar detección de navegación y scroll
    window.addEventListener('scroll', () => {
      const nav = document.getElementById('main-nav');
      if (window.scrollY > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
      
      this.detectActiveNavigationSection();
    });
    
    // Toggle Menú Móvil
    const menuToggle = document.getElementById('menu-toggle');
    const navLinksContainer = document.getElementById('nav-links');
    
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('open');
      navLinksContainer.classList.toggle('open');
    });
  }

  // Actualizar indicador activo en Navbar para las estaciones inmersivas
  updateActiveNavLink(index) {
    const links = document.querySelectorAll('.nav-links a');
    links.forEach((link) => {
      const linkIdx = parseInt(link.getAttribute('data-index'));
      if (linkIdx === index) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Resaltado dinámico milimétrico para tradicionales y sección de contacto
  detectActiveNavigationSection() {
    const scrollPos = window.scrollY;
    const windowHeight = window.innerHeight;
    
    // El wrapper inmersivo ocupa 700vh (0 a 600vh de scroll markers + 100vh de transición a contacto)
    // El límite para estar en las estaciones es 6.2 * windowHeight
    if (scrollPos < windowHeight * 6.2) {
      let activeIndex = Math.round(scrollPos / windowHeight);
      activeIndex = Math.max(0, Math.min(6, activeIndex));
      this.updateActiveNavLink(activeIndex);
    } else {
      // Estamos en la sección de contacto
      this.updateActiveNavLink(7);
    }
  }

  // ======================================================================
  // 9. DINÁMICA DE PARTÍCULAS EN TIEMPO REAL (UPDATE DE FÍSICA)
  // ======================================================================
  updateParticlesPhysics(elapsedTime) {
    if (!this.galaxy) return;
    
    const positions = this.galaxy.geometry.attributes.position.array;
    const count = this.galaxyParams.count;
    
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      
      const x = this.initialPositions[idx];
      const y = this.initialPositions[idx + 1];
      const z = this.initialPositions[idx + 2];
      
      // A. Rotación kepleriana fluida de la galaxia
      // Se ralentiza suavemente cuando explosionProgress se acerca a 1 (apertura del pasillo)
      const angle = this.galaxySpeedOffsets[i] * elapsedTime * (1.0 - this.explosionProgress);
      
      const rx = x * Math.cos(angle) - z * Math.sin(angle);
      const rz = x * Math.sin(angle) + z * Math.cos(angle);
      
      // Bamboleo vertical individual de rotación
      const ry = y + Math.sin(elapsedTime * this.galaxySpeedOffsets[i] * 2.0) * 0.05 * (1.0 - this.explosionProgress);
      
      // B. Coordenadas objetivo en las columnas laterales
      // El pasillo central (x = 0) queda vacío absoluto al forzar la separación en los extremos
      let tx = this.normalizedTargetX[i] * this.columnX;
      let ty = this.targetY[i];
      let tz = this.targetZ[i];
      
      // C. Añadir movimiento senoidal dinámico (oleaje/respiración) de las columnas
      if (this.explosionProgress > 0.01) {
        // Ondulación horizontal basada en la altura y el tiempo
        tx += Math.sin(elapsedTime * 1.2 + ty * 0.35) * 0.4 * this.explosionProgress * (Math.abs(this.normalizedTargetX[i]) * 0.4);
        // Oscilación vertical suave
        ty += Math.cos(elapsedTime * 0.8 + tx * 0.25) * 0.25 * this.explosionProgress;
      }
      
      // D. Interpolación lineal basada en explosionProgress
      let interpX = rx + (tx - rx) * this.explosionProgress;
      let interpY = ry + (ty - ry) * this.explosionProgress;
      let interpZ = rz + (tz - rz) * this.explosionProgress;
      
      // E. Interacción Magnética con el Mouse (Hover local)
      if (this.mouseWorld && this.explosionProgress > 0.05) {
        const dx = interpX - this.mouseWorld.x;
        const dy = interpY - this.mouseWorld.y;
        const distSq = dx * dx + dy * dy;
        const hoverRadius = 2.4;
        const hoverRadiusSq = hoverRadius * hoverRadius;
        
        if (distSq < hoverRadiusSq) {
          const dist = Math.sqrt(distSq);
          if (dist > 0.001) {
            // Fuerza inversamente proporcional a la distancia
            const force = (hoverRadius - dist) / hoverRadius; 
            const pushIntensity = 1.0 * force * this.explosionProgress;
            
            interpX += (dx / dist) * pushIntensity;
            interpY += (dy / dist) * pushIntensity;
            
            // Añadir una vibración magnética sutil
            const vibration = (Math.sin(elapsedTime * 28.0 + i) * 0.08) * force * this.explosionProgress;
            interpX += vibration;
            interpY += vibration;
          }
        }
      }
      
      positions[idx] = interpX;
      positions[idx + 1] = interpY;
      positions[idx + 2] = interpZ;
    }
    
    this.galaxy.geometry.attributes.position.needsUpdate = true;
  }

  // ======================================================================
  // 10. BUCLE DE FRAME PRINCIPAL (60 FPS CON INTERPOLACIONES)
  // ======================================================================
  animate() {
    requestAnimationFrame(() => this.animate());
    
    const elapsedTime = this.clock.getElapsedTime();
    
    // A. Actualizar física de las partículas de la Galaxia/Pasillo
    this.updateParticlesPhysics(elapsedTime);
    
    // B. Animaciones Rotativas de Mallas del Núcleo Central
    if (this.coreGroup) {
      if (this.explosionProgress > 0.01) {
        // En movimiento o pasillo: la esfera rota, pulsa y viaja
        this.innerSphere.rotation.y += 0.009;
        this.innerSphere.rotation.x += 0.005;
        
        this.outerShell.rotation.y -= 0.006;
        this.outerShell.rotation.z += 0.008;
        
        // Latido electromagnético en escala
        const pulseScale = 1.0 + Math.sin(elapsedTime * 3.6) * 0.055;
        this.innerSphere.scale.set(pulseScale, pulseScale, pulseScale);
      } else {
        // Hero o Colapso total: la esfera está perfectamente estática en rotación y escala
        this.innerSphere.rotation.set(0, 0, 0);
        this.outerShell.rotation.set(0, 0, 0);
        this.innerSphere.scale.set(1.0, 1.0, 1.0);
        
        // Garantizar centrado perfecto absoluto en el Hero
        if (window.scrollY === 0) {
          this.coreGroup.position.set(0, 0, 0);
        }
      }
      
      // C. Intercalado de Inercia de Ratón (Paralaje Real de Cámara)
      this.mouse.x += (this.targetMouse.x * this.parallaxIntensity - this.mouse.x) * 0.075;
      this.mouse.y += (this.targetMouse.y * this.parallaxIntensity - this.mouse.y) * 0.075;
      
      this.camera.position.x = this.baseCameraPos.x + this.mouse.x;
      this.camera.position.y = this.baseCameraPos.y - this.mouse.y;
      
      // Apuntar la cámara hacia la posición vertical actual del núcleo
      this.camera.lookAt(this.coreGroup.position);
    }
    
    // D. Renderizado del Frame
    this.renderer.render(this.scene, this.camera);
  }
}

// Inicialización del Motor una vez que el DOM esté completamente cargado
window.addEventListener('DOMContentLoaded', () => {
  // Polyfill del plugin ScrollTo si no está cargado
  if (window.gsap && !window.gsap.plugins.scrollTo) {
    gsap.registerEffect({
      name: "scrollToNative",
      effect: (targets, config) => {
        const start = window.scrollY;
        const change = config.y - start;
        const obj = { val: 0 };
        return gsap.to(obj, {
          val: 1,
          duration: config.duration || 1,
          ease: config.ease || "power3.out",
          onUpdate: () => {
            window.scrollTo(0, start + change * obj.val);
          }
        });
      }
    });
    
    gsap.install(window);
    
    const originalTo = gsap.to;
    gsap.to = function(target, vars) {
      if (target === window && vars.scrollTo !== undefined) {
        const scrollY = vars.scrollTo;
        const duration = vars.duration;
        const ease = vars.ease;
        return gsap.effects.scrollToNative(window, { y: scrollY, duration, ease });
      }
      return originalTo.apply(this, arguments);
    };
  }
  
  // Instanciar el motor
  window.solemEngine = new SolemEngine();
});
