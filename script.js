gsap.registerPlugin(ScrollTrigger);

class CanvasCoreApp {
    constructor() {
        this.canvas = document.getElementById('webgl-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        
        // State
        this.targetMouse = { x: 0, y: 0 };
        this.currentMouse = { x: 0, y: 0 };
        this.isMobile = window.innerWidth < 968;
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.scrollProgress = 0;
        
        // 3D rotation angles
        this.rot = { x: 0, y: 0, z: 0 };
        this.autoRotSpeed = { x: 0.003, y: 0.004 };
        this.autoRot = { x: 0, y: 0 };
        
        // Nodes, connections, packets
        this.nodes = [];
        this.connections = [];
        this.packets = [];
        this.ambientParticles = [];
        
        // Render loop handle
        this.animationId = null;
        
        if (!this.reducedMotion) {
            this.init();
        } else {
            // Remove preloader and unlock scrolling immediately if user requested reduced motion
            const preloader = document.getElementById('preloader');
            if (preloader) preloader.remove();
            document.body.classList.remove('lock-interaction');
        }
    }
    
    init() {
        this.resizeCanvas();
        this.generateGeometry();
        this.addEventListeners();
        this.setupScrollTrigger();
        
        // Start render loop
        this.animate();
        
        // Premium Simulated Preloader Sequence
        // Since there are no heavy external assets to download now, we simulate a loading sequence to
        // build anticipation and reveal the core with an ultra-smooth premium fade-in
        const preloader = document.getElementById('preloader');
        if (preloader) {
            gsap.to(preloader, {
                opacity: 0,
                duration: 1.0,
                delay: 1.2, // Simulated loading delay
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
            if (this.canvas) this.canvas.style.opacity = 1;
        }
    }
    
    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        
        // Scale core dimensions based on mobile vs desktop
        this.isMobile = window.innerWidth < 968;
        this.baseScale = this.isMobile ? 0.6 : 1.0;
    }
    
    generateGeometry() {
        this.nodes = [];
        this.connections = [];
        this.packets = [];
        this.ambientParticles = [];
        
        // 1. Central Processor Node (Energy Core at 0,0,0)
        // 2. Microprocessor Node Grid / Inner Sphere
        // Let's create an inner cluster (Hyper-cube or Concentric Rings)
        const nodeCountInner = 14;
        const radiusInner = 80;
        for (let i = 0; i < nodeCountInner; i++) {
            // Fibonacci sphere distribution for perfect node spacing
            const phi = Math.acos(-1 + (2 * i) / nodeCountInner);
            const theta = Math.sqrt(nodeCountInner * Math.PI) * phi;
            
            const x = radiusInner * Math.sin(phi) * Math.cos(theta);
            const y = radiusInner * Math.sin(phi) * Math.sin(theta);
            const z = radiusInner * Math.cos(phi);
            
            this.nodes.push(this.createNode(x, y, z, 'inner'));
        }
        
        // 3. Outer Automation Core Ring / Cluster
        const nodeCountOuter = 22;
        const radiusOuter = 160;
        for (let i = 0; i < nodeCountOuter; i++) {
            const phi = Math.acos(-1 + (2 * i) / nodeCountOuter);
            const theta = Math.sqrt(nodeCountOuter * Math.PI) * phi;
            
            const x = radiusOuter * Math.sin(phi) * Math.cos(theta);
            const y = radiusOuter * Math.sin(phi) * Math.sin(theta);
            const z = radiusOuter * Math.cos(phi);
            
            this.nodes.push(this.createNode(x, y, z, 'outer'));
        }
        
        // 4. Connect adjacent nodes in 3D space
        const maxDist = 125;
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const dx = this.nodes[i].x - this.nodes[j].x;
                const dy = this.nodes[i].y - this.nodes[j].y;
                const dz = this.nodes[i].z - this.nodes[j].z;
                const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                
                if (dist < maxDist) {
                    this.connections.push({
                        a: i,
                        b: j,
                        length: dist,
                        maxDist: maxDist
                    });
                }
            }
        }
        
        // 5. Generate Traveling Data Packets along connections
        const packetCount = this.isMobile ? 12 : 24;
        for (let i = 0; i < packetCount; i++) {
            if (this.connections.length === 0) break;
            const connIndex = Math.floor(Math.random() * this.connections.length);
            this.packets.push({
                connIndex: connIndex,
                progress: Math.random(),
                speed: 0.008 + Math.random() * 0.012,
                size: 2 + Math.random() * 3,
                direction: Math.random() > 0.5 ? 1 : -1
            });
        }
        
        // 6. Generate Ambient Floating Data Particles (Deep-space matrix background)
        const particleCount = this.isMobile ? 40 : 100;
        for (let i = 0; i < particleCount; i++) {
            const range = 400;
            this.ambientParticles.push({
                x: (Math.random() - 0.5) * range * 2,
                y: (Math.random() - 0.5) * range * 2,
                z: (Math.random() - 0.5) * range * 2,
                size: 0.5 + Math.random() * 1.5,
                speedX: (Math.random() - 0.5) * 0.2,
                speedY: (Math.random() - 0.5) * 0.2,
                speedZ: (Math.random() - 0.5) * 0.2
            });
        }
    }
    
