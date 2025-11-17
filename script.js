import * as THREE from 'https://esm.sh/three@0.160.0';
import { PointerLockControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/PointerLockControls';

// ====================================================================
// TEXTURE URLS
// ====================================================================
const TEXTURES = {
    scene1_floor: 'https://raw.githubusercontent.com/zymselina1116-bit/explore1/8c6952697396504b8aa23247d0a822fd2f946340/Screenshot%202025-11-16%20at%2022.51.42.png',
    scene1_wall: 'https://raw.githubusercontent.com/zymselina1116-bit/explore1/44ebc1274ca1099f2da11fc8d188c978b4e06d9c/Screenshot%202025-11-16%20at%2022.53.11.png',
    scene1_door: 'https://raw.githubusercontent.com/zymselina1116-bit/explore1/af6d3787ad8d805c5381d5c308c37c6ecb8387a4/Screenshot%202025-11-16%20at%2022.54.35.png',
    scene1_exit: 'https://raw.githubusercontent.com/zymselina1116-bit/explore1/0bb7f69d2a004aaac9d57b42d97eeb0c440783e6/Screenshot%202025-11-16%20at%2022.55.14.png',
    scene2_floor: 'https://raw.githubusercontent.com/zymselina1116-bit/explore1/65229e54cc1ec812e488d460e933fd2518352e3b/Screenshot%202025-11-16%20at%2022.56.00.png'
};

// ====================================================================
// GAME STATE
// ====================================================================
const gameState = {
    currentScene: 'industrialHall',
    hasAccessCard: false,
    doorUnlocked: false,
    inventory: new Set(),
};

const scenes = {
    industrialHall: {
        objects: [],
        cleanup: null,
    }
};

// ====================================================================
// GLOBAL VARIABLES
// ====================================================================
let scene, camera, renderer, controls;
let raycaster, clock;
let interactiveObjects = [];
let currentHoveredObject = null;

// Movement
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const PLAYER_SPEED = 25.0;
const PLAYER_HEIGHT = 1.6;

// Double-click detection
let lastClickTime = 0;
const DOUBLE_CLICK_THRESHOLD = 250;

// Door animation
let doorAnimating = false;
let doorPosition = 0;
const DOOR_TARGET_POSITION = 5;
const DOOR_ANIMATION_SPEED = 3.0;

// Alarm lights
let alarmLights = [];

// Texture loader
const textureLoader = new THREE.TextureLoader();

// ====================================================================
// TEXTURE LOADING
// ====================================================================
function loadTexture(url, repeatX = 1, repeatY = 1) {
    return new Promise((resolve) => {
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
                console.warn(`Failed to load texture: ${url}`, error);
                resolve(null);
            }
        );
    });
}

// ====================================================================
// INITIALIZATION
// ====================================================================
async function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.FogExp2(0x1a1a1a, 0.015);

    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, PLAYER_HEIGHT, 15);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Controls
    controls = new PointerLockControls(camera, document.body);

    // Click to lock pointer
    document.body.addEventListener('click', () => {
        if (!controls.isLocked) {
            controls.lock();
        }
    });

    // Raycaster
    raycaster = new THREE.Raycaster();
    raycaster.far = 3.5;

    // Clock
    clock = new THREE.Clock();

    // Event listeners
    setupEventListeners();

    // Build scene
    await buildIndustrialHallScene();

    // Start animation
    animate();
}

// ====================================================================
// EVENT LISTENERS
// ====================================================================
function setupEventListeners() {
    // Keyboard
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Mouse click for interactions
    document.addEventListener('click', onMouseClick);

    // Window resize
    window.addEventListener('resize', onWindowResize);

    // Inventory UI
    document.getElementById('inventory-button').addEventListener('click', () => {
        document.getElementById('inventory-panel').classList.toggle('hidden');
    });

    document.getElementById('close-inventory').addEventListener('click', () => {
        document.getElementById('inventory-panel').classList.add('hidden');
    });
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            moveForward = true;
            break;
        case 'KeyS':
        case 'ArrowDown':
            moveBackward = true;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            moveLeft = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            moveRight = true;
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            moveForward = false;
            break;
        case 'KeyS':
        case 'ArrowDown':
            moveBackward = false;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            moveLeft = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            moveRight = false;
            break;
    }
}

