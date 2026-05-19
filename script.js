import { Application } from 'https://unpkg.com/@splinetool/runtime@1.5.5/build/runtime.js';

gsap.registerPlugin(ScrollTrigger);

class SplineApp {
    constructor() {
        this.canvas = document.getElementById('webgl-canvas');
        if (!this.canvas) return;

        this.app = new Application(this.canvas);
        
        // State
        this.targetMouse = { x: 0, y: 0 };
        this.currentMouse = { x: 0, y: 0 };
        this.isMobile = window.innerWidth < 968;
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (!this.reducedMotion) {
            this.init();
        } else {
            // Remove preloader and unlock scrolling immediately if user requested reduced motion
            const preloader = document.getElementById('preloader');
            if (preloader) preloader.remove();
            document.body.classList.remove('lock-interaction');
        }
    }

    async init() {
        try {
            await this.app.load('https://prod.spline.design/6X9VKe9EiJSDIN-i/scene.splinecode');
            
            // Handle Mobile Scale
            if (this.isMobile) {
                this.app.setZoom(0.6);
            } else {
                this.app.setZoom(1.0);
            }
            
            this.addEventListeners();
            this.setupScrollTrigger();
            this.updateSplineTheme();
            
            // Animation loop for smooth tracking
            this.animate();

            // Smooth fade transitions once the scene is loaded
            const preloader = document.getElementById('preloader');
            if (preloader) {
                gsap.to(preloader, {
                    opacity: 0,
                    duration: 0.8,
                    ease: "power2.inOut",
                    onComplete: () => {
                        preloader.remove();
                        // Fade in WebGL Canvas
                        if (this.canvas) {
                            gsap.to(this.canvas, {
                                opacity: 1,
                                duration: 1.2,
                                ease: "power2.out",
                                onComplete: () => {
                                    // Smoothly unlock all scrolls and clicks
                                    document.body.classList.remove('lock-interaction');
                                }
                            });
                        }
                    }
                });
            } else {
                document.body.classList.remove('lock-interaction');
            }
        } catch (err) {
            console.error("Error loading Spline scene", err);
            // Fallback: Unlock screen if CDN fails to keep site fully functional
            const preloader = document.getElementById('preloader');
            if (preloader) preloader.remove();
            document.body.classList.remove('lock-interaction');
        }
    }

