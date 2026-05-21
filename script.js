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
      
      // B. Coordenadas de las Dos Columnas Laterales (Estado Objetivo)
      // Si la partícula está en el lado izquierdo (x < 0) va a la columna izquierda, si no, a la derecha
      if (x < 0) {
        this.normalizedTargetX[i] = -1.0 + (Math.random() - 0.5) * 0.25; // Izquierda
      } else {
        this.normalizedTargetX[i] = 1.0 + (Math.random() - 0.5) * 0.25; // Derecha
      }
      
      // Distribución vertical en la columna
      this.targetY[i] = (Math.random() - 0.5) * 14.5;
      
      // Distribución en profundidad
      this.targetZ[i] = (Math.random() - 0.5) * 3.5;
      
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
    window.addEventListener('mousemove', (e) => {
      this.targetMouse.x = (e.clientX / window.innerWidth) - 0.5;
      this.targetMouse.y = (e.clientY / window.innerHeight) - 0.5;
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
    // Fadecito sutil detrás de Proyectos y Metodología para legibilidad
    gsap.to(this.canvas, {
      opacity: 0.12,
      scrollTrigger: {
        trigger: "#sec-projects",
        start: "top 95%",
        end: "top 35%",
        scrub: true
      }
    });
    
    // ¡RESTAURAR FULGOR DE LA GALAXIA EN EL CONTACTO FINAL!
    // Al entrar al formulario de contacto, el cosmos de partículas vuelve a brillar al 85%
    gsap.to(this.canvas, {
      opacity: 0.85,
      scrollTrigger: {
        trigger: "#sec-contact",
        start: "top 90%",
        end: "top 30%",
        scrub: true
      }
    });
    
    // B. COLAPSO DE PARTÍCULAS EN EL FORMULARIO DE CONTACTO
    // Las columnas colapsan de nuevo a la galaxia espiral unificada
    gsap.to(this, {
      explosionProgress: 0.0,
      scrollTrigger: {
        trigger: "#sec-contact",
        start: "top 95%",
        end: "top 25%",
        scrub: 1.0 // Inercia fluida
      }
    });
    
    // C. ESFERA REGRESA AL CENTRO GEOGRÁFICO EN EL FORMULARIO
    // Detiene su descenso vertical y se encuadra como corazón del formulario
    gsap.to(this.coreGroup.position, {
      y: 0.0,
      scrollTrigger: {
        trigger: "#sec-contact",
        start: "top 95%",
        end: "top 25%",
        scrub: 1.0
      }
    });
    
    // Selección de Slides
    const slides = [
      document.getElementById('slide-hero'),
      document.getElementById('slide-webdev'),
      document.getElementById('slide-automation'),
      document.getElementById('slide-marketing'),
      document.getElementById('slide-training')
    ];
    
    // Configuración inicial de tarjetas frontales
    gsap.set(slides[0], { autoAlpha: 1, y: 0 });
    gsap.set(slides.slice(1), { autoAlpha: 0, y: 55 });
    
    // TIMELINE MAESTRO PINNED (Estaciones 0 a 4)
    this.journeyTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: ".journey-wrapper",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.15,
        pin: ".scroll-container",
        pinSpacing: false,
        snap: {
          snapTo: [0.0, 0.25, 0.5, 0.75, 1.0], // Magnetismo exacto a las 5 estaciones
          duration: { min: 0.45, max: 0.85 },
          delay: 0.08,
          ease: "power2.out"
        }
      }
    });
    
    // ======================================================================
    // SECUENCIA DE DESPLAZAMIENTO VERTICAL Y APERTURA DE PASILLO
    // ======================================================================
    
    // Tramo 1: Hero (Estación 0) -> Web Dev & IA (Estación 1 - COLUMNA IZQUIERDA)
    // Se dispara la explosión de la galaxia y la esfera inicia descenso estrictamente vertical
    this.journeyTimeline
      .to(slides[0], { autoAlpha: 0, y: -55, duration: 0.4 }, "t1")
      .to(this, { explosionProgress: 1.0, duration: 0.5, ease: "power2.out" }, "t1")
      .to(this.coreGroup.position, { y: -1.2, x: 0.0, z: 0.0, duration: 0.8, ease: "power2.inOut" }, "t1")
      .to(slides[1], { autoAlpha: 1, y: 0, duration: 0.4 }, "t1+=0.4")
      
      // Tramo 2: Web Dev (Estación 1 - IZQUIERDA) -> Automatización (Estación 2 - COLUMNA DERECHA)
      // Esfera desciende más por el pasillo central, explosionProgress permanece en 1.0 (pasillo vacío)
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
      .to(slides[4], { autoAlpha: 1, y: 0, duration: 0.4 }, "t4+=0.4");
      
    // Enlace de clics de navbar y scrolling
    this.setupNavigation();
  }

  // ======================================================================
  // 8. CONTROLADORES DE DIRECCIONAMIENTO E INTERCEPTACIÓN DE SCROLL
  // ======================================================================
  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link, .nav-logo, .btn-journey, .btn-scroll-down');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        const targetId = link.getAttribute('href');
        const targetIndex = link.getAttribute('data-index') || link.getAttribute('data-target');
        
        if (targetIndex !== null && targetIndex !== undefined) {
          const idx = parseInt(targetIndex);
          if (idx < 5) {
            // Si es un slide de las estaciones inmersivas (Hero=0 a Capacitación=4)
            const targetY = idx * window.innerHeight;
            gsap.to(window, {
              scrollTo: targetY,
              duration: 1.2,
              ease: "power3.out"
            });
          } else {
            // Contacto (index 5)
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
          // Secciones tradicionales inferiores (Proyectos o Metodología)
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

  // Actualizar indicador activo en Navbar para estaciones inmersivas
  updateActiveNavLink(index) {
    const links = document.querySelectorAll('.nav-link:not(.nav-link-traditional)');
    links.forEach((link, i) => {
      if (i === index) {
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
    
    if (scrollPos < windowHeight * 4.5) {
      // Estamos en la experiencia inmersiva
      let activeIndex = Math.round(scrollPos / windowHeight);
      activeIndex = Math.max(0, Math.min(4, activeIndex));
      
      this.updateActiveNavLink(activeIndex);
      
      // Remover activos de las secciones tradicionales
      document.querySelectorAll('.nav-link.nav-link-traditional').forEach(l => l.classList.remove('active'));
      document.querySelector('.nav-cta').classList.remove('active');
    } else {
      // Desactivar estaciones inmersivas
      document.querySelectorAll('.nav-link:not(.nav-link-traditional)').forEach(l => l.classList.remove('active'));
      
      const traditionalLinks = document.querySelectorAll('.nav-link.nav-link-traditional');
      const contactCta = document.querySelector('.nav-cta');
      
      const scrollPosWithOffset = scrollPos + windowHeight * 0.4;
      
      const sections = [
        { id: '#sec-projects', link: traditionalLinks[0] },
        { id: '#sec-methodology', link: traditionalLinks[1] },
        { id: '#sec-contact', link: contactCta }
      ];
      
      sections.forEach(sec => {
        const el = document.querySelector(sec.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosWithOffset >= top && scrollPosWithOffset < top + height) {
            traditionalLinks.forEach(l => l.classList.remove('active'));
            contactCta.classList.remove('active');
            sec.link.classList.add('active');
          }
        }
      });
      
      // Caso especial: al final de la página forzar resaltado de contacto
      if (scrollPos + windowHeight >= document.documentElement.scrollHeight - 50) {
        traditionalLinks.forEach(l => l.classList.remove('active'));
        contactCta.classList.add('active');
      }
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
      const targetSide = this.normalizedTargetX[i] < 0 ? -1 : 1;
      const tx = targetSide * this.columnX + (this.normalizedTargetX[i] - targetSide) * 1.5;
      const ty = this.targetY[i];
      const tz = this.targetZ[i];
      
      // C. Interpolación lineal basada en explosionProgress
      positions[idx] = rx + (tx - rx) * this.explosionProgress;
      positions[idx + 1] = ry + (ty - ry) * this.explosionProgress;
      positions[idx + 2] = rz + (tz - rz) * this.explosionProgress;
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