function onMouseClick(event) {
    if (!controls.isLocked) return;

    const currentTime = Date.now();
    const isDoubleClick = currentTime - lastClickTime < DOUBLE_CLICK_THRESHOLD;
    lastClickTime = currentTime;

    if (currentHoveredObject && currentHoveredObject.onClick) {
        currentHoveredObject.onClick();
    }

    if (isDoubleClick && currentHoveredObject && currentHoveredObject.onDoubleClick) {
        currentHoveredObject.onDoubleClick();
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ====================================================================
// BUILD INDUSTRIAL HALL SCENE
// ====================================================================
async function buildIndustrialHallScene() {
    // Load textures
    const floorTexture = await loadTexture(TEXTURES.scene1_floor, 4, 4);
    const wallTexture = await loadTexture(TEXTURES.scene1_wall, 2, 1);
    const doorTexture = await loadTexture(TEXTURES.scene1_door, 1, 1);
    const exitTexture = await loadTexture(TEXTURES.scene1_exit, 1, 1);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(40, 40);
    const floorMaterial = new THREE.MeshStandardMaterial({
        map: floorTexture,
        color: floorTexture ? 0xffffff : 0x444444,
        roughness: 0.8,
        metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls
    const wallHeight = 6;
    const wallMaterial = new THREE.MeshStandardMaterial({
        map: wallTexture,
        color: wallTexture ? 0xffffff : 0x555555,
        roughness: 0.9,
    });

    // Back wall
    const backWall = new THREE.Mesh(
        new THREE.PlaneGeometry(40, wallHeight),
        wallMaterial
    );
    backWall.position.set(0, wallHeight / 2, -20);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Front wall (with door gap)
    const frontWallLeft = new THREE.Mesh(
        new THREE.PlaneGeometry(12, wallHeight),
        wallMaterial
    );
    frontWallLeft.position.set(-14, wallHeight / 2, 20);
    frontWallLeft.rotation.y = Math.PI;
    scene.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(
        new THREE.PlaneGeometry(12, wallHeight),
        wallMaterial
    );
    frontWallRight.position.set(14, wallHeight / 2, 20);
    frontWallRight.rotation.y = Math.PI;
    scene.add(frontWallRight);

    // Left wall
    const leftWall = new THREE.Mesh(
        new THREE.PlaneGeometry(40, wallHeight),
        wallMaterial
    );
    leftWall.position.set(-20, wallHeight / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(
        new THREE.PlaneGeometry(40, wallHeight),
        wallMaterial
    );
    rightWall.position.set(20, wallHeight / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);

    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(40, 40);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.9,
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.position.y = wallHeight;
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);

    // Light panels on ceiling
    for (let i = 0; i < 3; i++) {
        const lightPanel = new THREE.Mesh(
            new THREE.BoxGeometry(4, 0.1, 2),
            new THREE.MeshStandardMaterial({
                color: 0xffffee,
                emissive: 0xffffee,
                emissiveIntensity: 0.5,
            })
        );
        lightPanel.position.set((i - 1) * 8, wallHeight - 0.1, 0);
        scene.add(lightPanel);

        const light = new THREE.PointLight(0xffffee, 1, 20);
        light.position.set((i - 1) * 8, wallHeight - 1, 0);
        light.castShadow = true;
        scene.add(light);
    }

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Main door (glass sliding door)
    const doorGeometry = new THREE.BoxGeometry(4, 5, 0.2);
    const doorMaterial = new THREE.MeshStandardMaterial({
        map: doorTexture,
        color: doorTexture ? 0xffffff : 0x888888,
        metalness: 0.3,
        roughness: 0.4,
        transparent: true,
        opacity: 0.7,
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 2.5, 19.8);
    door.castShadow = true;
    scene.add(door);

    // Store door reference for animation
    window.gameDoor = door;

    // Exit sign
    const exitSign = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.5, 0.1),
        new THREE.MeshStandardMaterial({
            map: exitTexture,
            color: exitTexture ? 0xffffff : 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.5,
        })
    );
    exitSign.position.set(0, 5.5, 19.5);
    scene.add(exitSign);

    // Metal key board on wall
    const keyBoard = new THREE.Mesh(
        new THREE.BoxGeometry(4, 3, 0.15),
        new THREE.MeshStandardMaterial({
            color: 0x555555,
            metalness: 0.9,
            roughness: 0.3,
        })
    );
    keyBoard.position.set(-10, 2.5, 19.75);
    keyBoard.castShadow = true;
    scene.add(keyBoard);

    // Decorative keys (various shapes and materials)
    const keyPositions = [
        [-11.2, 3.2, 19.9],
        [-10.6, 3.5, 19.9],
        [-10.0, 3.3, 19.9],
        [-9.4, 3.6, 19.9],
        [-8.8, 3.4, 19.9],
        [-11.3, 2.5, 19.9],
        [-10.2, 2.6, 19.9],
        [-9.1, 2.4, 19.9],
        [-11.5, 1.8, 19.9],
        [-10.5, 1.7, 19.9],
        [-9.5, 1.9, 19.9],
        [-8.7, 1.6, 19.9],
    ];

    const keyMaterials = [
        new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.9, roughness: 0.2 }), // Gold
        new THREE.MeshStandardMaterial({ color: 0xC0C0C0, metalness: 0.85, roughness: 0.25 }), // Silver
        new THREE.MeshStandardMaterial({ color: 0x8B7355, metalness: 0.6, roughness: 0.4 }), // Bronze
        new THREE.MeshStandardMaterial({ color: 0x4A4A4A, metalness: 0.7, roughness: 0.3 }), // Dark iron
    ];

    keyPositions.forEach((pos, i) => {
        const material = keyMaterials[i % keyMaterials.length];
        const keyShape = i % 3 === 0 ?
            new THREE.BoxGeometry(0.15, 0.5, 0.08) :
            i % 3 === 1 ?
            new THREE.BoxGeometry(0.2, 0.6, 0.06) :
            new THREE.BoxGeometry(0.12, 0.45, 0.07);

        const key = new THREE.Mesh(keyShape, material);
        key.position.set(...pos);
        key.rotation.z = (Math.random() - 0.5) * 0.3;
        key.castShadow = true;
        scene.add(key);
    });

    // Access card (interactive) - distinct from keys
    const cardGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.03);
    const cardMaterial = new THREE.MeshStandardMaterial({
        color: 0x2C3E50,
        metalness: 0.3,
        roughness: 0.6,
        emissive: 0x1a4d6d,
        emissiveIntensity: 0.2,
    });
    const accessCard = new THREE.Mesh(cardGeometry, cardMaterial);
    accessCard.position.set(-10, 2.2, 19.9);
    scene.add(accessCard);

    // Card stripe
    const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.15, 0.01),
        new THREE.MeshStandardMaterial({ color: 0x000000 })
    );
    stripe.position.set(-10, 2.4, 19.92);
    scene.add(stripe);

    // Interactive card object
    const cardInteractive = {
        mesh: accessCard,
        type: 'card',
        id: 'scene1_card_access',
        hintText: 'Double-click to pick up access card',
        onDoubleClick: () => {
            // Lift animation
            const startZ = accessCard.position.z;
            const startScale = 1;
            let liftProgress = 0;

            const liftInterval = setInterval(() => {
                liftProgress += 0.05;
                if (liftProgress >= 1) {
                    clearInterval(liftInterval);
                    gameState.hasAccessCard = true;
                    gameState.inventory.add('Access Card');
                    scene.remove(accessCard);
                    scene.remove(stripe);
                    interactiveObjects = interactiveObjects.filter(obj => obj.id !== 'scene1_card_access');
                    updateInventoryUI();
                } else {
                    accessCard.position.z = startZ + liftProgress * 0.5;
                    accessCard.material.emissiveIntensity = 0.2 + liftProgress * 0.8;
                    const scale = startScale + liftProgress * 0.2;
                    accessCard.scale.set(scale, scale, scale);
                }
            }, 20);
        }
    };
    interactiveObjects.push(cardInteractive);

    // Card reader near door
    const readerGroup = new THREE.Group();
    readerGroup.position.set(3, 1.3, 19.5);
    scene.add(readerGroup);

    const readerBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.5, 0.2),
        new THREE.MeshStandardMaterial({
            color: 0x444444,
            metalness: 0.7,
            roughness: 0.3,
        })
    );
    readerGroup.add(readerBox);

    // Indicator light
    const indicator = new THREE.Mesh(
        new THREE.CircleGeometry(0.08, 16),
        new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 1.0,
        })
    );
    indicator.position.set(0, 0.15, 0.11);
    readerGroup.add(indicator);

    // Store indicator reference
    window.cardReaderIndicator = indicator;

    // Interactive card reader
    const cardReaderInteractive = {
        mesh: readerBox,
        type: 'cardReader',
        id: 'scene1_card_reader',
        hintText: 'Click to use card reader',
        onClick: () => {
            if (!gameState.hasAccessCard) {
                console.log('You need an access card');
                return;
            }
            if (!gameState.doorUnlocked) {
                gameState.doorUnlocked = true;
                // Change indicator to green
                indicator.material.color.setHex(0x00ff00);
                indicator.material.emissive.setHex(0x00ff00);
                // Start door animation
                doorAnimating = true;
                console.log('Door unlocked');
            }
        }
    };
    interactiveObjects.push(cardReaderInteractive);

    // Red alarm lights (more coverage)
    const alarmPositions = [
        // Corners
        [-18, 5.5, -18],
        [18, 5.5, -18],
        [-18, 5.5, 18],
        [18, 5.5, 18],
        // Wall midpoints
        [0, 5.5, -18],
        [-18, 5.5, 0],
        [18, 5.5, 0],
        [10, 5.5, 18],
        // Additional scattered lights
        [-10, 5.3, -10],
        [10, 5.3, -10],
        [-10, 5.3, 10],
        [8, 5.3, 8],
        [-15, 5.2, -5],
        [15, 5.2, 5],
    ];

    alarmPositions.forEach(pos => {
        const alarmMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 16, 16),
            new THREE.MeshStandardMaterial({
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 1.0,
            })
        );
        alarmMesh.position.set(...pos);
        scene.add(alarmMesh);

        const alarmLight = new THREE.PointLight(0xff0000, 1, 10);
        alarmLight.position.set(...pos);
        scene.add(alarmLight);

        alarmLights.push({ mesh: alarmMesh, light: alarmLight });
    });

    console.log('Industrial Hall scene built');
}

