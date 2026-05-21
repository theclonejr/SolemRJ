gsap.registerPlugin(ScrollTrigger);

class Immersive3DSceneApp {
    constructor() {
        // DOM elements
        this.building3D = document.getElementById('building-3d');
        this.office3D = document.getElementById('office-3d');
        this.cards = document.querySelectorAll('.scroll-card');

        if (!this.building3D && !this.office3D) return;

        // State
        this.targetMouse = { x: 0, y: 0 };
        this.currentMouse = { x: 0, y: 0 };
        this.isMobile = window.innerWidth < 968;
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!this.reducedMotion) {
            this.init();
        } else {
            // Remove preloader immediately if reduced motion
            const preloader = document.getElementById('preloader');
            if (preloader) preloader.remove();
            document.body.classList.remove('lock-interaction');
            
            // Set static visible states
            gsap.set(this.building3D, { opacity: 0, zIndex: 1 });
            gsap.set(this.office3D, { opacity: 1, zIndex: 2 });
            gsap.set(this.cards, { opacity: 1, y: 0, position: "relative", pointerEvents: "auto" });
            gsap.set(".immersive-content-overlay", { position: "relative", display: "flex", flexDirection: "column", padding: "2rem", height: "auto" });
            gsap.set(".scroll-container", { height: "auto" });
            gsap.set(".scene-wrapper", { position: "relative", height: "auto", overflow: "visible" });
        }
    }

    init() {
        this.resize();
        this.addEventListeners();
        this.setupScrollTrigger();

        // Force texture loading on #office-3d load
        if (this.office3D) {
            this.office3D.addEventListener('load', () => {
                const materials = this.office3D.model?.materials;
                if (materials && materials.length > 0) {
                    this.office3D.createTexture('assets/3d-models/textures/oficina-laboratorio/Texture_1024.png')
                        .then((texture) => {
                            materials.forEach(material => {
                                if (material.pbrMetallicRoughness && material.pbrMetallicRoughness.baseColorTexture) {
                                    material.pbrMetallicRoughness.baseColorTexture.setTexture(texture);
                                }
                            });
                        })
                        .catch(err => console.error("Error setting texture programmatically:", err));
                }
            });
        }

        // Start render loop for mouse tracking
        this.animate();

        // Premium Preloader sequence
        const preloader = document.getElementById('preloader');
        if (preloader) {
            gsap.to(preloader, {
                opacity: 0,
                duration: 1.0,
                delay: 1.2,
                ease: "power2.inOut",
                onComplete: () => {
                    preloader.remove();
                    document.body.classList.remove('lock-interaction');
                }
            });
        } else {
            document.body.classList.remove('lock-interaction');
        }
    }

    resize() {
        this.isMobile = window.innerWidth < 968;
    }

    setupScrollTrigger() {
        let mm = gsap.matchMedia();

        // Desktop Setup
        mm.add("(min-width: 968px)", () => {
            // Initial setup for scene elements on desktop
            gsap.set("#building-3d", { opacity: 1, zIndex: 2 });
            gsap.set("#office-3d", { opacity: 0, zIndex: 1 });
            
            // Hide all cards except Hero card initially on desktop
            gsap.set(".scroll-card", { opacity: 0, x: "-50px", position: "absolute", pointerEvents: "none" });
            gsap.set("#card-hero", { opacity: 1, x: 0, pointerEvents: "auto" });

            this.buildingProxy = { theta: 45, phi: 75, radius: 10, tx: 0, ty: 2.5, tz: 0 };
            this.officeProxy = { theta: 0, phi: 60, radius: 15, tx: 0, ty: -1.5, tz: 0 };

            // Master Timeline driven by scroll progress with single pin on .scene-wrapper
            this.timeline = gsap.timeline({
                scrollTrigger: {
                    trigger: ".scroll-container",
                    pin: ".scene-wrapper",
                    start: "top top",
                    end: "bottom bottom",
                    scrub: 1.2,
                    invalidateOnRefresh: true,
                    snap: {
                        snapTo: [0, 0.22, 0.42, 0.62, 0.82, 1.0],
                        duration: { min: 0.2, max: 0.6 },
                        ease: "power1.inOut"
                    }
                }
            });

            // Add labels at the exact timestamps
            this.timeline.addLabel("hero", 0);
            this.timeline.addLabel("webdev", 5.2);
            this.timeline.addLabel("automation", 9.9);
            this.timeline.addLabel("marketing", 14.6);
            this.timeline.addLabel("training", 19.3);

            // --- FASE 1: DESPACHO DEL HERO CARD Y ACCIÓN DEL EDIFICIO ---
            this.timeline
                .to("#card-hero", { x: "-150%", opacity: 0, pointerEvents: "none", duration: 0.8, ease: "power2.in" })
                .to(this.buildingProxy, {
                    theta: 180,
                    phi: 45,
                    radius: 4,
                    duration: 2.5,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        if (this.building3D) {
                            this.building3D.setAttribute('camera-orbit', `${this.buildingProxy.theta}deg ${this.buildingProxy.phi}deg ${this.buildingProxy.radius}m`);
                            this.building3D.setAttribute('camera-target', `${this.buildingProxy.tx}m ${this.buildingProxy.ty}m ${this.buildingProxy.tz}m`);
                        }
                    }
                }, "<")
                .to("#building-3d", { opacity: 0, duration: 1.2, ease: "power2.inOut" }, "<+1.0")
                .set("#building-3d", { zIndex: 1 })
                .set("#office-3d", { zIndex: 2 })
                .to("#office-3d", { opacity: 1, duration: 1, ease: "power2.inOut" }, "<+0.2")

            // --- FASE 2: ENTRADA AL LABORATORIO Y APARICIÓN DE ESTACIÓN 01 (Web Dev & AI) ---
            this.timeline
                .to(this.officeProxy, {
                    theta: -30,
                    phi: 65,
                    radius: 9,
                    tx: -1,
                    ty: -0.5,
                    tz: 0,
                    duration: 2,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        if (this.office3D) {
                            this.office3D.setAttribute('camera-orbit', `${this.officeProxy.theta}deg ${this.officeProxy.phi}deg ${this.officeProxy.radius}m`);
                            this.office3D.setAttribute('camera-target', `${this.officeProxy.tx}m ${this.officeProxy.ty}m ${this.officeProxy.tz}m`);
                        }
                    }
                })
                .to("#card-webdev", { opacity: 1, x: 0, pointerEvents: "auto", duration: 1.2, ease: "power2.out" }, "<+0.4")
                .to({}, { duration: 1.5 }) // delay
                .to("#card-webdev", { opacity: 0, x: "50%", pointerEvents: "none", duration: 1.2, ease: "power2.in" })

            // --- FASE 3: TRANSICIÓN A ESTACIÓN 02 (Google & Automations) ---
            this.timeline
                .to(this.officeProxy, {
                    theta: 35,
                    phi: 55,
                    radius: 8,
                    tx: 1,
                    ty: -1.0,
                    tz: 0.5,
                    duration: 2,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        if (this.office3D) {
                            this.office3D.setAttribute('camera-orbit', `${this.officeProxy.theta}deg ${this.officeProxy.phi}deg ${this.officeProxy.radius}m`);
                            this.office3D.setAttribute('camera-target', `${this.officeProxy.tx}m ${this.officeProxy.ty}m ${this.officeProxy.tz}m`);
                        }
                    }
                })
                .to("#card-automation", { opacity: 1, x: 0, pointerEvents: "auto", duration: 1.2, ease: "power2.out" }, "<+0.4")
                .to({}, { duration: 1.5 }) // delay
                .to("#card-automation", { opacity: 0, x: "50%", pointerEvents: "none", duration: 1.2, ease: "power2.in" })

            // --- FASE 4: TRANSICIÓN A ESTACIÓN 03 (Marketing & Content) ---
            this.timeline
                .to(this.officeProxy, {
                    theta: -15,
                    phi: 70,
                    radius: 6,
                    tx: 0.5,
                    ty: -0.5,
                    tz: 1,
                    duration: 2,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        if (this.office3D) {
                            this.office3D.setAttribute('camera-orbit', `${this.officeProxy.theta}deg ${this.officeProxy.phi}deg ${this.officeProxy.radius}m`);
                            this.office3D.setAttribute('camera-target', `${this.officeProxy.tx}m ${this.officeProxy.ty}m ${this.officeProxy.tz}m`);
                        }
                    }
                })
                .to("#card-marketing", { opacity: 1, x: 0, pointerEvents: "auto", duration: 1.2, ease: "power2.out" }, "<+0.4")
                .to({}, { duration: 1.5 }) // delay
                .to("#card-marketing", { opacity: 0, x: "50%", pointerEvents: "none", duration: 1.2, ease: "power2.in" })

            // --- FASE 5: ENCUADRE FINAL ESTACIÓN 04 (Capacitación & Boardroom) Y CIERRE ---
            this.timeline
                .to(this.officeProxy, {
                    theta: 45,
                    phi: 60,
                    radius: 6,
                    tx: -0.5,
                    ty: -0.8,
                    tz: -0.5,
                    duration: 2,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        if (this.office3D) {
                            this.office3D.setAttribute('camera-orbit', `${this.officeProxy.theta}deg ${this.officeProxy.phi}deg ${this.officeProxy.radius}m`);
                            this.office3D.setAttribute('camera-target', `${this.officeProxy.tx}m ${this.officeProxy.ty}m ${this.officeProxy.tz}m`);
                        }
                    }
                })
                .to("#card-training", { opacity: 1, x: 0, pointerEvents: "auto", duration: 1.2, ease: "power2.out" }, "<+0.4")
                .to({}, { duration: 1.8 }) // delay
                .to("#card-training", { opacity: 0, y: "-50px", pointerEvents: "none", duration: 0.8, ease: "power2.in" })
                .to(this.officeProxy, {
                    theta: 0,
                    phi: 80,
                    radius: 20,
                    tx: 0,
                    ty: -1.5,
                    tz: 0,
                    duration: 2.5,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        if (this.office3D) {
                            this.office3D.setAttribute('camera-orbit', `${this.officeProxy.theta}deg ${this.officeProxy.phi}deg ${this.officeProxy.radius}m`);
                            this.office3D.setAttribute('camera-target', `${this.officeProxy.tx}m ${this.officeProxy.ty}m ${this.officeProxy.tz}m`);
                        }
                    }
                }, "<")
                .to("#office-3d", { opacity: 0, duration: 1.5, ease: "power2.inOut" }, "<+0.5")
                .to(".scene-wrapper", { opacity: 0, duration: 0.8, ease: "power2.inOut" }, "<+0.5")
                .set(".scene-wrapper", { display: "none" });
        });

        // Mobile Setup
        mm.add("(max-width: 967.98px)", () => {
            // Initial setup for scene elements on mobile
            gsap.set("#building-3d", { opacity: 0.8, zIndex: 2 });
            gsap.set("#office-3d", { opacity: 0, zIndex: 1 });
            
            // Hide all cards except Hero card initially on mobile
            gsap.set(".scroll-card", { opacity: 0, pointerEvents: "none" });
            gsap.set("#card-hero", { opacity: 1, pointerEvents: "auto", left: "50%", xPercent: -50, top: "50%", yPercent: -50, x: 0, y: 0 });
            gsap.set([ "#card-webdev", "#card-automation", "#card-marketing", "#card-training" ], {
                left: "7.5vw",
                top: "50%",
                yPercent: -50,
                x: 0,
                y: 30
            });

            this.buildingProxyMobile = { theta: 45, phi: 75, radius: 14, tx: 0, ty: 2.5, tz: 0 };
            this.officeProxyMobile = { theta: 0, phi: 60, radius: 22, tx: 0, ty: -1.5, tz: 0 };

            // Master Timeline driven by scroll progress with single pin on .scene-wrapper
            this.timeline = gsap.timeline({
                scrollTrigger: {
                    trigger: ".scroll-container",
                    pin: ".scene-wrapper",
                    start: "top top",
                    end: "bottom bottom",
                    scrub: 1.2,
                    invalidateOnRefresh: true,
                    snap: {
                        snapTo: [0, 0.22, 0.42, 0.62, 0.82, 1.0],
                        duration: { min: 0.2, max: 0.6 },
                        ease: "power1.inOut"
                    }
                }
            });

            // Add labels at the exact timestamps
            this.timeline.addLabel("hero", 0);
            this.timeline.addLabel("webdev", 5.2);
            this.timeline.addLabel("automation", 9.9);
            this.timeline.addLabel("marketing", 14.6);
            this.timeline.addLabel("training", 19.3);

            // --- FASE 1: DESPACHO DEL HERO CARD Y ACCIÓN DEL EDIFICIO ---
            this.timeline
                .to("#card-hero", { y: -30, opacity: 0, pointerEvents: "none", duration: 0.8, ease: "power2.in" })
                .to(this.buildingProxyMobile, {
                    theta: 180,
                    phi: 45,
                    radius: 8,
                    duration: 2.5,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        if (this.building3D) {
                            this.building3D.setAttribute('camera-orbit', `${this.buildingProxyMobile.theta}deg ${this.buildingProxyMobile.phi}deg ${this.buildingProxyMobile.radius}m`);
                            this.building3D.setAttribute('camera-target', `${this.buildingProxyMobile.tx}m ${this.buildingProxyMobile.ty}m ${this.buildingProxyMobile.tz}m`);
                        }
                    }
                }, "<")
                .to("#building-3d", { opacity: 0, duration: 1.2, ease: "power2.inOut" }, "<+1.0")
                .set("#building-3d", { zIndex: 1 })
                .set("#office-3d", { zIndex: 2 })
                .to("#office-3d", { opacity: 0.3, duration: 1, ease: "power2.inOut" }, "<+0.2")

            // --- FASE 2: ENTRADA AL LABORATORIO Y APARICIÓN DE ESTACIÓN 01 (Web Dev & AI) ---
            this.timeline
                .to(this.officeProxyMobile, {
                    theta: -30,
                    phi: 65,
                    radius: 15,
                    tx: -1,
                    ty: -0.5,
                    tz: 0,
                    duration: 2,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        if (this.office3D) {
                            this.office3D.setAttribute('camera-orbit', `${this.officeProxyMobile.theta}deg ${this.officeProxyMobile.phi}deg ${this.officeProxyMobile.radius}m`);
                            this.office3D.setAttribute('camera-target', `${this.officeProxyMobile.tx}m ${this.officeProxyMobile.ty}m ${this.officeProxyMobile.tz}m`);
                        }
                    }
                })
                .to("#card-webdev", { opacity: 1, y: 0, pointerEvents: "auto", duration: 1.2, ease: "power2.out" }, "<+0.4")
                .to({}, { duration: 1.5 }) // delay
                .to("#card-webdev", { opacity: 0, y: -30, pointerEvents: "none", duration: 1.2, ease: "power2.in" })

            // --- FASE 3: TRANSICIÓN A ESTACIÓN 02 (Google & Automations) ---
            this.timeline
                .to(this.officeProxyMobile, {
                    theta: 35,
                    phi: 55,
                    radius: 14,
                    tx: 1,
                    ty: -1.0,
                    tz: 0.5,
                    duration: 2,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        if (this.office3D) {
                            this.office3D.setAttribute('camera-orbit', `${this.officeProxyMobile.theta}deg ${this.officeProxyMobile.phi}deg ${this.officeProxyMobile.radius}m`);
                            this.office3D.setAttribute('camera-target', `${this.officeProxyMobile.tx}m ${this.officeProxyMobile.ty}m ${this.officeProxyMobile.tz}m`);
                        }
                    }
                })
                .to("#card-automation", { opacity: 1, y: 0, pointerEvents: "auto", duration: 1.2, ease: "power2.out" }, "<+0.4")
                .to({}, { duration: 1.5 }) // delay
                .to("#card-automation", { opacity: 0, y: -30, pointerEvents: "none", duration: 1.2, ease: "power2.in" })

            // --- FASE 4: TRANSICIÓN A ESTACIÓN 03 (Marketing & Content) ---
            this.timeline
                .to(this.officeProxyMobile, {
                    theta: -15,
                    phi: 70,
                    radius: 11,
                    tx: 0.5,
                    ty: -0.5,
                    tz: 1,
                    duration: 2,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        if (this.office3D) {
                            this.office3D.setAttribute('camera-orbit', `${this.officeProxyMobile.theta}deg ${this.officeProxyMobile.phi}deg ${this.officeProxyMobile.radius}m`);
                            this.office3D.setAttribute('camera-target', `${this.officeProxyMobile.tx}m ${this.officeProxyMobile.ty}m ${this.officeProxyMobile.tz}m`);
                        }
                    }
                })
                .to("#card-marketing", { opacity: 1, y: 0, pointerEvents: "auto", duration: 1.2, ease: "power2.out" }, "<+0.4")
                .to({}, { duration: 1.5 }) // delay
                .to("#card-marketing", { opacity: 0, y: -30, pointerEvents: "none", duration: 1.2, ease: "power2.in" })

            // --- FASE 5: ENCUADRE FINAL ESTACIÓN 04 (Capacitación & Boardroom) Y CIERRE ---
            this.timeline
                .to(this.officeProxyMobile, {
                    theta: 45,
                    phi: 60,
                    radius: 11,
                    tx: -0.5,
                    ty: -0.8,
                    tz: -0.5,
                    duration: 2,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        if (this.office3D) {
                            this.office3D.setAttribute('camera-orbit', `${this.officeProxyMobile.theta}deg ${this.officeProxyMobile.phi}deg ${this.officeProxyMobile.radius}m`);
                            this.office3D.setAttribute('camera-target', `${this.officeProxyMobile.tx}m ${this.officeProxyMobile.ty}m ${this.officeProxyMobile.tz}m`);
                        }
                    }
                })
                .to("#card-training", { opacity: 1, y: 0, pointerEvents: "auto", duration: 1.2, ease: "power2.out" }, "<+0.4")
                .to({}, { duration: 1.8 }) // delay
                .to("#card-training", { opacity: 0, y: -30, pointerEvents: "none", duration: 0.8, ease: "power2.in" })
                .to(this.officeProxyMobile, {
                    theta: 0,
                    phi: 80,
                    radius: 28,
                    tx: 0,
                    ty: -1.5,
                    tz: 0,
                    duration: 2.5,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        if (this.office3D) {
                            this.office3D.setAttribute('camera-orbit', `${this.officeProxyMobile.theta}deg ${this.officeProxyMobile.phi}deg ${this.officeProxyMobile.radius}m`);
                            this.office3D.setAttribute('camera-target', `${this.officeProxyMobile.tx}m ${this.officeProxyMobile.ty}m ${this.officeProxyMobile.tz}m`);
                        }
                    }
                }, "<")
                .to("#office-3d", { opacity: 0, duration: 1.5, ease: "power2.inOut" }, "<+0.5")
                .to(".scene-wrapper", { opacity: 0, duration: 0.8, ease: "power2.inOut" }, "<+0.5")
                .set(".scene-wrapper", { display: "none" });
        });

        window.addEventListener("resize", () => {
            if (this.timeline) {
                this.timeline.invalidate();
            }
            ScrollTrigger.refresh();
        });
    }

    addEventListeners() {
        window.addEventListener('resize', this.resize.bind(this));

        // Desktop mouse tracking tilt
        this.mousemoveHandler = (e) => {
            this.targetMouse.x = (e.clientX / window.innerWidth) - 0.5;
            this.targetMouse.y = (e.clientY / window.innerHeight) - 0.5;
        };
        window.addEventListener('mousemove', this.mousemoveHandler);

        // Mobile touch swipe offset tracking
        let touchStart = { x: 0, y: 0 };
        this.touchstartHandler = (e) => {
            touchStart.x = e.touches[0].clientX;
            touchStart.y = e.touches[0].clientY;
        };
        this.touchmoveHandler = (e) => {
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            
            const dx = (touchX - touchStart.x) / window.innerWidth;
            const dy = (touchY - touchStart.y) / window.innerHeight;
            
            this.targetMouse.x = Math.max(-0.6, Math.min(0.6, this.targetMouse.x + dx * 0.15));
            this.targetMouse.y = Math.max(-0.6, Math.min(0.6, this.targetMouse.y + dy * 0.15));
            
            touchStart.x = touchX;
            touchStart.y = touchY;
        };
        window.addEventListener('touchstart', this.touchstartHandler, { passive: true });
        window.addEventListener('touchmove', this.touchmoveHandler, { passive: true });
    }

    animate() {
        // Mouse tilt interpolation for organic lag/inertia
        this.currentMouse.x += (this.targetMouse.x - this.currentMouse.x) * 0.08;
        this.currentMouse.y += (this.targetMouse.y - this.currentMouse.y) * 0.08;

        // Apply mouse tilt exclusively to #building-3d camera-orbit
        if (this.building3D) {
            const proxy = this.isMobile ? this.buildingProxyMobile : this.buildingProxy;
            if (proxy) {
                const deltaTheta = this.currentMouse.x * 10; // subtle +/- 5deg based on cursor position
                const deltaPhi = this.currentMouse.y * 10;   // subtle +/- 5deg
                const finalTheta = proxy.theta + deltaTheta;
                const finalPhi = proxy.phi + deltaPhi;
                this.building3D.setAttribute('camera-orbit', `${finalTheta}deg ${finalPhi}deg ${proxy.radius}m`);
            }
        }

        this.animationId = requestAnimationFrame(this.animate.bind(this));
    }
}