    createNode(x, y, z, type) {
        // Calculate explosion dispersion vectors
        const len = Math.sqrt(x*x + y*y + z*z);
        const dirX = x / (len || 1) + (Math.random() - 0.5) * 0.2;
        const dirY = y / (len || 1) + (Math.random() - 0.5) * 0.2;
        const dirZ = z / (len || 1) + (Math.random() - 0.5) * 0.2;
        
        return {
            x: x,
            y: y,
            z: z,
            baseX: x,
            baseY: y,
            baseZ: z,
            dirX: dirX,
            dirY: dirY,
            dirZ: dirZ,
            type: type,
            size: type === 'inner' ? 4 : 5,
            pulseOffset: Math.random() * Math.PI * 2
        };
    }
    
    addEventListeners() {
        this.resizeHandler = () => this.resizeCanvas();
        window.addEventListener('resize', this.resizeHandler);
        
        // Mouse tracking for Desktop
        this.mousemoveHandler = (e) => {
            if (this.isMobile) return;
            // Normalize -1 to 1
            this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        };
        window.addEventListener('mousemove', this.mousemoveHandler);
        
        // Touch swipe tracking for Mobile
        let touchStart = { x: 0, y: 0 };
        this.touchstartHandler = (e) => {
            if (!this.isMobile || e.touches.length === 0) return;
            touchStart.x = e.touches[0].clientX;
            touchStart.y = e.touches[0].clientY;
        };
        this.touchmoveHandler = (e) => {
            if (!this.isMobile || e.touches.length === 0) return;
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            
            const dx = touchX - touchStart.x;
            const dy = touchY - touchStart.y;
            
            // Adjust camera rotation targets directly on touch swipe
            this.targetMouse.x += dx * 0.005;
            this.targetMouse.y -= dy * 0.005;
            
            this.targetMouse.x = Math.max(-1.5, Math.min(1.5, this.targetMouse.x));
            this.targetMouse.y = Math.max(-1.5, Math.min(1.5, this.targetMouse.y));
            
            touchStart.x = touchX;
            touchStart.y = touchY;
        };
        window.addEventListener('touchstart', this.touchstartHandler, { passive: true });
        window.addEventListener('touchmove', this.touchmoveHandler, { passive: true });
    }
    
    setupScrollTrigger() {
        ScrollTrigger.create({
            trigger: "#hero",
            start: "top top",
            end: "bottom top",
            scrub: true,
            onUpdate: (self) => {
                this.scrollProgress = self.progress;
            }
        });
    }
    
    // 3D rotation math projected onto 2D viewport
    project(x, y, z, rotX, rotY) {
        // Rotate Y
        let cosY = Math.cos(rotY);
        let sinY = Math.sin(rotY);
        let x1 = x * cosY + z * sinY;
        let z1 = -x * sinY + z * cosY;
        
        // Rotate X
        let cosX = Math.cos(rotX);
        let sinX = Math.sin(rotX);
        let y2 = y * cosX - z1 * sinX;
        let z2 = y * sinX + z1 * cosX;
        
        // Scale down mobile core by 40% (baseScale = 0.6)
        const finalScale = this.baseScale;
        x1 *= finalScale;
        y2 *= finalScale;
        z2 *= finalScale;
        
        // Perspective Math
        const fov = 350;
        const cameraDist = 280;
        const scale = fov / (fov + z2 + cameraDist);
        
        return {
            x: this.centerX + x1 * scale,
            y: this.centerY + y2 * scale,
            depth: z2,
            scale: scale
        };
    }
    