// ====================================================================
// UPDATE INVENTORY UI
// ====================================================================
function updateInventoryUI() {
    const itemsDiv = document.getElementById('inventory-items');
    itemsDiv.innerHTML = '';

    if (gameState.inventory.size === 0) {
        itemsDiv.innerHTML = '<p class="empty-message">Inventory is empty</p>';
    } else {
        gameState.inventory.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item';
            itemDiv.textContent = item;
            itemsDiv.appendChild(itemDiv);
        });
    }
}

// ====================================================================
// UPDATE FUNCTION
// ====================================================================
function update(delta) {
    if (!controls.isLocked) return;

    // Movement
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) {
        velocity.z -= direction.z * PLAYER_SPEED * delta;
    }
    if (moveLeft || moveRight) {
        velocity.x -= direction.x * PLAYER_SPEED * delta;
    }

    const prevPosition = controls.getObject().position.clone();
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    // Collision detection (simple boundary)
    const pos = controls.getObject().position;
    if (pos.x < -18 || pos.x > 18 || pos.z < -18 || pos.z > 18) {
        controls.getObject().position.copy(prevPosition);
    }

    // Keep player at correct height
    controls.getObject().position.y = PLAYER_HEIGHT;

    // Raycasting for interactive objects
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(
        interactiveObjects.map(obj => obj.mesh)
    );

    const hintText = document.getElementById('hint-text');
    if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object;
        const interactiveObj = interactiveObjects.find(
            obj => obj.mesh === intersectedMesh
        );

        if (interactiveObj) {
            currentHoveredObject = interactiveObj;
            hintText.textContent = interactiveObj.hintText;
            hintText.classList.add('visible');
        } else {
            currentHoveredObject = null;
            hintText.classList.remove('visible');
        }
    } else {
        currentHoveredObject = null;
        hintText.classList.remove('visible');
    }

    // Door animation (slide to the right)
    if (doorAnimating && window.gameDoor) {
        doorPosition += DOOR_ANIMATION_SPEED * delta;
        if (doorPosition >= DOOR_TARGET_POSITION) {
            doorPosition = DOOR_TARGET_POSITION;
            doorAnimating = false;
        }
        window.gameDoor.position.x = doorPosition;
    }

    // Alarm lights pulsing
    const time = clock.getElapsedTime();
    alarmLights.forEach(alarm => {
        const intensity = Math.sin(time * 3) * 0.5 + 0.5;
        alarm.mesh.material.emissiveIntensity = intensity;
        alarm.light.intensity = intensity * 2;
    });
}

// ====================================================================
// ANIMATION LOOP
// ====================================================================
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    update(delta);

    renderer.render(scene, camera);
}

// ====================================================================
// START
// ====================================================================
init();
