import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js';

const TEXTURES = {
    floor: '<UPLOAD_LATER>',
    wall: '<UPLOAD_LATER>',
    ceiling: '<UPLOAD_LATER>',
    metalDoor: '<UPLOAD_LATER>',
    woodenDoor: '<UPLOAD_LATER>',
    keyBoard: '<UPLOAD_LATER>',
    decorativeKey: '<UPLOAD_LATER>',
    accessCard: '<UPLOAD_LATER>',
    cardReader: '<UPLOAD_LATER>',
    mailbox: '<UPLOAD_LATER>',
    fallback: '<UPLOAD_LATER>'
};

const gameState = {
    hasAccessCard: false,
    doorUnlocked: false,
    inventory: []
};

let scene, camera, renderer, controls;
let raycaster, mouse, clock;
let interactiveObjects = [];
let hoveredObject = null;

let isMouseDown = false;
let isDragging = false;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const PLAYER_SPEED = 20.0;
const PLAYER_HEIGHT = 1.7;

let metalDoorMesh = null;
let doorAnimating = false;
let doorSlideProgress = 0;
const DOOR_SLIDE_DISTANCE = 4;

let redLight1, redLight2;
let pulseTime = 0;

const textureLoader = new THREE.TextureLoader();

function loadTextureWithFallback(url, repeatX = 1, repeatY = 1) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#666666';
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = '#555555';
        for (let i = 0; i < 512; i += 64) {
            for (let j = 0; j < 512; j += 64) {
                if ((i + j) % 128 === 0) {
                    ctx.fillRect(i, j, 64, 64);
                }
            }
        }

        const fallbackTexture = new THREE.CanvasTexture(canvas);
        fallbackTexture.wrapS = THREE.RepeatWrapping;
        fallbackTexture.wrapT = THREE.RepeatWrapping;
        fallbackTexture.repeat.set(repeatX, repeatY);
        fallbackTexture.colorSpace = THREE.SRGBColorSpace;

        textureLoader.load(
            url,
            (texture) => {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(repeatX, repeatY);
                texture.colorSpace = THREE.SRGBColorSpace;
                resolve(texture);
            },
            undefined,
            (error) => {
                console.warn(`Texture failed to load: ${url}, using fallback`);
                resolve(fallbackTexture);
            }
        );
    });
}

async function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a0000);
    scene.fog = new THREE.FogExp2(0x1a0000, 0.02);

    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, PLAYER_HEIGHT, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = false;
    document.body.appendChild(renderer.domElement);

    controls = new PointerLockControls(camera, document.body);

    raycaster = new THREE.Raycaster();
    raycaster.far = 15;
    mouse = new THREE.Vector2(0, 0);
    clock = new THREE.Clock();

    setupEventListeners();
    await buildScene();

    const startScreen = document.getElementById('start-screen');
    startScreen.addEventListener('click', () => {
        controls.lock();
        startScreen.classList.add('hidden');
    });

    animate();
}

function setupEventListeners() {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('click', onClick);
    window.addEventListener('resize', onWindowResize);

    const backpackToggle = document.getElementById('backpack-toggle');
    const backpackItems = document.getElementById('backpack-items');
    backpackToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        backpackItems.classList.toggle('open');
    });
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW':
            moveBackward = true;
            break;
        case 'KeyS':
            moveForward = true;
            break;
        case 'KeyA':
            moveRight = true;
            break;
        case 'KeyD':
            moveLeft = true;
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW':
            moveBackward = false;
            break;
        case 'KeyS':
            moveForward = false;
            break;
        case 'KeyA':
            moveRight = false;
            break;
        case 'KeyD':
            moveLeft = false;
            break;
    }
}

function onMouseDown(event) {
    if (event.button === 0 && controls.isLocked) {
        isMouseDown = true;
        isDragging = false;
    }
}

function onMouseMove(event) {
    if (isMouseDown && controls.isLocked) {
        if (Math.abs(event.movementX) > 1 || Math.abs(event.movementY) > 1) {
            isDragging = true;
        }
    }

    if (!isDragging && controls.isLocked) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactiveObjects.map(obj => obj.mesh));

        if (hoveredObject) {
            hoveredObject.mesh.material.emissive.setHex(hoveredObject.originalEmissive);
        }

        hoveredObject = null;

        if (intersects.length > 0) {
            const intersectedMesh = intersects[0].object;
            const obj = interactiveObjects.find(o => o.mesh === intersectedMesh);
            if (obj) {
                hoveredObject = obj;
                hoveredObject.mesh.material.emissive.setHex(0x222222);
            }
        }
    }
}

function onMouseUp(event) {
    if (event.button === 0) {
        isMouseDown = false;
        isDragging = false;
    }
}

