/* ======================================================================
   SOLEMENGINE - MOTOR INTERACTIVO COLECTIVO DE SOLEMRJ
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
    
    // Parámetros de la Galaxia Cósmica
    this.galaxyParams = {
      count: 28000,
      radius: 12,
      arms: 3,
      spin: 1.15,
      coreColor: '#00f2fe',
      outerColor: '#7f00ff',
      outermostColor: '#ff1493'
    };
    
    // Posición base de la cámara (GSAP animará esto)
    this.baseCameraPos = { x: 0, y: 0, z: 8.5 };
    
    // Datos de interacción con el Mouse (Paralaje)
    this.mouse = { x: 0, y: 0 };
    this.targetMouse = { x: 0, y: 0 };
    this.parallaxIntensity = 1.6;
    
    // Control de tiempo para animaciones
    this.clock = new THREE.Clock();
    
    // Inicialización del Motor
    this.initThree();
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
    
    // Renderizador optimizado
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
  }

  // ======================================================================
  // 2. CREACIÓN DE LA TEXTURA DE PARTÍCULA (CANVAS DINÁMICO EN MEMORIA)
  // ======================================================================
  createCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Gradiente Radial de Alto Fulgor (Cian a Púrpura y Transparencia)
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.15, 'rgba(0, 242, 254, 0.95)');
    gradient.addColorStop(0.45, 'rgba(127, 0, 255, 0.45)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    return new THREE.CanvasTexture(canvas);
  }

  // ======================================================================
  // 3. GENERADOR MATEMÁTICO DE GALAXIA ESPIRAL
  // ======================================================================
  createGalaxy() {
    const count = this.galaxyParams.count;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const speedOffsets = new Float32Array(count);
    
    const colorCore = new THREE.Color(this.galaxyParams.coreColor);
    const colorOuter = new THREE.Color(this.galaxyParams.outerColor);
    const colorOutermost = new THREE.Color(this.galaxyParams.outermostColor);
    
    for (let i = 0; i < count; i++) {
      // Distribución Exponencial: Mucho más denso en el centro
      const r = Math.pow(Math.random(), 2.8) * this.galaxyParams.radius;
      
      // Ángulo de Brazo Espiral
      const armAngle = ((i % this.galaxyParams.arms) * Math.PI * 2) / this.galaxyParams.arms;
      const spinAngle = r * this.galaxyParams.spin;
      
      // Dispersión Caótica (Efecto de Niebla Galáctica / Nube Estelar)
      const dispersionPower = 3;
      const spreadFactor = 0.26 * (r * 0.35 + 0.1);
      
      const randomX = Math.pow(Math.random(), dispersionPower) * (Math.random() < 0.5 ? 1 : -1) * spreadFactor;
      const randomY = Math.pow(Math.random(), dispersionPower) * (Math.random() < 0.5 ? 1 : -1) * spreadFactor * 0.6;
      const randomZ = Math.pow(Math.random(), dispersionPower) * (Math.random() < 0.5 ? 1 : -1) * spreadFactor;
      
      const x = Math.cos(armAngle + spinAngle) * r + randomX;
      const y = randomY;
      const z = Math.sin(armAngle + spinAngle) * r + randomZ;
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      // Interpolación de Color Cósmico Basada en el Radio
      const mixedColor = colorCore.clone();
      const radiusRatio = r / this.galaxyParams.radius;
      
      if (radiusRatio < 0.35) {
        // Núcleo a Brazo Medio (Cian a Púrpura)
        mixedColor.lerp(colorOuter, radiusRatio * 2.85);
      } else {
        // Brazo Medio a Extremos (Púrpura a Rosa Brillante)
        mixedColor.lerp(colorOuter, 1.0);
        mixedColor.lerp(colorOutermost, (radiusRatio - 0.35) * 1.54);
      }
      
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
      
      // Velocidad individual de rotación (Kepleriana: más rápido en el núcleo)
      speedOffsets[i] = (Math.random() * 0.3 + 0.1) * (1 / (r * 0.6 + 0.5));
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Material de Partículas Luminosas Additive Blending
    const material = new THREE.PointsMaterial({
      size: 0.115,
      sizeAttenuation: true,
      depthWrite: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      map: this.createCircleTexture()
    });
    
    this.galaxy = new THREE.Points(geometry, material);
    this.scene.add(this.galaxy);
    this.galaxySpeedOffsets = speedOffsets;
  }

  // ======================================================================
  // 4. CREACIÓN DEL NÚCLEO CENTRAL DE DOBLE MALLA (PLASMA ENERGY CORE)
  // ======================================================================
  createCentralCore() {
    this.coreGroup = new THREE.Group();
    
    // A. Núcleo Interno (Esfera Translúcida Brillante)
    const innerGeom = new THREE.SphereGeometry(0.9, 64, 64);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x00f2fe,
      emissive: 0x7f00ff,
      emissiveIntensity: 0.95,
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.88,
      flatShading: false
    });
    this.innerSphere = new THREE.Mesh(innerGeom, innerMat);
    this.coreGroup.add(this.innerSphere);
    
    // B. Escudo Exterior (Icosaedro de Geometría Sagrada)
    const outerGeom = new THREE.IcosahedronGeometry(1.3, 2);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    this.outerShell = new THREE.Mesh(outerGeom, outerMat);
    this.coreGroup.add(this.outerShell);
    
    // Posición por defecto
    this.coreGroup.position.set(0, 0, 0);
    this.scene.add(this.coreGroup);
  }

  // ======================================================================
  // 5. CONFIGURACIÓN DE ILUMINACIÓN DE APOYO
  // ======================================================================
  setupLights() {
    // Luz Puntual de Alta Intensidad dentro de la esfera
    const coreLight = new THREE.PointLight(0x00f2fe, 3.5, 12);
    coreLight.position.set(0, 0, 0);
    this.coreGroup.add(coreLight);
    
    // Luz ambiental suave para matizar
    const ambientLight = new THREE.AmbientLight(0x070913, 0.5);
    this.scene.add(ambientLight);
    
    // Luces direccionales laterales para realzar la volumetría de la esfera
    const dirLight1 = new THREE.DirectionalLight(0x7f00ff, 1.8);
    dirLight1.position.set(5, 5, 2);
    this.scene.add(dirLight1);
    
    const dirLight2 = new THREE.DirectionalLight(0x00f2fe, 1.2);
    dirLight2.position.set(-5, -5, 2);
    this.scene.add(dirLight2);
  }

  // ======================================================================
  // 6. EVENTOS DE INTERACCIÓN (MOUSE Y RESIZE)
  // ======================================================================
  setupInteraction() {
    // Parámetros de seguimiento del ratón
    window.addEventListener('mousemove', (e) => {
      // Rango de -0.5 a 0.5
      this.targetMouse.x = (e.clientX / window.innerWidth) - 0.5;
      this.targetMouse.y = (e.clientY / window.innerHeight) - 0.5;
    });
    
    // Resize Dinámico con Invalidación de ScrollTrigger
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      
      // Notificar a ScrollTrigger y recrear el timeline para re-calcular offsets
      ScrollTrigger.refresh();
      if (this.journeyTimeline) {
        this.journeyTimeline.invalidate();
      }
    });
  }

  // ======================================================================
  // 7. TIMELINE MAESTRO Y ORQUESTACIÓN CINEMÁTICA (GSAP + SCROLLTRIGGER)
  // ======================================================================
  initAnimations() {
    gsap.registerPlugin(ScrollTrigger);
    
    // Desvanecer el canvas principal al entrar a la sección tradicional de Proyectos
    gsap.to(this.canvas, {
      opacity: 0.12,
      scrollTrigger: {
        trigger: "#sec-projects",
        start: "top 95%",
        end: "top 35%",
        scrub: true
      }
    });
    
    // Ocultar y contraer la esfera al ir a secciones tradicionales
    gsap.to(this.coreGroup.scale, {
      x: 0.001,
      y: 0.001,
      z: 0.001,
      scrollTrigger: {
        trigger: "#sec-projects",
        start: "top 95%",
        end: "top 45%",
        scrub: true
      }
    });
    
    // Selección de Slides de Estación
    const slides = [
      document.getElementById('slide-hero'),
      document.getElementById('slide-webdev'),
      document.getElementById('slide-automation'),
      document.getElementById('slide-marketing'),
      document.getElementById('slide-training')
    ];
    
    // Crear el Timeline Maestro Pinned de las 5 estaciones
    this.journeyTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: ".journey-wrapper",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.15, // Butter-smooth inercia
        pin: ".scroll-container",
        pinSpacing: false,
        snap: {
          snapTo: [0.0, 0.25, 0.5, 0.75, 1.0], // Imantación matemática a cada slide (5 slides = 4 tramos de 0.25)
          duration: { min: 0.45, max: 0.85 },
          delay: 0.08,
          ease: "power2.out"
        },
        onUpdate: (self) => {
          // Detectar la estación activa en base al progreso de scroll
          const progress = self.progress;
          let activeIndex = 0;
          
          if (progress < 0.125) activeIndex = 0;
          else if (progress < 0.375) activeIndex = 1;
          else if (progress < 0.625) activeIndex = 2;
          else if (progress < 0.875) activeIndex = 3;
          else activeIndex = 4;
          
          // Actualizar menú de navegación activo
          this.updateActiveNavLink(activeIndex);
        }
      }
    });
    
    // ======================================================================
    // CORE DE ANIMACIONES CRONOMETRADAS DEL TIMELINE VIAJE
    // ======================================================================
    
    // Fase inicial (Hero visible)
    gsap.set(slides[0], { autoAlpha: 1, y: 0 });
    gsap.set(slides.slice(1), { autoAlpha: 0, y: 50 });
    
    // TRAMO 1: Hero (Estación 0) -> Web Dev & IA (Estación 1)
    // Progreso: 0.0 -> 0.25
    this.journeyTimeline
      .to(slides[0], { autoAlpha: 0, y: -50, duration: 0.4 }, "t1")
      .to(this.coreGroup.position, { x: 2.3, y: 0.3, z: 0.5, duration: 0.8, ease: "power2.inOut" }, "t1")
      .to(this.coreGroup.scale, { x: 1.45, y: 1.45, z: 1.45, duration: 0.4, ease: "power1.in" }, "t1")
      .to(this.coreGroup.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.4, ease: "power1.out" }, "t1+=0.4")
      .to(this.baseCameraPos, { x: -0.3, y: 0, z: 8.0, duration: 0.8, ease: "power2.inOut" }, "t1")
      .to(this.galaxy.rotation, { y: Math.PI * 0.4, x: 0.4, z: 0.2, duration: 0.8, ease: "power2.inOut" }, "t1")
      .to(slides[1], { autoAlpha: 1, y: 0, duration: 0.4 }, "t1+=0.4")
      
      // TRAMO 2: Web Dev & IA (Estación 1) -> Automatización & Google (Estación 2)
      // Progreso: 0.25 -> 0.50
      .to(slides[1], { autoAlpha: 0, y: -50, duration: 0.4 }, "t2")
      .to(this.coreGroup.position, { x: -2.3, y: -0.2, z: 0.2, duration: 0.8, ease: "power2.inOut" }, "t2")
      .to(this.coreGroup.scale, { x: 0.75, y: 0.75, z: 0.75, duration: 0.4, ease: "power1.in" }, "t2")
      .to(this.coreGroup.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.4, ease: "power1.out" }, "t2+=0.4")
      .to(this.baseCameraPos, { x: 0.3, y: 0.1, z: 8.2, duration: 0.8, ease: "power2.inOut" }, "t2")
      .to(this.galaxy.rotation, { y: Math.PI * 0.95, x: -0.3, z: -0.3, duration: 0.8, ease: "power2.inOut" }, "t2")
      .to(slides[2], { autoAlpha: 1, y: 0, duration: 0.4 }, "t2+=0.4")
      
      // TRAMO 3: Automatización (Estación 2) -> Marketing & Tracción (Estación 3)
      // Progreso: 0.50 -> 0.75
      .to(slides[2], { autoAlpha: 0, y: -50, duration: 0.4 }, "t3")
      .to(this.coreGroup.position, { x: 2.3, y: -0.4, z: 0.6, duration: 0.8, ease: "power2.inOut" }, "t3")
      .to(this.coreGroup.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.4, ease: "power1.in" }, "t3")
      .to(this.coreGroup.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.4, ease: "power1.out" }, "t3+=0.4")
      .to(this.baseCameraPos, { x: -0.4, y: -0.1, z: 7.9, duration: 0.8, ease: "power2.inOut" }, "t3")
      .to(this.galaxy.rotation, { y: Math.PI * 1.35, x: 0.45, z: 0.15, duration: 0.8, ease: "power2.inOut" }, "t3")
      .to(slides[3], { autoAlpha: 1, y: 0, duration: 0.4 }, "t3+=0.4")
      
      // TRAMO 4: Marketing (Estación 3) -> Capacitación & Soporte (Estación 4)
      // Progreso: 0.75 -> 1.0
      .to(slides[3], { autoAlpha: 0, y: -50, duration: 0.4 }, "t4")
      .to(this.coreGroup.position, { x: -2.1, y: 0.1, z: 0.3, duration: 0.8, ease: "power2.inOut" }, "t4")
      .to(this.coreGroup.scale, { x: 0.9, y: 0.9, z: 0.9, duration: 0.4, ease: "power1.in" }, "t4")
      .to(this.coreGroup.scale, { x: 1.25, y: 1.25, z: 1.25, duration: 0.4, ease: "power1.out" }, "t4+=0.4")
      .to(this.baseCameraPos, { x: 0.2, y: 0, z: 8.3, duration: 0.8, ease: "power2.inOut" }, "t4")
      .to(this.galaxy.rotation, { y: Math.PI * 1.85, x: -0.15, z: -0.1, duration: 0.8, ease: "power2.inOut" }, "t4")
      .to(slides[4], { autoAlpha: 1, y: 0, duration: 0.4 }, "t4+=0.4");
      
    // Enlace de clics de menú y botones de viaje
    this.setupNavigation();
  }

  // ======================================================================
  // 8. CONTROLADORES DE NAVEGACIÓN Y CLICS DE ANCLAJE
  // ======================================================================
  setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link, .nav-logo, .btn-journey, .btn-scroll-down');
    
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        const targetId = link.getAttribute('href');
        const targetIndex = link.getAttribute('data-index') || link.getAttribute('data-target');
        
        if (targetIndex !== null && targetIndex !== undefined) {
          // Para las 5 estaciones del Timeline inmersivo
          // Convertimos el index de estación a coordenadas de scroll absolutas
          const targetY = parseInt(targetIndex) * window.innerHeight;
          
          gsap.to(window, {
            scrollTo: targetY,
            duration: 1.2,
            ease: "power3.out"
          });
        } else {
          // Para secciones tradicionales inferiores (Proyectos, Metodologia, Contacto)
          const targetEl = document.querySelector(targetId);
          if (targetEl) {
            // Calculamos la posición real sumando la altura del viaje (500vh)
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
        
        // Cerrar menú móvil si estuviera abierto
        document.getElementById('nav-links').classList.remove('open');
        document.getElementById('menu-toggle').classList.remove('open');
      });
    });
    
    // Resaltar navbar al scrollear
    window.addEventListener('scroll', () => {
      const nav = document.getElementById('main-nav');
      if (window.scrollY > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
      
      // Detección de secciones tradicionales
      this.detectTraditionalSectionsActive();
    });
    
    // Toggle Menú Móvil
    const menuToggle = document.getElementById('menu-toggle');
    const navLinksContainer = document.getElementById('nav-links');
    
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('open');
      navLinksContainer.classList.toggle('open');
    });
  }

  // Actualizar indicador activo en Navbar
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

  // Detectar y activar links de secciones tradicionales en navbar
  detectTraditionalSectionsActive() {
    const scrollPos = window.scrollY + 200;
    const traditionalLinks = document.querySelectorAll('.nav-link.nav-link-traditional');
    const sections = [
      { id: '#sec-projects', link: traditionalLinks[0] },
      { id: '#sec-methodology', link: traditionalLinks[1] }
    ];
    
    // Si estamos en el viaje 3D, desactivar los tradicionales
    if (window.scrollY < window.innerHeight * 4.2) {
      traditionalLinks.forEach(l => l.classList.remove('active'));
      return;
    }
    
    sections.forEach(sec => {
      const el = document.querySelector(sec.id);
      if (el) {
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          // Desactivar todos los demás
          document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
          sec.link.classList.add('active');
        }
      }
    });
  }

  // ======================================================================
  // 9. BUCLE DE FRAME (RENDER DE RENDIMIENTO A 60 FPS)
  // ======================================================================
  animate() {
    requestAnimationFrame(() => this.animate());
    
    const elapsedTime = this.clock.getElapsedTime();
    
    // A. Rotación Natural e Inercia de la Galaxia Cósmica
    // GSAP controla la rotación base del timeline, aquí sumamos rotación constante por tiempo
    if (this.galaxy) {
      this.galaxy.rotation.y += 0.0016;
      
      // Animación de dispersión o vibración sutil de las partículas
      const positions = this.galaxy.geometry.attributes.position.array;
      const count = this.galaxyParams.count;
      
      // Solo deformamos un pequeño porcentaje de partículas para mantener alto rendimiento (0 asignaciones de memoria)
      for (let i = 0; i < count; i += 8) {
        const index = i * 3;
        // Pequeño bamboleo matemático senoidal individual
        positions[index + 1] += Math.sin(elapsedTime * this.galaxySpeedOffsets[i] * 2) * 0.0006;
      }
      this.galaxy.geometry.attributes.position.needsUpdate = true;
    }
    
    // B. Animación Pulsante Orgánica del Núcleo Central
    if (this.coreGroup) {
      // Rotaciones encontradas (Look de alta tecnología sagrada)
      this.innerSphere.rotation.y += 0.008;
      this.innerSphere.rotation.x += 0.004;
      
      this.outerShell.rotation.y -= 0.005;
      this.outerShell.rotation.z += 0.007;
      
      // Efecto elástico de pulsación senoidal en escala (Simula latidos de energía pura)
      const pulseScale = 1.0 + Math.sin(elapsedTime * 3.5) * 0.052;
      this.innerSphere.scale.set(pulseScale, pulseScale, pulseScale);
      
      // C. Intercalado de Inercia de Ratón (Paralaje Real 3D)
      // Interpolación lineal (Lerp) para fluidez extrema
      this.mouse.x += (this.targetMouse.x * this.parallaxIntensity - this.mouse.x) * 0.07;
      this.mouse.y += (this.targetMouse.y * this.parallaxIntensity - this.mouse.y) * 0.07;
      
      // Sumar la inercia del mouse a la cámara de forma local
      this.camera.position.x = this.baseCameraPos.x + this.mouse.x;
      this.camera.position.y = this.baseCameraPos.y - this.mouse.y;
      
      // Enfocar siempre la cámara hacia el núcleo elástico tridimensional
      this.camera.lookAt(this.coreGroup.position);
    }
    
    // D. Renderizado del Frame
    this.renderer.render(this.scene, this.camera);
  }
}

// Inicialización del Motor una vez que el DOM esté completamente cargado
window.addEventListener('DOMContentLoaded', () => {
  // GSAP ScrollToPlugin CDN no está incluido por defecto, lo implementamos con JS nativo robusto.
  // Pero para que gsap.to(window, {scrollTo: ...}) funcione, necesitamos emular el comportamiento o inyectar el plugin.
  // Para evitar dependencias externas extras y asegurar compatibilidad total de inmediato:
  // Programamos un Polyfill rápido para que gsap reconozca scrollTo en window usando scrollTo nativo si fuera necesario,
  // o simplemente inyectamos la redirección nativa si no existe el plugin.
  if (window.gsap && !window.gsap.plugins.scrollTo) {
    // Registramos un redireccionamiento manual para animar el scroll de forma nativa e ininterrumpida
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
    
    // Sobreescribimos la llamada de scrollTo en el motor para usar el efecto nativo mapeado
    gsap.install(window);
    
    // Modificamos el método de scroll de GSAP si no está cargado
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
