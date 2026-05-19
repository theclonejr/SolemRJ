// Ensure GSAP and ScrollTrigger are loaded
gsap.registerPlugin(ScrollTrigger);

class WebGLApp {
    constructor() {
        this.canvas = document.getElementById('webgl-canvas');
        this.scene = new THREE.Scene();
        
        // Setup Camera
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 10;
        
        // Setup Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Setup Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 5, 5);
        this.scene.add(dirLight);

        // State
        this.mouse = new THREE.Vector2(0, 0);
        this.targetMouse = new THREE.Vector2(0, 0);
        this.projectPlanes = [];
        
        // Check for reduced motion
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!this.reducedMotion) {
            this.initHeroObject();
            this.addEventListeners();
            this.resize();
            this.animate();
        }
    }

    initHeroObject() {
        this.heroGroup = new THREE.Group();
        this.scene.add(this.heroGroup);
        this.heroPieces = [];

        // Create a central core made of fragmented geometric pieces
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhysicalMaterial({
            color: 0x0C1024, // Solid faces
            metalness: 0.3,
            roughness: 0.2,
            transmission: 0.0,
            thickness: 0.5,
            clearcoat: 0.1,
            clearcoatRoughness: 0.1
        });
        
        const edgesGeometry = new THREE.EdgesGeometry(geometry);
        const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xCBB8C1, linewidth: 2 });

        // Create 27 small cubes forming a larger 3x3x3 cube
        for(let x = -1; x <= 1; x++) {
            for(let y = -1; y <= 1; y++) {
                for(let z = -1; z <= 1; z++) {
                    const mesh = new THREE.Mesh(geometry, material);
                    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
                    mesh.add(edges);
                    mesh.position.set(x * 1.1, y * 1.1, z * 1.1);
                    
                    // Store original position for explosion
                    mesh.userData = {
                        origPos: mesh.position.clone(),
                        dir: mesh.position.clone().normalize()
                    };
                    
                    this.heroGroup.add(mesh);
                    this.heroPieces.push(mesh);
                }
            }
        }

        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            this.heroGroup.scale.set(0.6, 0.6, 0.6);
        }
        
        const scrollEnd = isMobile ? "+=750" : "+=1500";

        // Hero ScrollTrigger
        ScrollTrigger.create({
            trigger: "#hero",
            start: "top top",
            end: scrollEnd, // Mobile optimized
            scrub: 1,
            pin: true, // Epically spaced out transition
            onUpdate: (self) => {
                const progress = self.progress;
                
                // Pre-explosion vibration (0 to 0.1 progress)
                if (progress > 0 && progress < 0.1) {
                    const intensity = (progress / 0.1) * 0.15;
                    this.heroGroup.position.x = (Math.random() - 0.5) * intensity;
                    this.heroGroup.position.y = (Math.random() - 0.5) * intensity;
                } else if (progress === 0) {
                    this.heroGroup.position.x = 0;
                    this.heroGroup.position.y = 0;
                }

                // Explode after 0.1 progress
                const explosionProgress = Math.max(0, (progress - 0.1) / 0.9);

                this.heroPieces.forEach(piece => {
                    // Explode outward
                    const targetPos = piece.userData.origPos.clone().add(piece.userData.dir.clone().multiplyScalar(explosionProgress * 15));
                    piece.position.copy(targetPos);
                    // Rotate individually
                    piece.rotation.x = explosionProgress * Math.PI * 2 * piece.userData.dir.x;
                    piece.rotation.y = explosionProgress * Math.PI * 2 * piece.userData.dir.y;
                });
                
                // Fade out group by moving it deep
                this.heroGroup.position.z = -explosionProgress * 20;
            }
        });
    }

    addEventListeners() {
        window.addEventListener('resize', this.resize.bind(this));
        
        window.addEventListener('mousemove', (e) => {
            if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;
            // Normalize mouse from -1 to 1
            this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        // Add touch dragging
        let isDragging = false;
        let previousTouch = null;

        window.addEventListener('touchstart', (e) => {
            isDragging = true;
            previousTouch = e.touches[0];
        }, {passive: true});

        window.addEventListener('touchmove', (e) => {
            if (!isDragging || !previousTouch) return;
            const touch = e.touches[0];
            const deltaX = touch.clientX - previousTouch.clientX;
            const deltaY = touch.clientY - previousTouch.clientY;
            
            this.targetMouse.x += deltaX * 0.01;
            this.targetMouse.y -= deltaY * 0.01;
            
            // Clamp
            this.targetMouse.x = Math.max(-1, Math.min(1, this.targetMouse.x));
            this.targetMouse.y = Math.max(-1, Math.min(1, this.targetMouse.y));
            
            previousTouch = touch;
        }, {passive: true});

        window.addEventListener('touchend', () => {
            isDragging = false;
            previousTouch = null;
        });
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        // Smooth mouse follow for Hero
        this.mouse.lerp(this.targetMouse, 0.05);
        if (this.heroGroup) {
            this.heroGroup.rotation.y = this.mouse.x * 0.5;
            this.heroGroup.rotation.x = -this.mouse.y * 0.5;
            
            // Auto rotate slightly
            this.heroGroup.rotation.y += 0.002;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// ------------------------------------------------------------------
// UI Interactions & GSAP Setup
// ------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize WebGL
    new WebGLApp();

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

    // 4. Magnetic Buttons
    if (!window.matchMedia('(hover: none)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
        // Section Titles
        gsap.utils.toArray('.section-title').forEach(title => {
            gsap.from(title, {
                scrollTrigger: { trigger: title, start: "top 85%" },
                y: 40, opacity: 0, duration: 0.8, ease: "power3.out"
            });
        });

        // Feature List in Empowerment
        gsap.from(".feature-list li", {
            scrollTrigger: { trigger: ".feature-list", start: "top 80%" },
            x: -30, opacity: 0, duration: 0.8, stagger: 0.2, ease: "power3.out"
        });

        // Empowerment Card
        gsap.from(".empowerment-visual", {
            scrollTrigger: { trigger: ".empowerment-content", start: "top 80%" },
            x: 50, opacity: 0, duration: 1, ease: "power3.out"
        });

        // Bento Grids (Services)
        gsap.utils.toArray('.bento-item').forEach(item => {
            gsap.from(item, {
                scrollTrigger: { trigger: item, start: "top 85%" },
                y: 30, opacity: 0, duration: 0.8, ease: "power3.out"
            });
        });

        // Timeline Path Draw
        const pathFill = document.querySelector('.path-fill');
        if (pathFill) {
            const length = pathFill.getTotalLength();
            gsap.set(pathFill, { strokeDasharray: length, strokeDashoffset: length });
            gsap.to(pathFill, {
                strokeDashoffset: 0,
                scrollTrigger: { trigger: ".timeline", start: "top center", end: "bottom center", scrub: 1 }
            });
        }

        // Timeline Steps
        gsap.utils.toArray('.timeline-step').forEach((step) => {
            gsap.from(step.querySelector('.step-content'), {
                scrollTrigger: { trigger: step, start: "top 85%" },
                x: step.classList.contains('right') ? 50 : -50, opacity: 0, duration: 0.8, ease: "power3.out"
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
        // Clone items to create seamless loop
        const itemsHTML = track.innerHTML;
        track.innerHTML += itemsHTML; // Double items

        let totalWidth = track.scrollWidth / 2;
        
        // Recalculate on resize
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

        // Hover Effect
        const carouselItems = document.querySelectorAll('.carousel-item');
        carouselItems.forEach(item => {
            item.addEventListener('mouseenter', () => {
                gsap.to(carouselAnim, { timeScale: 0.15, duration: 0.5 });
            });
            item.addEventListener('mouseleave', () => {
                gsap.to(carouselAnim, { timeScale: 1, duration: 0.5 });
            });
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
                document.body.style.overflow = 'hidden'; // Prevent background scrolling
            });
        });

        modalClose.addEventListener('click', () => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            setTimeout(() => { modalMediaContainer.innerHTML = ''; }, 400); // Clear after exit animation
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modalClose.click();
            }
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
            if (e.target === convergenceModal) {
                convergenceClose.click();
            }
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

    // 8. Form Submission Mock
    const form = document.getElementById('discovery-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('.submit-btn');
            const text = btn.querySelector('.btn-text');
            const spinner = btn.querySelector('.spinner');
            const successMsg = form.querySelector('.form-success');

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
                        // Let CSS handle opacity transition
                        void successMsg.offsetWidth; // trigger reflow
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
    }
});