function onClick(event) {
    if (isDragging || !controls.isLocked) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects.map(obj => obj.mesh));

    if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object;
        const obj = interactiveObjects.find(o => o.mesh === intersectedMesh);
        if (obj && obj.onClick) {
            obj.onClick();
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

async function buildScene() {
    const floorTex = await loadTextureWithFallback(TEXTURES.floor, 4, 4);
    const wallTex = await loadTextureWithFallback(TEXTURES.wall, 3, 3);
    const ceilingTex = await loadTextureWithFallback(TEXTURES.ceiling, 3, 3);
    const metalDoorTex = await loadTextureWithFallback(TEXTURES.metalDoor, 1, 1);
    const woodenDoorTex = await loadTextureWithFallback(TEXTURES.woodenDoor, 1, 1);
    const keyBoardTex = await loadTextureWithFallback(TEXTURES.keyBoard, 1, 1);
    const decorativeKeyTex = await loadTextureWithFallback(TEXTURES.decorativeKey, 1, 1);
    const accessCardTex = await loadTextureWithFallback(TEXTURES.accessCard, 1, 1);
    const cardReaderTex = await loadTextureWithFallback(TEXTURES.cardReader, 1, 1);
    const mailboxTex = await loadTextureWithFallback(TEXTURES.mailbox, 1, 1);

    const roomSize = 20;
    const halfRoom = roomSize / 2;
    const wallHeight = 5;

    const floorGeo = new THREE.PlaneGeometry(roomSize, roomSize);
    const floorMat = new THREE.MeshStandardMaterial({
        map: floorTex,
        roughness: 0.8,
        metalness: 0.3
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({
        map: wallTex,
        roughness: 0.6,
        metalness: 0.5,
        side: THREE.DoubleSide
    });

    const backWall = new THREE.Mesh(
        new THREE.PlaneGeometry(roomSize, wallHeight),
        wallMat
    );
    backWall.position.set(0, wallHeight / 2, -halfRoom);
    scene.add(backWall);

    const leftWall = new THREE.Mesh(
        new THREE.PlaneGeometry(roomSize, wallHeight),
        wallMat
    );
    leftWall.position.set(-halfRoom, wallHeight / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(
        new THREE.PlaneGeometry(roomSize, wallHeight),
        wallMat
    );
    rightWall.position.set(halfRoom, wallHeight / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);

    const frontWallLeft = new THREE.Mesh(
        new THREE.PlaneGeometry(8, wallHeight),
        wallMat
    );
    frontWallLeft.position.set(-6, wallHeight / 2, halfRoom);
    frontWallLeft.rotation.y = Math.PI;
    scene.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(
        new THREE.PlaneGeometry(8, wallHeight),
        wallMat
    );
    frontWallRight.position.set(6, wallHeight / 2, halfRoom);
    frontWallRight.rotation.y = Math.PI;
    scene.add(frontWallRight);

    const ceilingGeo = new THREE.PlaneGeometry(roomSize, roomSize);
    const ceilingMat = new THREE.MeshStandardMaterial({
        map: ceilingTex,
        roughness: 0.7,
        metalness: 0.4
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.y = wallHeight;
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);

    const ambientLight = new THREE.AmbientLight(0xff2222, 0.3);
    scene.add(ambientLight);

    redLight1 = new THREE.PointLight(0xff0000, 8, 25);
    redLight1.position.set(-5, wallHeight - 0.5, 0);
    scene.add(redLight1);

    redLight2 = new THREE.PointLight(0xff0000, 8, 25);
    redLight2.position.set(5, wallHeight - 0.5, 0);
    scene.add(redLight2);

    metalDoorMesh = new THREE.Mesh(
        new THREE.BoxGeometry(4, 4.5, 0.2),
        new THREE.MeshStandardMaterial({
            map: metalDoorTex,
            roughness: 0.4,
            metalness: 0.7,
            emissive: 0x000000
        })
    );
    metalDoorMesh.position.set(0, 2.25, halfRoom);
    scene.add(metalDoorMesh);

    const woodenDoorMesh = new THREE.Mesh(
        new THREE.BoxGeometry(3, 4.2, 0.15),
        new THREE.MeshStandardMaterial({
            map: woodenDoorTex,
            roughness: 0.7,
            metalness: 0.1
        })
    );
    woodenDoorMesh.position.set(-halfRoom + 0.08, 2.1, 5);
    woodenDoorMesh.rotation.y = Math.PI / 2;
    scene.add(woodenDoorMesh);

    const keyBoardMesh = new THREE.Mesh(
        new THREE.BoxGeometry(3, 2.5, 0.1),
        new THREE.MeshStandardMaterial({
            map: keyBoardTex,
            roughness: 0.5,
            metalness: 0.6,
            emissive: 0x000000
        })
    );
    keyBoardMesh.position.set(halfRoom - 0.06, 2.5, -5);
    keyBoardMesh.rotation.y = -Math.PI / 2;
    scene.add(keyBoardMesh);

    const spotlight = new THREE.SpotLight(0xffaa44, 12, 10, Math.PI / 6, 0.5, 1.5);
    spotlight.position.set(halfRoom - 1.5, wallHeight - 0.5, -5);
    spotlight.target.position.copy(keyBoardMesh.position);
    scene.add(spotlight);
    scene.add(spotlight.target);

    const keyPositions = [
        [-0.8, 0.6], [-0.3, 0.7], [0.2, 0.5], [0.7, 0.6],
        [-1.0, 0.0], [-0.5, -0.1], [0.0, 0.1], [0.5, -0.2], [1.0, 0.0],
        [-0.9, -0.7], [-0.4, -0.8], [0.1, -0.6], [0.6, -0.9]
    ];

    keyPositions.forEach(([x, y]) => {
        const keyMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.15, 0.4),
            new THREE.MeshStandardMaterial({
                map: decorativeKeyTex,
                transparent: true,
                roughness: 0.3,
                metalness: 0.7
            })
        );
        keyMesh.position.set(halfRoom - 0.05, 2.5 + y, -5 + x);
        keyMesh.rotation.y = -Math.PI / 2;
        scene.add(keyMesh);
    });

    const accessCardMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.7),
        new THREE.MeshStandardMaterial({
            map: accessCardTex,
            transparent: true,
            roughness: 0.4,
            metalness: 0.2,
            emissive: 0x000000
        })
    );
    accessCardMesh.position.set(halfRoom - 0.05, 2.5, -5);
    accessCardMesh.rotation.y = -Math.PI / 2;
    scene.add(accessCardMesh);

    interactiveObjects.push({
        mesh: accessCardMesh,
        originalEmissive: 0x000000,
        onClick: () => {
            if (!gameState.hasAccessCard) {
                gameState.hasAccessCard = true;
                gameState.inventory.push('accessCard');
                scene.remove(accessCardMesh);
                interactiveObjects = interactiveObjects.filter(obj => obj.mesh !== accessCardMesh);

                const backpackItems = document.getElementById('backpack-items');
                const item = document.createElement('div');
                item.className = 'backpack-item';
                item.style.backgroundImage = `url(${TEXTURES.accessCard})`;
                backpackItems.appendChild(item);
            }
        }
    });

    const cardReaderMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, 0.6),
        new THREE.MeshStandardMaterial({
            map: cardReaderTex,
            transparent: true,
            roughness: 0.5,
            metalness: 0.5,
            emissive: 0x000000
        })
    );
    cardReaderMesh.position.set(2.5, 1.3, halfRoom - 0.01);
    cardReaderMesh.rotation.y = Math.PI;
    scene.add(cardReaderMesh);

    interactiveObjects.push({
        mesh: cardReaderMesh,
        originalEmissive: 0x000000,
        onClick: () => {
            if (gameState.hasAccessCard && !gameState.doorUnlocked) {
                gameState.doorUnlocked = true;
                doorAnimating = true;
                cardReaderMesh.material.emissive.setHex(0x00ff00);
            }
        }
    });

    const mailboxMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.2, 0.6),
        new THREE.MeshStandardMaterial({
            map: mailboxTex,
            roughness: 0.6,
            metalness: 0.5
        })
    );
    mailboxMesh.position.set(-halfRoom + 0.31, 1.5, -3);
    mailboxMesh.rotation.y = Math.PI / 2;
    scene.add(mailboxMesh);
}