// ------------------------------------------------------------------
// UI Interactions & GSAP Setup
// ------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize High-Performance 3D Core Canvas
    new Immersive3DSceneApp();

    // 2. Set Year
    document.getElementById('year').textContent = new Date().getFullYear();

    // 3. Navbar Scroll & Custom Immersive Smooth Navigation
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    const scrollContainer = document.querySelector('.scroll-container');
    const navLinks = document.querySelectorAll('.desktop-nav a, .mobile-nav-links a, .hero-actions a, .logo, .mobile-nav-links .btn');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId && targetId.startsWith('#')) {
                e.preventDefault();
                let targetScrollY = 0;
                
                if (targetId.startsWith('#sec-')) {
                    let progress = 0;
                    if (targetId === '#sec-hero') progress = 0;
                    else if (targetId === '#sec-webdev') progress = 0.22;
                    else if (targetId === '#sec-automation') progress = 0.42;
                    else if (targetId === '#sec-marketing') progress = 0.62;
                    else if (targetId === '#sec-training') progress = 0.82;
                    
                    const startY = scrollContainer.offsetTop;
                    const scrollHeight = scrollContainer.scrollHeight - window.innerHeight;
                    targetScrollY = startY + progress * scrollHeight;
                } else {
                    const targetEl = document.querySelector(targetId);
                    if (targetEl) {
                        targetScrollY = targetEl.offsetTop;
                    } else {
                        return;
                    }
                }
                
                const obj = { y: window.scrollY };
                gsap.to(obj, {
                    y: targetScrollY,
                    duration: 1.2,
                    ease: "power2.inOut",
                    onUpdate: () => window.scrollTo(0, obj.y)
                });
            }
        });
    });

    // 4. Magnetic Buttons (Desktop Only)
    if (!window.matchMedia('(hover: none)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.innerWidth >= 968) {
        document.querySelectorAll('.btn-magnetic').forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.3, ease: "power2.out" });
                const text = btn.querySelector('.btn-text');
                if (text) gsap.to(text, { x: x * 0.1, y: y * 0.1, duration: 0.3, ease: "power2.out" });
            });

            btn.addEventListener('mouseleave', () => {
                gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
                const text = btn.querySelector('.btn-text');
                if (text) gsap.to(text, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
            });
        });
    }

    // 5. GSAP Scroll Reveals
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.utils.toArray('.section-title').forEach(title => {
            gsap.from(title, {
                scrollTrigger: { trigger: title, start: "top 85%" },
                y: 40, opacity: 0, duration: 0.8, ease: "power3.out"
            });
        });

        const pathFill = document.querySelector('.path-fill');
        if (pathFill) {
            const length = pathFill.getTotalLength();
            gsap.set(pathFill, { strokeDasharray: length, strokeDashoffset: length });
            gsap.to(pathFill, {
                strokeDashoffset: 0,
                scrollTrigger: { trigger: ".timeline", start: "top center", end: "bottom center", scrub: 1 }
            });
        }

        gsap.utils.toArray('.timeline-step').forEach((step) => {
            gsap.from(step.querySelector('.step-content'), {
                scrollTrigger: { trigger: step, start: "top 85%" },
                x: step.classList.contains('right') && window.innerWidth >= 768 ? 50 : -50, opacity: 0, duration: 0.8, ease: "power3.out"
            });
            gsap.from(step.querySelector('.step-dot'), {
                scrollTrigger: { trigger: step, start: "top 85%" },
                scale: 0, opacity: 0, duration: 0.6, ease: "back.out(1.7)"
            });
        });
    }

    // 6. Interactive Carousel Logic
    const track = document.querySelector('.carousel-track');
    if (track) {
        const itemsHTML = track.innerHTML;
        track.innerHTML += itemsHTML;

        let totalWidth = track.scrollWidth / 2;
        
        window.addEventListener('resize', () => {
            totalWidth = track.scrollWidth / 2;
            carouselAnim.vars.x = () => -totalWidth;
            carouselAnim.invalidate().restart();
        });

        const carouselAnim = gsap.to(track, {
            x: () => -totalWidth,
            ease: "none",
            duration: 25,
            repeat: -1
        });

        const carouselItems = document.querySelectorAll('.carousel-item');
        carouselItems.forEach(item => {
            item.addEventListener('mouseenter', () => gsap.to(carouselAnim, { timeScale: 0.15, duration: 0.5 }));
            item.addEventListener('mouseleave', () => gsap.to(carouselAnim, { timeScale: 1, duration: 0.5 }));
            item.addEventListener('touchstart', () => gsap.to(carouselAnim, { timeScale: 0.15, duration: 0.5 }), {passive: true});
            item.addEventListener('touchend', () => gsap.to(carouselAnim, { timeScale: 1, duration: 0.5 }));
        });

        // 7. Modal Integration
        const modal = document.getElementById('project-modal');
        const modalClose = document.getElementById('modal-close-btn');
        const modalTitle = document.getElementById('modal-title');
        const modalLink = document.getElementById('modal-link');
        const modalMediaContainer = document.getElementById('modal-media-container');

        carouselItems.forEach(item => {
            item.addEventListener('click', () => {
                const title = item.getAttribute('data-title');
                const imgSrc = item.getAttribute('data-image');
                const link = item.getAttribute('data-link');

                modalTitle.textContent = title;
                modalLink.href = link;
                modalMediaContainer.innerHTML = `<img src="${imgSrc}" alt="${title}">`;

                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        });

        modalClose.addEventListener('click', () => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            setTimeout(() => { modalMediaContainer.innerHTML = ''; }, 400);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modalClose.click();
        });
    }

    // Color Engine Modal Logic
    const convergenceBtn = document.getElementById('convergence-btn');
    const convergenceModal = document.getElementById('convergence-modal');
    const convergenceClose = document.getElementById('convergence-close-btn');
    const swatches = document.querySelectorAll('.swatch');

    if (convergenceBtn && convergenceModal) {
        convergenceBtn.addEventListener('click', (e) => {
            e.preventDefault();
            convergenceModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        convergenceClose.addEventListener('click', () => {
            convergenceModal.classList.remove('active');
            document.body.style.overflow = '';
        });

        convergenceModal.addEventListener('click', (e) => {
            if (e.target === convergenceModal) convergenceClose.click();
        });

        swatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                document.documentElement.classList.add('theme-transitioning');
                
                swatches.forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');

                const theme = swatch.getAttribute('data-theme');
                if (theme === 'plum-tech') {
                    document.documentElement.removeAttribute('data-theme');
                } else {
                    document.documentElement.setAttribute('data-theme', theme);
                }

                setTimeout(() => {
                    document.documentElement.classList.remove('theme-transitioning');
                }, 800);
            });
        });
    }

    // 8. Form Submission Logic
    const form = document.getElementById('discovery-form');
    if (form) {
        // Ensure success msg is hidden by default
        const successMsg = form.querySelector('.form-success');
        if (successMsg) {
            successMsg.style.display = 'none';
            successMsg.style.opacity = '0';
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('.submit-btn');
            const text = btn.querySelector('.btn-text');
            const spinner = btn.querySelector('.spinner');

            text.style.display = 'none';
            spinner.style.display = 'block';
            btn.style.pointerEvents = 'none';

            setTimeout(() => {
                spinner.style.display = 'none';
                text.style.display = 'block';
                
                gsap.to(form.querySelectorAll('.form-group, .submit-btn'), {
                    opacity: 0, y: -10, duration: 0.3, stagger: 0.1,
                    onComplete: () => {
                        form.querySelectorAll('.form-group, .submit-btn').forEach(el => el.style.display = 'none');
                        successMsg.style.display = 'block';
                        void successMsg.offsetWidth; 
                        successMsg.style.opacity = '1';
                        gsap.from(successMsg, { y: 20, duration: 0.5, ease: "power2.out" });
                    }
                });
            }, 1500);
        });
    }

    // 9. Mobile Nav Logic
    const hamburger = document.getElementById('hamburger-btn');
    const mobileNav = document.getElementById('mobile-nav');
    const mobileLinks = document.querySelectorAll('.mobile-nav-links a');

    if (hamburger && mobileNav) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            mobileNav.classList.toggle('active');
            document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
        });

        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                mobileNav.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
        
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 968 && mobileNav.classList.contains('active')) {
                hamburger.classList.remove('active');
                mobileNav.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
});
