/**
 * SourceFix — 3D Scene Module (Three.js)
 * Interactive core and header micro-logo with theme-universal materials and smooth parallax tracking.
 */

export function initThreeScenes(mainContainer, logoCanvas) {
    if (!window.THREE) {
        console.warn('Three.js is not loaded');
        return { setState: () => {}, setTheme: () => {} };
    }

    const THREE = window.THREE;

    function detectLightTheme() {
        if (document.documentElement.classList.contains('light')) return true;
        if (document.documentElement.classList.contains('dark')) return false;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    }

    let isLight = detectLightTheme();

    const STATES = {
        idle: {
            dark:  { core: 0x7b5cff, wire: 0x00ffe0, r1: 0x7b5cff, r2: 0x00ffe0, pColor: 0x00ffe0, i1: 4.0, i2: 3.0, i3: 1.5, amb: 0.45, wOp: 0.22, r1Op: 0.55, r2Op: 0.35, pOp: 0.65 },
            light: { core: 0x4f46e5, wire: 0x0284c7, r1: 0x4338ca, r2: 0x0284c7, pColor: 0x0284c7, i1: 3.6, i2: 3.0, i3: 2.0, amb: 0.85, wOp: 0.48, r1Op: 0.70, r2Op: 0.55, pOp: 0.75 },
            speed: 1.0
        },
        hover: {
            dark:  { core: 0x38bdf8, wire: 0xffffff, r1: 0x00ffe0, r2: 0xffffff, pColor: 0x38bdf8, i1: 5.0, i2: 4.0, i3: 2.0, amb: 0.55, wOp: 0.35, r1Op: 0.75, r2Op: 0.55, pOp: 0.85 },
            light: { core: 0x0284c7, wire: 0x4f46e5, r1: 0x0ea5e9, r2: 0x6366f1, pColor: 0x0369a1, i1: 4.5, i2: 3.8, i3: 2.2, amb: 0.90, wOp: 0.60, r1Op: 0.80, r2Op: 0.65, pOp: 0.85 },
            speed: 2.2
        },
        processing: {
            dark:  { core: 0x6366f1, wire: 0x00ffe0, r1: 0xff3e6c, r2: 0x7b5cff, pColor: 0x00ffe0, i1: 6.5, i2: 5.0, i3: 3.0, amb: 0.60, wOp: 0.40, r1Op: 0.85, r2Op: 0.70, pOp: 0.90 },
            light: { core: 0x4338ca, wire: 0x0284c7, r1: 0xe11d48, r2: 0x4f46e5, pColor: 0x0284c7, i1: 5.5, i2: 4.5, i3: 2.5, amb: 0.90, wOp: 0.65, r1Op: 0.85, r2Op: 0.70, pOp: 0.90 },
            speed: 6.5
        },
        success: {
            dark:  { core: 0x10b981, wire: 0x34d399, r1: 0x10b981, r2: 0x00ffe0, pColor: 0x34d399, i1: 4.5, i2: 4.0, i3: 2.0, amb: 0.55, wOp: 0.30, r1Op: 0.70, r2Op: 0.50, pOp: 0.80 },
            light: { core: 0x059669, wire: 0x10b981, r1: 0x047857, r2: 0x0284c7, pColor: 0x047857, i1: 4.2, i2: 3.5, i3: 2.0, amb: 0.85, wOp: 0.55, r1Op: 0.80, r2Op: 0.60, pOp: 0.85 },
            speed: 1.8
        },
        error: {
            dark:  { core: 0xff3e6c, wire: 0xff6b6b, r1: 0xff3e6c, r2: 0xf59e0b, pColor: 0xff6b6b, i1: 3.0, i2: 2.5, i3: 1.5, amb: 0.45, wOp: 0.30, r1Op: 0.60, r2Op: 0.40, pOp: 0.60 },
            light: { core: 0xe11d48, wire: 0xf43f5e, r1: 0xbe123c, r2: 0xd97706, pColor: 0xbe123c, i1: 3.0, i2: 2.5, i3: 1.5, amb: 0.80, wOp: 0.55, r1Op: 0.75, r2Op: 0.55, pOp: 0.70 },
            speed: 0.5
        }
    };

    function create3DCore(W, H, isMicro = false) {
        const scene    = new THREE.Scene();
        const camera   = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
        camera.position.z = isMicro ? 5.0 : 5.8;
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(W, H);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        const rootGroup  = new THREE.Group();
        const innerGroup = new THREE.Group();
        scene.add(rootGroup);
        rootGroup.add(innerGroup);

        const coreGeo = new THREE.IcosahedronGeometry(1.1, 1);
        const coreMat = new THREE.MeshStandardMaterial({
            color: isLight ? 0x4f46e5 : 0x7b5cff,
            roughness: isLight ? 0.22 : 0.18,
            metalness: isLight ? 0.45 : 0.88,
            flatShading: true
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        innerGroup.add(coreMesh);

        const wireGeo = new THREE.IcosahedronGeometry(1.5, 2);
        const wireMat = new THREE.MeshBasicMaterial({
            color: isLight ? 0x0284c7 : 0x00ffe0,
            wireframe: true,
            transparent: true,
            opacity: isLight ? 0.48 : 0.22
        });
        innerGroup.add(new THREE.Mesh(wireGeo, wireMat));

        const r1Mat = new THREE.MeshBasicMaterial({
            color: isLight ? 0x4f46e5 : 0x7b5cff,
            transparent: true,
            opacity: isLight ? 0.70 : 0.55
        });
        const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.025, 16, 128), r1Mat);
        ring1.rotation.x = Math.PI / 2.2;
        innerGroup.add(ring1);

        const r2Mat = new THREE.MeshBasicMaterial({
            color: isLight ? 0x0284c7 : 0x00ffe0,
            transparent: true,
            opacity: isLight ? 0.55 : 0.35
        });
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.015, 16, 128), r2Mat);
        ring2.rotation.x = Math.PI / 4;
        ring2.rotation.y = Math.PI / 6;
        innerGroup.add(ring2);

        const ambientLight = new THREE.AmbientLight(0xffffff, isLight ? 0.85 : 0.45);
        scene.add(ambientLight);

        const pl1 = new THREE.PointLight(isLight ? 0x4f46e5 : 0x7b5cff, isLight ? 3.6 : 4.0, 20);
        pl1.position.set(4, 4, 4);
        scene.add(pl1);

        const pl2 = new THREE.PointLight(isLight ? 0x0284c7 : 0x00ffe0, 3.0, 20);
        pl2.position.set(-4, -3, 2);
        scene.add(pl2);

        const pl3 = new THREE.PointLight(isLight ? 0x6366f1 : 0xff3e6c, isLight ? 2.0 : 1.5, 15);
        pl3.position.set(0, -4, -3);
        scene.add(pl3);

        return {
            scene, camera, renderer, rootGroup, innerGroup,
            coreMesh, coreMat, wireMat, r1Mat, r2Mat, ring1, ring2,
            ambientLight, pl1, pl2, pl3
        };
    }

    const MW = mainContainer.offsetWidth || 260;
    const MH = mainContainer.offsetHeight || 260;
    const main = create3DCore(MW, MH, false);
    mainContainer.appendChild(main.renderer.domElement);

    // Dynamic particle cloud
    const pCnt = 70;
    const pPos = new Float32Array(pCnt * 3);
    for (let i = 0; i < pCnt; i++) {
        const r = 2.2 + Math.random() * 0.8;
        const t = Math.random() * Math.PI * 2;
        const p = Math.acos(2 * Math.random() - 1);
        pPos[i * 3]     = r * Math.sin(p) * Math.cos(t);
        pPos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
        pPos[i * 3 + 2] = r * Math.cos(p);
    }
    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particlesMat = new THREE.PointsMaterial({
        color: isLight ? 0x0284c7 : 0x00ffe0,
        size: isLight ? 0.05 : 0.04,
        transparent: true,
        opacity: isLight ? 0.75 : 0.65
    });
    const particles = new THREE.Points(partGeo, particlesMat);
    main.rootGroup.add(particles);

    // Micro 3D core in header logo
    const logo = create3DCore(72, 72, true);
    if (logoCanvas) {
        logoCanvas.replaceWith(logo.renderer.domElement);
        logo.renderer.domElement.id = 'logo-canvas';
        logo.renderer.domElement.style.cssText = 'width:36px;height:36px;border-radius:10px;display:block;';
    }

    let state = 'idle';
    let mouseX = 0, mouseY = 0;
    let targetSpeed = 1, curSpeed = 1;
    const clock = new THREE.Clock();

    window.addEventListener('mousemove', e => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    function applyState(sc, pal) {
        sc.coreMat.color.setHex(pal.core);
        sc.coreMat.roughness = isLight ? 0.22 : 0.18;
        sc.coreMat.metalness = isLight ? 0.45 : 0.88;

        sc.wireMat.color.setHex(pal.wire);
        sc.wireMat.opacity = pal.wOp;

        sc.r1Mat.color.setHex(pal.r1);
        sc.r1Mat.opacity = pal.r1Op;

        sc.r2Mat.color.setHex(pal.r2);
        sc.r2Mat.opacity = pal.r2Op;

        sc.ambientLight.intensity = pal.amb;
        sc.pl1.color.setHex(pal.core);
        sc.pl1.intensity = pal.i1;
        sc.pl2.color.setHex(pal.wire);
        sc.pl2.intensity = pal.i2;
        sc.pl3.intensity = pal.i3;
    }

    function refreshThemeColors() {
        const sObj = STATES[state] || STATES.idle;
        const pal = isLight ? sObj.light : sObj.dark;
        applyState(main, pal);
        applyState(logo, pal);

        particlesMat.color.setHex(pal.pColor);
        particlesMat.opacity = pal.pOp;
        particlesMat.size = isLight ? 0.05 : 0.04;
    }

    function setState(s) {
        state = s;
        const sObj = STATES[s] || STATES.idle;
        const pal = isLight ? sObj.light : sObj.dark;
        applyState(main, pal);
        applyState(logo, pal);
        targetSpeed = sObj.speed;

        particlesMat.color.setHex(pal.pColor);
        particlesMat.opacity = pal.pOp;

        const pr1 = document.getElementById('pulse-ring-1');
        const pr2 = document.getElementById('pulse-ring-2');
        if (pr1 && pr2) {
            if (s === 'processing' || s === 'success') {
                pr1.classList.add('active');
                pr2.classList.add('active');
                pr1.style.borderColor = s === 'success' ? '#10b981' : (isLight ? '#4f46e5' : '#7b5cff');
                pr2.style.borderColor = s === 'success' ? '#34d399' : (isLight ? '#0284c7' : '#00ffe0');
            } else {
                pr1.classList.remove('active');
                pr2.classList.remove('active');
            }
        }
    }

    function setTheme(lightMode) {
        isLight = !!lightMode;
        refreshThemeColors();
    }

    // Auto-listen to system color scheme changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
            if (!document.documentElement.classList.contains('light') && !document.documentElement.classList.contains('dark')) {
                setTheme(e.matches);
            }
        });
    }

    const origin = new THREE.Vector3();
    let logoAngle = 0;

    function animate() {
        requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        curSpeed += (targetSpeed - curSpeed) * 0.05;

        main.coreMesh.rotation.y += 0.007 * curSpeed;
        main.coreMesh.rotation.x += 0.004 * curSpeed;
        main.ring1.rotation.z    -= 0.008 * curSpeed;
        main.ring2.rotation.y    += 0.006 * curSpeed;
        particles.rotation.y     += 0.001 * curSpeed;
        main.innerGroup.scale.setScalar(1 + Math.sin(t * 2) * 0.03);

        const targetRotY = mouseX * 0.45;
        const targetRotX = mouseY * 0.35;
        main.rootGroup.rotation.y += (targetRotY - main.rootGroup.rotation.y) * 0.06;
        main.rootGroup.rotation.x += (targetRotX - main.rootGroup.rotation.x) * 0.06;

        if (state === 'processing' && Math.random() > 0.90) {
            main.coreMesh.position.set((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, 0);
        } else {
            main.coreMesh.position.lerp(origin, 0.3);
        }
        main.renderer.render(main.scene, main.camera);

        logoAngle += 0.015;
        logo.rootGroup.rotation.y = logoAngle;
        logo.innerGroup.scale.setScalar(1 + Math.sin(t * 1.5) * 0.025);
        logo.renderer.render(logo.scene, logo.camera);
    }
    animate();

    return { setState, setTheme };
}