function updateMovement(delta) {
    if (!controls.isLocked) return;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveLeft) - Number(moveRight);
    direction.normalize();

    if (moveForward || moveBackward) {
        velocity.z -= direction.z * PLAYER_SPEED * delta;
    }
    if (moveLeft || moveRight) {
        velocity.x -= direction.x * PLAYER_SPEED * delta;
    }

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    const roomLimit = 9;
    if (camera.position.x < -roomLimit) camera.position.x = -roomLimit;
    if (camera.position.x > roomLimit) camera.position.x = roomLimit;
    if (camera.position.z < -roomLimit) camera.position.z = -roomLimit;

    const frontLimit = gameState.doorUnlocked ? 12 : 9;
    const inDoorway = camera.position.x > -2 && camera.position.x < 2;
    if (camera.position.z > frontLimit || (!gameState.doorUnlocked && camera.position.z > 9 && !inDoorway)) {
        camera.position.z = 9;
    }

    camera.position.y = PLAYER_HEIGHT;
}

function updateDoorAnimation(delta) {
    if (doorAnimating && metalDoorMesh) {
        doorSlideProgress += delta * 2;
        if (doorSlideProgress >= 1) {
            doorSlideProgress = 1;
            doorAnimating = false;
        }
        metalDoorMesh.position.x = doorSlideProgress * DOOR_SLIDE_DISTANCE;
    }
}

function updateLighting(delta) {
    pulseTime += delta;
    const pulse = Math.sin(pulseTime * 2) * 0.5 + 0.5;

    if (redLight1) {
        redLight1.intensity = 6 + pulse * 4;
    }
    if (redLight2) {
        redLight2.intensity = 6 + pulse * 4;
    }
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    updateMovement(delta);
    updateDoorAnimation(delta);
    updateLighting(delta);

    renderer.render(scene, camera);
}

init();