    addEventListeners() {
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth < 968;
            if (wasMobile !== this.isMobile) {
                this.app.setZoom(this.isMobile ? 0.6 : 1.0);
            }
        });
        
        // Desktop mouse tracking + manual event forwarding to bypass pointer-events: none
        window.addEventListener('mousemove', (e) => {
            if (this.isMobile) return;
            // Normalize -1 to 1
            this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            // Forward event manually so Spline tracks mouse vectors cleanly
            if (this.canvas) {
                const forwardedEvent = new MouseEvent('mousemove', {
                    clientX: e.clientX,
                    clientY: e.clientY,
                    screenX: e.screenX,
                    screenY: e.screenY,
                    bubbles: true,
                    cancelable: true
                });
                this.canvas.dispatchEvent(forwardedEvent);
            }
        });

        // Touch tracking + manual forwarding
        let isDragging = false;
        let previousTouch = null;

        window.addEventListener('touchstart', (e) => {
            isDragging = true;
            previousTouch = e.touches[0];

            if (this.canvas && e.touches.length > 0) {
                const touch = e.touches[0];
                const forwardedTouch = new Touch({
                    identifier: touch.identifier,
                    target: this.canvas,
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    screenX: touch.screenX,
                    screenY: touch.screenY,
                    pageX: touch.pageX,
                    pageY: touch.pageY
                });
                const forwardedEvent = new TouchEvent('touchstart', {
                    touches: [forwardedTouch],
                    targetTouches: [forwardedTouch],
                    changedTouches: [forwardedTouch],
                    bubbles: true,
                    cancelable: true
                });
                this.canvas.dispatchEvent(forwardedEvent);
            }
        }, {passive: true});

        window.addEventListener('touchmove', (e) => {
            if (!isDragging || !previousTouch) return;
            const touch = e.touches[0];
            const deltaX = touch.clientX - previousTouch.clientX;
            const deltaY = touch.clientY - previousTouch.clientY;
            
            // Drag interpolation with interactive friction
            this.targetMouse.x += deltaX * 0.006;
            this.targetMouse.y -= deltaY * 0.006;
            
            this.targetMouse.x = Math.max(-1, Math.min(1, this.targetMouse.x));
            this.targetMouse.y = Math.max(-1, Math.min(1, this.targetMouse.y));
            
            previousTouch = touch;

            if (this.canvas && e.touches.length > 0) {
                const forwardedTouch = new Touch({
                    identifier: touch.identifier,
                    target: this.canvas,
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    screenX: touch.screenX,
                    screenY: touch.screenY,
                    pageX: touch.pageX,
                    pageY: touch.pageY
                });
                const forwardedEvent = new TouchEvent('touchmove', {
                    touches: [forwardedTouch],
                    targetTouches: [forwardedTouch],
                    changedTouches: [forwardedTouch],
                    bubbles: true,
                    cancelable: true
                });
                this.canvas.dispatchEvent(forwardedEvent);
            }
        }, {passive: true});

        window.addEventListener('touchend', () => {
            isDragging = false;
            previousTouch = null;

            if (this.canvas) {
                const forwardedEvent = new TouchEvent('touchend', {
                    bubbles: true,
                    cancelable: true
                });
                this.canvas.dispatchEvent(forwardedEvent);
            }
        });

        // Watch for Theme changes
        const observer = new MutationObserver(() => this.updateSplineTheme());
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Smooth lerping coordinates
        this.currentMouse.x += (this.targetMouse.x - this.currentMouse.x) * 0.05;
        this.currentMouse.y += (this.targetMouse.y - this.currentMouse.y) * 0.05;

        // Try standard Spline variables
        try {
            this.app.setVariable('LookX', this.currentMouse.x * 100);
            this.app.setVariable('LookY', this.currentMouse.y * 100);
            this.app.setVariable('mouseX', this.currentMouse.x * 100);
            this.app.setVariable('mouseY', this.currentMouse.y * 100);
        } catch (e) {}

        // Fallback target targeting (LookAt constraints and direct bone rotators)
        try {
            const lookAtTarget = this.app.findObjectByName('lookAt') || 
                                 this.app.findObjectByName('LookAt') || 
                                 this.app.findObjectByName('target') || 
                                 this.app.findObjectByName('Target');
            if (lookAtTarget) {
                lookAtTarget.position.x = this.currentMouse.x * 400;
                lookAtTarget.position.y = this.currentMouse.y * 400;
            } else {
                const head = this.app.findObjectByName('Head') || this.app.findObjectByName('head');
                if (head) {
                    head.rotation.y = this.currentMouse.x * 0.4;
                    head.rotation.x = -this.currentMouse.y * 0.4;
                }
            }
        } catch (e) {}
    }

    setupScrollTrigger() {
        // Strict Mobile-First Non-Pinning Scroll Trigger
        // Stripped out all hero pinnings, heights, and scroll trap constraints.
        // Seamlessly deconstructs the robot canvas as the layout scrolls naturally.
        ScrollTrigger.create({
            trigger: "#hero",
            start: "top top",
            end: "bottom top",
            scrub: true,
            onUpdate: (self) => {
                const p = self.progress;
                
                // Vibration physics
                if (p > 0 && p < 0.2) {
                    const intensity = (p / 0.2) * 100;
                    this.app.setVariable('Vibration', intensity);
                } else if (p === 0) {
                    this.app.setVariable('Vibration', 0);
                } else {
                    this.app.setVariable('Vibration', 100);
                }

                // Explode parameter mapped to scroll
                this.app.setVariable('Explode', p * 100);
            }
        });
    }

    updateSplineTheme() {
        const theme = document.documentElement.getAttribute('data-theme') || 'plum-tech';
        
        let bodyColor, partsColor, headColor;
        let hueRotate = '0deg';
        let saturate = '1';
        let contrast = '1';
        let brightness = '1';

        switch (theme) {
            case 'plum-tech':
                bodyColor = '#000010';
                partsColor = '#0C1024';
                headColor = '#D25492'; // Neon Plum
                hueRotate = '0deg';
                saturate = '1';
                contrast = '1.1';
                brightness = '1';
                break;
            case 'cyber-mint':
                bodyColor = '#0B0B0C';
                partsColor = '#121215';
                headColor = '#00FF87'; // Electric Mint
                hueRotate = '110deg';
                saturate = '1.8';
                contrast = '1.2';
                brightness = '1';
                break;
            case 'earth-tones':
                bodyColor = '#2A1713';
                partsColor = '#5E3023';
                headColor = '#D4AF37'; // Gold Accent
                hueRotate = '30deg';
                saturate = '1.3';
                contrast = '1.1';
                brightness = '0.9';
                break;
            case 'sunset-vibes':
                bodyColor = '#320007';
                partsColor = '#4F000B';
                headColor = '#FF7F51'; // Radiant Amber
                hueRotate = '330deg';
                saturate = '1.8';
                contrast = '1.2';
                brightness = '1';
                break;
            case 'mono-red':
                bodyColor = '#0B090A';
                partsColor = '#161A1D';
                headColor = '#E5383B'; // Neon Red
                hueRotate = '345deg';
                saturate = '2.5';
                contrast = '1.4';
                brightness = '0.9';
                break;
        }

        // Try applying parameters
        try {
            this.app.setVariable('ColorBody', bodyColor);
            this.app.setVariable('ColorParts', partsColor);
            this.app.setVariable('ColorHead', headColor);
        } catch (e) {}

        // Fallback: direct material manip
        try {
            const bodyObj = this.app.findObjectByName('Body') || this.app.findObjectByName('body');
            const partsObj = this.app.findObjectByName('Parts') || this.app.findObjectByName('parts');
            const headObj = this.app.findObjectByName('Head') || this.app.findObjectByName('head');
            
            if (bodyObj && bodyObj.material) bodyObj.material.color = bodyColor;
            if (partsObj && partsObj.material) partsObj.material.color = partsColor;
            if (headObj && headObj.material) headObj.material.color = headColor;
        } catch (e) {}

        // Highly calibrated WebGL CSS color filter transform
        if (this.canvas) {
            this.canvas.style.filter = `hue-rotate(${hueRotate}) saturate(${saturate}) contrast(${contrast}) brightness(${brightness})`;
        }
    }
}

// ------------------------------------------------------------------
// UI Interactions & GSAP Setup
// ------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Spline WebGL
    new SplineApp();

    // 2. Set Year
    document.getElementById('year').textContent = new Date().getFullYear();

    // 3. Navbar Scroll
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
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

        gsap.from(".feature-list li", {
            scrollTrigger: { trigger: ".feature-list", start: "top 80%" },
            x: -30, opacity: 0, duration: 0.8, stagger: 0.2, ease: "power3.out"
        });

        gsap.from(".empowerment-visual", {
            scrollTrigger: { trigger: ".empowerment-content", start: "top 80%" },
            x: window.innerWidth >= 968 ? 50 : 0, 
            y: window.innerWidth < 968 ? 50 : 0,
            opacity: 0, duration: 1, ease: "power3.out"
        });

        gsap.utils.toArray('.bento-item').forEach(item => {
            gsap.from(item, {
                scrollTrigger: { trigger: item, start: "top 85%" },
                y: 30, opacity: 0, duration: 0.8, ease: "power3.out"
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