    animate() {
        // CPU Optimization: Stop render operations completely if canvas is scrolled out of viewport
        if (this.scrollProgress >= 1.0) {
            this.animationId = requestAnimationFrame(this.animate.bind(this));
            return;
        }
        
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Update automatic floating rotations
        this.autoRot.x += this.autoRotSpeed.x;
        this.autoRot.y += this.autoRotSpeed.y;
        
        // Smoothly interpolate (lerp) cursor tracking vectors
        this.currentMouse.x += (this.targetMouse.x - this.currentMouse.x) * 0.06;
        this.currentMouse.y += (this.targetMouse.y - this.currentMouse.y) * 0.06;
        
        // Define actual rotation angles
        const rx = this.currentMouse.y * 0.6 + this.autoRot.x;
        const ry = this.currentMouse.x * 0.6 + this.autoRot.y;
        
        // Fetch current CSS theme color custom properties dynamically from layout root
        const styles = getComputedStyle(document.documentElement);
        const silkGlow = styles.getPropertyValue('--silk-glow').trim() || '#D25492';
        const plumLight = styles.getPropertyValue('--plum-light').trim() || '#A3B19B';
        const textPrimary = styles.getPropertyValue('--text-primary').trim() || '#CBB8C1';
        
        // Scroll physics mapping: vibration state and explosive dispersion
        let vibration = 0;
        let dispersion = 0;
        
        if (this.scrollProgress > 0 && this.scrollProgress < 0.2) {
            // Vibration Phase (0.0 to 0.2)
            vibration = (this.scrollProgress / 0.2) * 8.0; // max vibration intensity
        } else if (this.scrollProgress >= 0.2) {
            // Explosive Dispersion Phase (0.2 to 1.0)
            const dispProg = (this.scrollProgress - 0.2) / 0.8;
            dispersion = dispProg * 900.0; // explosive dispersion speed/distance
            
            // Seamlessly fade out the canvas as dispersion completes
            if (this.canvas) {
                this.canvas.style.opacity = Math.max(0, 1 - dispProg * 1.5);
            }
        } else {
            if (this.canvas && this.canvas.style.opacity !== '1') {
                this.canvas.style.opacity = '1';
            }
        }
        
        // Draw Ambient Floating Data Particles
        this.ctx.fillStyle = this.hexToRGBA(textPrimary, 0.2);
        this.ambientParticles.forEach(p => {
            // Update positions
            p.x += p.speedX;
            p.y += p.speedY;
            p.z += p.speedZ;
            
            // Loop particles inside boundary box
            const boundary = 400;
            if (Math.abs(p.x) > boundary) p.speedX *= -1;
            if (Math.abs(p.y) > boundary) p.speedY *= -1;
            if (Math.abs(p.z) > boundary) p.speedZ *= -1;
            
            // Apply dispersion
            let px = p.x;
            let py = p.y;
            let pz = p.z;
            
            if (dispersion > 0) {
                const len = Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z) || 1;
                px += (p.x / len) * dispersion * 1.2;
                py += (p.y / len) * dispersion * 1.2;
                pz += (p.z / len) * dispersion * 1.2;
            }
            
            const proj = this.project(px, py, pz, rx, ry);
            
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, p.size * proj.scale, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Calculate current projected 3D nodes
        const projectedNodes = this.nodes.map((node, index) => {
            // Base coordinate + dispersion vector
            let nx = node.baseX;
            let ny = node.baseY;
            let nz = node.baseZ;
            
            if (dispersion > 0) {
                nx += node.dirX * dispersion;
                ny += node.dirY * dispersion;
                nz += node.dirZ * dispersion;
            }
            
            // Add scroll-driven high-frequency vibration
            if (vibration > 0) {
                nx += (Math.random() - 0.5) * vibration;
                ny += (Math.random() - 0.5) * vibration;
                nz += (Math.random() - 0.5) * vibration;
            }
            
            // Project
            const proj = this.project(nx, ny, nz, rx, ry);
            
            // Magnetic cursor warping (desktop only, warping nodes near the cursor)
            if (!this.isMobile) {
                const mouseWorldX = this.centerX + this.currentMouse.x * 250;
                const mouseWorldY = this.centerY - this.currentMouse.y * 250;
                const dx = proj.x - mouseWorldX;
                const dy = proj.y - mouseWorldY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < 180) {
                    const warpIntensity = (1 - dist / 180) * 22;
                    proj.x += (dx / (dist || 1)) * warpIntensity;
                    proj.y += (dy / (dist || 1)) * warpIntensity;
                }
            }
            
            return proj;
        });
        
        // Draw Connections / Network Lines
        this.ctx.lineWidth = 1.0;
        this.connections.forEach(conn => {
            const nodeA = projectedNodes[conn.a];
            const nodeB = projectedNodes[conn.b];
            
            // Node depth testing to dynamically fade background lines
            const averageDepth = (nodeA.depth + nodeB.depth) / 2;
            const depthFade = Math.max(0.05, 1 - (averageDepth + 150) / 300);
            
            // Line opacity drops as nodes move further apart during deconstruction
            let dispersionFade = 1.0;
            if (dispersion > 0) {
                dispersionFade = Math.max(0, 1 - dispersion / 450);
            }
            
            if (dispersionFade <= 0) return;
            
            const alpha = 0.22 * depthFade * dispersionFade;
            this.ctx.strokeStyle = this.hexToRGBA(silkGlow, alpha);
            this.ctx.beginPath();
            this.ctx.moveTo(nodeA.x, nodeA.y);
            this.ctx.lineTo(nodeB.x, nodeB.y);
            this.ctx.stroke();
        });
        
        // Draw Nodes
        projectedNodes.forEach((node, idx) => {
            const depthFade = Math.max(0.1, 1 - (node.depth + 150) / 300);
            
            let dispersionFade = 1.0;
            if (dispersion > 0) {
                dispersionFade = Math.max(0, 1 - dispersion / 600);
            }
            
            if (dispersionFade <= 0) return;
            
            const originalNode = this.nodes[idx];
            // Slow organic throb animation
            const throb = 1 + Math.sin(Date.now() * 0.003 + originalNode.pulseOffset) * 0.15;
            const size = originalNode.size * node.scale * throb;
            
            this.ctx.save();
            
            // Radiant neon glow effect
            this.ctx.shadowColor = silkGlow;
            this.ctx.shadowBlur = 12 * depthFade * dispersionFade;
            this.ctx.fillStyle = this.hexToRGBA(textPrimary, 0.9 * depthFade * dispersionFade);
            
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Central microprocessor node core highlights
            if (originalNode.type === 'inner') {
                this.ctx.fillStyle = this.hexToRGBA(silkGlow, 1.0 * depthFade * dispersionFade);
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, size * 0.45, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        });
        
        // Draw Traveling Data Packets
        this.packets.forEach(packet => {
            const conn = this.connections[packet.connIndex];
            if (!conn) return;
            
            const nodeA = projectedNodes[conn.a];
            const nodeB = projectedNodes[conn.b];
            
            // Calculate current packet position along line vector
            const t = packet.progress;
            const x = nodeA.x + (nodeB.x - nodeA.x) * t;
            const y = nodeA.y + (nodeB.y - nodeA.y) * t;
            
            // Fading rules for packets
            const depth = nodeA.depth + (nodeB.depth - nodeA.depth) * t;
            const depthFade = Math.max(0.1, 1 - (depth + 150) / 300);
            
            let dispersionFade = 1.0;
            if (dispersion > 0) {
                dispersionFade = Math.max(0, 1 - dispersion / 450);
            }
            
            if (dispersionFade <= 0) return;
            
            // Render packet
            this.ctx.save();
            this.ctx.shadowColor = plumLight;
            this.ctx.shadowBlur = 15 * depthFade * dispersionFade;
            this.ctx.fillStyle = this.hexToRGBA(plumLight, 0.95 * depthFade * dispersionFade);
            
            const size = packet.size * ((nodeA.scale + nodeB.scale) / 2) * depthFade;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
            
            // Update progress
            packet.progress += packet.speed * packet.direction;
            
            // Loop data packets along network paths
            if (packet.progress > 1.0 || packet.progress < 0.0) {
                packet.direction *= -1;
                packet.progress = Math.max(0, Math.min(1, packet.progress));
                
                // Keep the packets fresh by jumping to a random connected branch occasionally
                if (Math.random() > 0.4) {
                    const currentNodeIndex = packet.direction === 1 ? conn.a : conn.b;
                    const branches = this.connections
                        .map((c, i) => ({ c, i }))
                        .filter(item => item.c.a === currentNodeIndex || item.c.b === currentNodeIndex);
                        
                    if (branches.length > 0) {
                        const nextBranch = branches[Math.floor(Math.random() * branches.length)];
                        packet.connIndex = nextBranch.i;
                        packet.progress = nextBranch.c.a === currentNodeIndex ? 0.0 : 1.0;
                        packet.direction = nextBranch.c.a === currentNodeIndex ? 1 : -1;
                    }
                }
            }
        });
        
        this.animationId = requestAnimationFrame(this.animate.bind(this));
    }
    
    // Clean up all events and animation frames on screen tear-down
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.resizeHandler);
        window.removeEventListener('mousemove', this.mousemoveHandler);
        window.removeEventListener('touchstart', this.touchstartHandler);
        window.removeEventListener('touchmove', this.touchmoveHandler);
    }
    
    // Helper to translate Hex theme parameters to rgba canvas styles cleanly
    hexToRGBA(hex, alpha) {
        hex = hex.replace('#', '').trim();
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        const r = parseInt(hex.substring(0, 2), 16) || 0;
        const g = parseInt(hex.substring(2, 4), 16) || 0;
        const b = parseInt(hex.substring(4, 6), 16) || 0;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}

// ------------------------------------------------------------------
// UI Interactions & GSAP Setup
// ------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize High-Performance 3D Core Canvas
    new CanvasCoreApp();

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
