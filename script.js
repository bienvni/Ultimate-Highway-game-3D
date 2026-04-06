import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

// --- CONFIGURATION SCÈNE ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- VARIABLES ---
let score = 0, coins = 0, speed = 0.8, isGameOver = false, gameStarted = false;
let shakeIntensity = 0;
const decorElements = [];
const enemies = [];
const coinsList = [];

// --- CRÉATION DE LA VOITURE DÉTAILLÉE ---
function createCoolCar(color) {
    const car = new THREE.Group();
    
    // Carrosserie
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 4), new THREE.MeshPhongMaterial({color}));
    body.position.y = 0.6;
    car.add(body);

    // Vitres (Transparentes)
    const glassMat = new THREE.MeshPhongMaterial({color: 0x88ccff, transparent: true, opacity: 0.5, shininess: 100});
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 2), glassMat);
    cabin.position.set(0, 1.1, -0.2);
    car.add(cabin);

    // Roues et Pneus
    const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.4, 20);
    const tireMat = new THREE.MeshPhongMaterial({color: 0x111111});
    const positions = [[-1.1,0.4,1.2], [1.1,0.4,1.2], [-1.1,0.4,-1.2], [1.1,0.4,-1.2]];
    
    positions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeo, tireMat);
        wheel.rotation.z = Math.PI/2;
        wheel.position.set(...pos);
        car.add(wheel);
    });

    return car;
}

const player = createCoolCar(0xff0000);
scene.add(player);

// --- ENVIRONNEMENT ---
const world = new THREE.Group(); scene.add(world);

// Route séparée en deux
const road = new THREE.Mesh(new THREE.PlaneGeometry(22, 2000), new THREE.MeshPhongMaterial({color: 0x222222}));
road.rotation.x = -Math.PI/2; world.add(road);

const lineMid = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 2000), new THREE.MeshBasicMaterial({color: 0xffcc00}));
lineMid.rotation.x = -Math.PI/2; lineMid.position.y = 0.05; world.add(lineMid);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 2000), new THREE.MeshPhongMaterial({color: 0x1B5E20}));
floor.rotation.x = -Math.PI/2; floor.position.y = -0.1; world.add(floor);

// Lampadaires et Arbres
function spawnDecor(z) {
    // Arbre
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.5), new THREE.MeshPhongMaterial({color: 0x5D4037}));
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.5, 8), new THREE.MeshPhongMaterial({color: 0x0a3d0a}));
    leaves.position.y = 2.5; tree.add(trunk, leaves);
    tree.position.set(Math.random() > 0.5 ? 15 : -15, 0, z);
    scene.add(tree);
    decorElements.push(tree);

    // Lampadaire
    const pole = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6), new THREE.MeshPhongMaterial({color: 0x777777}));
    stick.position.y = 3;
    const lightHead = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 0.5), new THREE.MeshPhongMaterial({color: 0x333333}));
    lightHead.position.set(0.5, 6, 0);
    const lightSource = new THREE.PointLight(0xffffee, 0, 20); // Intensité 0 par défaut (Jour)
    lightSource.position.set(0.5, 5.8, 0);
    pole.add(stick, lightHead, lightSource);
    pole.position.set(Math.random() > 0.5 ? 12 : -12, 0, z + 10);
    scene.add(pole);
    decorElements.push(pole);
}

for(let i=0; i<15; i++) spawnDecor(-i * 40);

// --- LOGIQUE JOYSTICK ---
let moveX = 0;
const h = document.getElementById('joystick-handle');
window.addEventListener('touchmove', e => {
    const rect = document.getElementById('joystick-zone').getBoundingClientRect();
    let x = (e.touches[0].clientX - (rect.left + 50));
    x = Math.max(-45, Math.min(45, x));
    h.style.left = (50 + x) + 'px';
    moveX = x / 45;
}, {passive: false});
window.addEventListener('touchend', () => { moveX = 0; h.style.left = '50%'; });

window.startGame = () => { document.getElementById('menu-start').style.display = 'none'; gameStarted = true; animate(); };

// --- BOUCLE PRINCIPALE ---
function animate() {
    if(isGameOver || !gameStarted) return;
    requestAnimationFrame(animate);

    score++;
    let phase = Math.floor(score / 2500);
    let isNight = phase % 2 !== 0;

    // Mise à jour atmosphère
    scene.background = new THREE.Color(isNight ? 0x050510 : 0x44aaff);
    floor.material.color.set(isNight ? 0x0a1a0a : 0x1B5E20);
    document.getElementById('level-info').innerText = isNight ? "MODE NUIT" : "MODE JOUR";

    // Mouvement joueur
    player.position.x += moveX * 0.35;
    player.position.x = Math.max(-9.5, Math.min(9.5, player.position.x));
    player.rotation.y = -moveX * 0.25;

    // Défilement route
    world.position.z += speed; if(world.position.z > 40) world.position.z = 0;

    // Gestion Décors & Lampadaires
    decorElements.forEach(el => {
        el.position.z += speed;
        if(el.position.z > 20) el.position.z = -250;
        // Allumer lampes si nuit
        if(el.children[2] && el.children[2].type === "PointLight") {
            el.children[2].intensity = isNight ? 1.5 : 0;
        }
    });

    // Ennemis
    if(Math.random() < 0.02) {
        const e = createCoolCar(Math.random() * 0xffffff);
        e.position.set(Math.random() > 0.5 ? 5 : -5, 0, -250);
        enemies.push(e); scene.add(e);
    }
    enemies.forEach((e, i) => {
        e.position.z += speed + 0.1;
        if(player.position.distanceTo(e.position) < 2.5) {
            shakeIntensity = 0.5; // Déclenche le tremblement
            gameOver();
        }
        if(e.position.z > 20) { scene.remove(e); enemies.splice(i, 1); }
    });

    // Pièces & Étincelles
    if(Math.random() < 0.05) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.1,16), new THREE.MeshPhongMaterial({color:0xffcc00}));
        c.rotation.x = Math.PI/2; c.position.set(Math.random()*16-8, 0.8, -250);
        coinsList.push(c); scene.add(c);
    }
    coinsList.forEach((c, i) => {
        c.position.z += speed; c.rotation.y += 0.05;
        if(player.position.distanceTo(c.position) < 2) {
            coins++; document.getElementById('coinCount').innerText = coins;
            scene.remove(c); coinsList.splice(i, 1);
        }
    });

    // Effet de tremblement (Camera Shake)
    if(shakeIntensity > 0) {
        camera.position.x = (Math.random() - 0.5) * shakeIntensity;
        camera.position.y = 6 + (Math.random() - 0.5) * shakeIntensity;
        shakeIntensity *= 0.9; // Amortissement
    } else {
        camera.position.set(player.position.x * 0.5, 6, 12);
    }

    document.getElementById('scoreVal').innerText = Math.floor(score/10);
    camera.lookAt(player.position.x, 1, player.position.z - 5);
    renderer.render(scene, camera);
}

function gameOver() {
    isGameOver = true;
    document.getElementById('game-over').style.display = 'flex';
    document.getElementById('finalScore').innerText = Math.floor(score/10);
}

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(10,20,10); scene.add(sun);
