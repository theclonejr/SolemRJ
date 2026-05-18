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
            this.initProjectPlanes();
            this.addEventListeners();
            this.resize();
            this.animate();
        } else {
            // Fallback for reduced motion
            document.querySelectorAll('.project-item').forEach(el => {
                el.style.backgroundImage = `url(${el.dataset.image})`;
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
            });
        }
    }

    initHeroObject() {
        this.heroGroup = new THREE.Group();
        this.scene.add(this.heroGroup);
        this.heroPieces = [];

        // Create a central core made of fragmented geometric pieces
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xFF6F61, // Coral
            metalness: 0.2,
            roughness: 0.1,
            transmission: 0.9,
            thickness: 0.5,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });

        // Create 27 small cubes forming a larger 3x3x3 cube
        for(let x = -1; x <= 1; x++) {
            for(let y = -1; y <= 1; y++) {
                for(let z = -1; z <= 1; z++) {
                    const mesh = new THREE.Mesh(geometry, material);
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

        // Hero ScrollTrigger
        ScrollTrigger.create({
            trigger: "#hero",
            start: "top top",
            end: "bottom top",
            scrub: 1,
            onUpdate: (self) => {
                const progress = self.progress;
                this.heroPieces.forEach(piece => {
                    // Explode outward
                    const targetPos = piece.userData.origPos.clone().add(piece.userData.dir.clone().multiplyScalar(progress * 15));
                    piece.position.copy(targetPos);
                    // Rotate individually
                    piece.rotation.x = progress * Math.PI * 2 * piece.userData.dir.x;
                    piece.rotation.y = progress * Math.PI * 2 * piece.userData.dir.y;
                });
                
                // Fade out group by moving it deep
                this.heroGroup.position.z = -progress * 20;
            }
        });
    }

    initProjectPlanes() {
        const domElements = document.querySelectorAll('.project-item');
        const loader = new THREE.TextureLoader();
        loader.crossOrigin = "anonymous";

        // Simple Warp Shader
        const vertexShader = `
            varying vec2 vUv;
            uniform float uHover;
            void main() {
                vUv = uv;
                vec3 pos = position;
                // Add a wave effect based on hover
                pos.z += sin(pos.x * 5.0 + uHover * 3.14) * 0.1 * uHover;
                pos.z += sin(pos.y * 5.0 + uHover * 3.14) * 0.1 * uHover;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;

        const fragmentShader = `
            varying vec2 vUv;
            uniform sampler2D tDiffuse;
            uniform float uHover;
            void main() {
                vec2 uv = vUv;
                // Slight RGB split on hover
                float r = texture2D(tDiffuse, uv + vec2(0.01 * uHover, 0.0)).r;
                float g = texture2D(tDiffuse, uv).g;
                float b = texture2D(tDiffuse, uv - vec2(0.01 * uHover, 0.0)).b;
                
                // Desaturate slightly when not hovered
                vec3 color = vec3(r,g,b);
                float gray = dot(color, vec3(0.299, 0.587, 0.114));
                vec3 finalColor = mix(vec3(gray) * 0.8, color, uHover + 0.2);
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

        domElements.forEach(el => {
            const imgUrl = el.dataset.image;
            const texture = loader.load(imgUrl);
            
            const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);
            const material = new THREE.ShaderMaterial({
                vertexShader,
                fragmentShader,
                uniforms: {
                    tDiffuse: { value: texture },
                    uHover: { value: 0.0 }
                },
                transparent: true
            });

            const mesh = new THREE.Mesh(geometry, material);
            this.scene.add(mesh);

            const planeObj = {
                mesh,
                el,
                hover: 0
            };

            this.projectPlanes.push(planeObj);

            // Hover events
            el.addEventListener('mouseenter', () => {
                gsap.to(planeObj, { hover: 1, duration: 0.6, ease: "power2.out" });
            });
            el.addEventListener('mouseleave', () => {
                gsap.to(planeObj, { hover: 0, duration: 0.6, ease: "power2.out" });
            });
        });
    }

    syncPlanes() {
        // We need to map DOM coordinates to WebGL coordinates
        // Assuming camera is looking at origin, z=10, fov=45
        const vFov = (this.camera.fov * Math.PI) / 180;
        const height = 2 * Math.tan(vFov / 2) * this.camera.position.z;
        const width = height * this.camera.aspect;

        const wWidth = window.innerWidth;
        const wHeight = window.innerHeight;

        this.projectPlanes.forEach(plane => {
            const rect = plane.el.getBoundingClientRect();
            
            // Check if in viewport
            if (rect.bottom < 0 || rect.top > wHeight) {
                plane.mesh.visible = false;
                return;
            }
            plane.mesh.visible = true;

            // Map width/height
            const meshWidth = (rect.width / wWidth) * width;
            const meshHeight = (rect.height / wHeight) * height;
            plane.mesh.scale.set(meshWidth, meshHeight, 1);

            // Map position
            const x = (rect.left / wWidth) * width - width / 2 + meshWidth / 2;
            const y = -(rect.top / wHeight) * height + height / 2 - meshHeight / 2;
            plane.mesh.position.set(x, y, 0);

            // Update uniform
            plane.mesh.material.uniforms.uHover.value = plane.hover;
        });
    }

    addEventListeners() {
        window.addEventListener('resize', this.resize.bind(this));
        
        window.addEventListener('mousemove', (e) => {
            // Normalize mouse from -1 to 1
            this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.syncPlanes(); // Sync immediately on resize
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

        // Sync planes every frame (since scroll happens)
        this.syncPlanes();

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

        // Bento Grids (Services and Projects)
        gsap.utils.toArray('.bento-item, .project-info').forEach(item => {
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

    // 6. Form Submission Mock
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
                        gsap.from(successMsg, { opacity: 0, y: 20, duration: 0.5, ease: "power2.out" });
                    }
                });
            }, 1500);
        });
    }
});
