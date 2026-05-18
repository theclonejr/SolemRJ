// Ensure GSAP and ScrollTrigger are loaded
gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {
    // 1. Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Set copyright year
    document.getElementById('year').textContent = new Date().getFullYear();

    // 2. Hero Canvas Animation (Network/Nodes)
    initHeroCanvas();

    // 3. Magnetic Button Logic
    initMagneticButtons();

    // 4. GSAP Scroll Animations
    initScrollAnimations();

    // 5. Form Handling with mock loading state
    initForm();
});

function initHeroCanvas() {
    const canvas = document.getElementById('hero-canvas');
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.radius = Math.random() * 2 + 1;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > width) this.vx = -this.vx;
            if (this.y < 0 || this.y > height) this.vy = -this.vy;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 242, 254, 0.5)';
            ctx.fill();
        }
    }

    // Create particles based on screen width (less on mobile)
    const particleCount = window.innerWidth < 768 ? 40 : 80;
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    function animate() {
        // Respect prefers-reduced-motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            ctx.clearRect(0, 0, width, height);
            particles.forEach(p => p.draw());
            return;
        }

        ctx.clearRect(0, 0, width, height);
        
        particles.forEach((p, index) => {
            p.update();
            p.draw();
            
            // Draw connections
            for (let j = index + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(127, 0, 255, ${0.2 * (1 - dist / 150)})`;
                    ctx.stroke();
                }
            }
        });
        
        requestAnimationFrame(animate);
    }
    animate();
}

function initMagneticButtons() {
    const magneticButtons = document.querySelectorAll('.btn-magnetic');
    
    // Disable on mobile/touch devices
    if (window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    magneticButtons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            gsap.to(btn, {
                x: x * 0.3,
                y: y * 0.3,
                duration: 0.3,
                ease: "power2.out"
            });

            // Optional: slight move for inner text
            const text = btn.querySelector('.btn-text');
            if (text) {
                gsap.to(text, {
                    x: x * 0.1,
                    y: y * 0.1,
                    duration: 0.3,
                    ease: "power2.out"
                });
            }
        });

        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, {
                x: 0,
                y: 0,
                duration: 0.5,
                ease: "elastic.out(1, 0.3)"
            });
            const text = btn.querySelector('.btn-text');
            if (text) {
                gsap.to(text, {
                    x: 0,
                    y: 0,
                    duration: 0.5,
                    ease: "elastic.out(1, 0.3)"
                });
            }
        });
    });
}

function initScrollAnimations() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Hero Text Stagger Reveal
    gsap.from(".badge", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out", delay: 0.2 });
    gsap.from(".hero-title", { y: 30, opacity: 0, duration: 0.8, ease: "power3.out", delay: 0.4 });
    gsap.from(".hero-subtitle", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out", delay: 0.6 });
    gsap.from(".hero-actions", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out", delay: 0.8 });

    // Section Titles
    gsap.utils.toArray('.section-title').forEach(title => {
        gsap.from(title, {
            scrollTrigger: {
                trigger: title,
                start: "top 80%",
            },
            y: 30,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out"
        });
    });

    // Bento Grid Reveal
    gsap.from(".bento-item", {
        scrollTrigger: {
            trigger: ".bento-grid",
            start: "top 75%",
        },
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out"
    });

    // Partnership Card Reveal
    gsap.from(".partnership-visual", {
        scrollTrigger: {
            trigger: ".partnership-content",
            start: "top 75%",
        },
        x: 50,
        opacity: 0,
        duration: 1,
        ease: "power3.out"
    });

    // Timeline Path Draw and Steps Reveal
    const pathFill = document.querySelector('.path-fill');
    if (pathFill) {
        const length = pathFill.getTotalLength();
        gsap.set(pathFill, { strokeDasharray: length, strokeDashoffset: length });
        
        gsap.to(pathFill, {
            strokeDashoffset: 0,
            scrollTrigger: {
                trigger: ".timeline",
                start: "top center",
                end: "bottom center",
                scrub: 1
            }
        });
    }

    gsap.utils.toArray('.timeline-step').forEach((step, i) => {
        gsap.from(step.querySelector('.step-content'), {
            scrollTrigger: {
                trigger: step,
                start: "top 80%",
            },
            x: step.classList.contains('right') ? 50 : -50,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out"
        });
        
        gsap.from(step.querySelector('.step-dot'), {
            scrollTrigger: {
                trigger: step,
                start: "top 80%",
            },
            scale: 0,
            opacity: 0,
            duration: 0.6,
            ease: "back.out(1.7)"
        });
    });
}

function initForm() {
    const form = document.getElementById('discovery-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('.submit-btn');
        const text = btn.querySelector('.btn-text');
        const spinner = btn.querySelector('.spinner');
        const successMsg = form.querySelector('.form-success');

        // Loading state
        text.style.display = 'none';
        spinner.style.display = 'block';
        btn.style.pointerEvents = 'none';

        // Simulate API call
        setTimeout(() => {
            spinner.style.display = 'none';
            text.style.display = 'block';
            btn.style.pointerEvents = 'auto';
            
            // Show success
            gsap.to(form.querySelectorAll('.form-group, .submit-btn'), {
                opacity: 0,
                y: -10,
                duration: 0.3,
                stagger: 0.1,
                onComplete: () => {
                    form.querySelectorAll('.form-group, .submit-btn').forEach(el => el.style.display = 'none');
                    successMsg.style.display = 'block';
                    gsap.from(successMsg, {
                        opacity: 0,
                        y: 20,
                        duration: 0.5,
                        ease: "power2.out"
                    });
                }
            });
        }, 1500);
    });
}
