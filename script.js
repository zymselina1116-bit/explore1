// ===============================
// TEXTURE PLACEHOLDERS
// ===============================
const TEXTURES = {
    scene1_floor: "<UPLOAD_LATER>",
    scene1_wall: "<UPLOAD_LATER>",
    scene1_door: "<UPLOAD_LATER>",
    scene1_exitSign: "<UPLOAD_LATER>",
    scene1_key1: "<UPLOAD_LATER>",
    scene1_key2: "<UPLOAD_LATER>",
    scene1_card: "<UPLOAD_LATER>",

    scene2_floor: "<UPLOAD_LATER>",
    scene2_wall: "<UPLOAD_LATER>",
    scene2_console: "<UPLOAD_LATER>",
    scene2_door: "<UPLOAD_LATER>",

    scene3_floor: "<UPLOAD_LATER>",
    scene3_wall: "<UPLOAD_LATER>",
    scene3_water: "<UPLOAD_LATER>",
    scene3_portal: "<UPLOAD_LATER>",

    ending_room_wall: "<UPLOAD_LATER>",
    ending_room_door: "<UPLOAD_LATER>"
};

// ===============================
// GLOBAL VARIABLES
// ===============================
let scene, camera, renderer, controls;
let raycaster, mouse;
let interactiveObjects = [];
let flashingLights = [];
let animatedObjects = [];
let currentScene = "scene1";
let gameStarted = false;
let clock = new THREE.Clock();

// Inventory
let inventory = {
    key1: false,
    key2: false,
    card: false,
    controlKey: false
};

// Player movement
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
const PLAYER_SPEED = 15.0;
const PLAYER_HEIGHT = 2.0;

// Scene boundaries
let sceneBounds = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };

// ===============================
// INITIALIZATION
// ===============================
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);
    scene.fog = new THREE.Fog(0x333333, 10, 50);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, PLAYER_HEIGHT, 8);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Controls
    controls = new THREE.PointerLockControls(camera, document.body);

    // Raycaster
    raycaster = new THREE.Raycaster();
    raycaster.far = 5;
    mouse = new THREE.Vector2();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);

    // Event Listeners
    setupEventListeners();

    // Update UI
    updateInventoryUI();

    // Animation loop
    animate();
}

// ===============================
// EVENT LISTENERS
// ===============================
function setupEventListeners() {
    // Auto-start the game
    gameStarted = true;
    loadScene('scene1');

    // Click anywhere to lock pointer (required by browser security)
    document.addEventListener('click', () => {
        if (!controls.isLocked) {
            controls.lock();
        }
    }, { once: true });

    // Restart button
    document.getElementById('restart-btn').addEventListener('click', () => {
        document.getElementById('end-screen').style.display = 'none';
        inventory = { key1: false, key2: false, card: false, controlKey: false };
        updateInventoryUI();
        controls.lock();
        loadScene('scene1');
    });

    // Pointer lock
    controls.addEventListener('lock', () => {
        console.log('Pointer locked');
    });

    controls.addEventListener('unlock', () => {
        console.log('Pointer unlocked');
    });

    // Keyboard
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Mouse click for interactions
    document.addEventListener('click', onMouseClick);

    // Mouse move for hover detection
    document.addEventListener('mousemove', onMouseMove);

    // Window resize
    window.addEventListener('resize', onWindowResize);
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

    // Cast ray from camera center
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(interactiveObjects, true);

    if (intersects.length > 0) {
        const object = intersects[0].object;
        handleInteraction(object);
    }
}

function onMouseMove(event) {
    if (!controls.isLocked) return;

    // Update hover hint
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(interactiveObjects, true);

    const hintElement = document.getElementById('interaction-hint');
    if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object.userData.type) {
            hintElement.textContent = `Click to ${object.userData.action || 'interact'}`;
            hintElement.style.display = 'block';
        } else {
            hintElement.style.display = 'none';
        }
    } else {
        hintElement.style.display = 'none';
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ===============================
// INTERACTION HANDLER
// ===============================
function handleInteraction(object) {
    const userData = object.userData;

    if (userData.type === 'pickup') {
        // Pick up item
        if (userData.id === 'key1') {
            inventory.key1 = true;
            showMessage('Picked up Key 1');
        } else if (userData.id === 'key2') {
            inventory.key2 = true;
            showMessage('Picked up Key 2');
        } else if (userData.id === 'card') {
            inventory.card = true;
            showMessage('Picked up Access Card');
        } else if (userData.id === 'controlKey') {
            inventory.controlKey = true;
            showMessage('Picked up Control Key');
        }

        // Remove object from scene
        scene.remove(object);
        interactiveObjects = interactiveObjects.filter(obj => obj !== object);
        updateInventoryUI();

    } else if (userData.type === 'door') {
        // Check requirements
        if (userData.requires) {
            if (!inventory[userData.requires]) {
                showMessage(`You need ${userData.requiresName || userData.requires} to open this door`);
                return;
            }
        }

        // Open door and transition
        showMessage('Opening door...');
        setTimeout(() => {
            loadScene(userData.nextScene);
        }, 500);

    } else if (userData.type === 'vortex') {
        // Loop ending - back to scene 1
        showMessage('Entering the vortex...');
        setTimeout(() => {
            loadScene('scene1');
        }, 1000);

    } else if (userData.type === 'endDoor') {
        // Show end screen
        showEndScreen();
    }
}

// ===============================
// UI FUNCTIONS
// ===============================
function updateInventoryUI() {
    const inventoryDiv = document.getElementById('inventory-items');
    inventoryDiv.innerHTML = '';

    let count = 0;
    for (let key in inventory) {
        if (inventory[key]) {
            count++;
            const item = document.createElement('div');
            item.className = 'inventory-item';
            item.textContent = formatItemName(key);
            inventoryDiv.appendChild(item);
        }
    }

    if (count === 0) {
        inventoryDiv.innerHTML = '<p style="color: #888;">No items</p>';
    }
}

function formatItemName(key) {
    const names = {
        key1: '🔑 Key 1',
        key2: '🔑 Key 2',
        card: '💳 Access Card',
        controlKey: '🔑 Control Key'
    };
    return names[key] || key;
}

function showMessage(text) {
    const messageDiv = document.getElementById('message-display');
    messageDiv.textContent = text;
    messageDiv.style.display = 'block';

    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 2000);
}

function updateSceneTitle(title) {
    document.getElementById('scene-title').textContent = title;
}

function showEndScreen() {
    controls.unlock();
    document.getElementById('end-screen').style.display = 'flex';
}

// ===============================
// SCENE MANAGER
// ===============================
function loadScene(name) {
    clearScene();
    currentScene = name;

    switch (name) {
        case 'scene1':
            buildScene1();
            break;
        case 'scene2':
            buildScene2();
            break;
        case 'scene3':
            buildScene3();
            break;
        case 'ending':
            buildEndingRoom();
            break;
    }
}

function clearScene() {
    // Remove all objects
    interactiveObjects = [];
    flashingLights = [];
    animatedObjects = [];

    // Remove all meshes from scene (keep lights and camera)
    const objectsToRemove = [];
    scene.traverse((object) => {
        if (object.isMesh) {
            objectsToRemove.push(object);
        }
    });

    objectsToRemove.forEach(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(mat => mat.dispose());
            } else {
                object.material.dispose();
            }
        }
        scene.remove(object);
    });

    // Reset player position
    camera.position.set(0, PLAYER_HEIGHT, 5);
    velocity.set(0, 0, 0);
}

// ===============================
// SCENE 1 - INDUSTRIAL HALL
// ===============================
function buildScene1() {
    updateSceneTitle('Industrial Hall');
    sceneBounds = { minX: -15, maxX: 15, minZ: -15, maxZ: 15 };

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls
    createWall(0, 2.5, -15, 30, 5, 0.5, 0x444444); // Back
    createWall(0, 2.5, 15, 30, 5, 0.5, 0x444444);  // Front (with door gap)
    createWall(-15, 2.5, 0, 0.5, 5, 30, 0x444444); // Left
    createWall(15, 2.5, 0, 0.5, 5, 30, 0x444444);  // Right

    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(30, 30);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.9
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 5;
    scene.add(ceiling);

    // Keys on wall
    if (!inventory.key1) {
        const key1 = createPickupItem(-10, 1.5, -14, 0xFFD700, 'key1', 'pick up');
        scene.add(key1);
        interactiveObjects.push(key1);
    }

    if (!inventory.key2) {
        const key2 = createPickupItem(10, 1.5, -14, 0xFFD700, 'key2', 'pick up');
        scene.add(key2);
        interactiveObjects.push(key2);
    }

    // Access card on table
    if (!inventory.card) {
        // Table
        const tableGeometry = new THREE.BoxGeometry(2, 1, 2);
        const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.position.set(-5, 0.5, 0);
        table.castShadow = true;
        scene.add(table);

        // Card on table
        const card = createPickupItem(-5, 1.2, 0, 0x00FFFF, 'card', 'pick up');
        scene.add(card);
        interactiveObjects.push(card);

        // Glow
        const cardLight = new THREE.PointLight(0x00FFFF, 1, 5);
        cardLight.position.set(-5, 1.5, 0);
        scene.add(cardLight);
    }

    // Door to Scene 2 (front center)
    const door = createDoor(0, 2, 14, 'card', 'Access Card', 'scene2');
    scene.add(door);
    interactiveObjects.push(door);

    // Exit sign above door
    const signGeometry = new THREE.BoxGeometry(2, 0.5, 0.2);
    const signMaterial = new THREE.MeshStandardMaterial({
        color: 0x00FF00,
        emissive: 0x00FF00,
        emissiveIntensity: 0.5
    });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, 4, 14);
    scene.add(sign);

    // Four red flashing corner warning lights
    createFlashingLight(-12, 4, -12, 0xFF0000);
    createFlashingLight(12, 4, -12, 0xFF0000);
    createFlashingLight(-12, 4, 12, 0xFF0000);
    createFlashingLight(12, 4, 12, 0xFF0000);
}

// ===============================
// SCENE 2 - CONTROL OFFICE
// ===============================
function buildScene2() {
    updateSceneTitle('Control Office');
    sceneBounds = { minX: -12, maxX: 12, minZ: -12, maxZ: 12 };

    // Dim ambient
    scene.fog = new THREE.Fog(0x0a0a0a, 5, 30);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(24, 24);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.9
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls
    createWall(0, 2, -12, 24, 4, 0.5, 0x2a2a2a);
    createWall(0, 2, 12, 24, 4, 0.5, 0x2a2a2a);
    createWall(-12, 2, 0, 0.5, 4, 24, 0x2a2a2a);
    createWall(12, 2, 0, 0.5, 4, 24, 0x2a2a2a);

    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(24, 24);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    scene.add(ceiling);

    // Console panels (decoration)
    for (let i = 0; i < 3; i++) {
        const consoleGeometry = new THREE.BoxGeometry(2, 1.5, 0.5);
        const consoleMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            emissive: 0x0066FF,
            emissiveIntensity: 0.2
        });
        const console = new THREE.Mesh(consoleGeometry, consoleMaterial);
        console.position.set(-8 + i * 4, 0.75, -10);
        console.castShadow = true;
        scene.add(console);

        // Small light on console
        const consoleLight = new THREE.PointLight(0x0066FF, 0.5, 3);
        consoleLight.position.set(-8 + i * 4, 1.5, -10);
        scene.add(consoleLight);
    }

    // Control key
    if (!inventory.controlKey) {
        const controlKey = createPickupItem(5, 1, -5, 0xFFD700, 'controlKey', 'pick up');
        scene.add(controlKey);
        interactiveObjects.push(controlKey);

        // Spotlight on key
        const keyLight = new THREE.PointLight(0xFFD700, 1, 5);
        keyLight.position.set(5, 2, -5);
        scene.add(keyLight);
    }

    // Door to Scene 3 (requires control key)
    const door = createDoor(0, 1.5, 11, 'controlKey', 'Control Key', 'scene3');
    scene.add(door);
    interactiveObjects.push(door);

    // Soft emissive lighting
    const emissiveLight = new THREE.HemisphereLight(0x0066FF, 0x000000, 0.3);
    scene.add(emissiveLight);
}

// ===============================
// SCENE 3 - WATER LOOP CHAMBER
// ===============================
function buildScene3() {
    updateSceneTitle('Water Loop Chamber');
    sceneBounds = { minX: -18, maxX: 18, minZ: -18, maxZ: 18 };

    // Dark fog
    scene.fog = new THREE.Fog(0x000a0a, 8, 40);

    // Wet floor
    const floorGeometry = new THREE.PlaneGeometry(36, 36);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        roughness: 0.3,
        metalness: 0.7
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Water puddles (flat geometry with animated UV)
    for (let i = 0; i < 5; i++) {
        const puddleGeometry = new THREE.CircleGeometry(2 + Math.random() * 2, 32);
        const puddleMaterial = new THREE.MeshStandardMaterial({
            color: 0x001a1a,
            roughness: 0.1,
            metalness: 0.9,
            transparent: true,
            opacity: 0.8
        });
        const puddle = new THREE.Mesh(puddleGeometry, puddleMaterial);
        puddle.rotation.x = -Math.PI / 2;
        puddle.position.set(
            (Math.random() - 0.5) * 30,
            0.01,
            (Math.random() - 0.5) * 30
        );
        scene.add(puddle);
        animatedObjects.push({ obj: puddle, type: 'puddle' });
    }

    // Walls
    createWall(0, 2.5, -18, 36, 5, 0.5, 0x1a1a1a);
    createWall(0, 2.5, 18, 36, 5, 0.5, 0x1a1a1a);
    createWall(-18, 2.5, 0, 0.5, 5, 36, 0x1a1a1a);
    createWall(18, 2.5, 0, 0.5, 5, 36, 0x1a1a1a);

    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(36, 36);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 5;
    scene.add(ceiling);

    // Central vortex portal (loop ending)
    const vortexGeometry = new THREE.CylinderGeometry(3, 3, 0.5, 32);
    const vortexMaterial = new THREE.MeshStandardMaterial({
        color: 0x00FFFF,
        emissive: 0x00FFFF,
        emissiveIntensity: 1.0,
        transparent: true,
        opacity: 0.7
    });
    const vortex = new THREE.Mesh(vortexGeometry, vortexMaterial);
    vortex.position.set(0, 0.25, 0);
    vortex.userData = { type: 'vortex', action: 'enter vortex' };
    scene.add(vortex);
    interactiveObjects.push(vortex);
    animatedObjects.push({ obj: vortex, type: 'vortex' });

    // Vortex light
    const vortexLight = new THREE.PointLight(0x00FFFF, 2, 15);
    vortexLight.position.set(0, 1, 0);
    scene.add(vortexLight);

    // Door back to Scene 2 (behind player)
    const doorBack = createDoor(0, 2, 17, null, null, 'scene2');
    doorBack.userData.action = 'go back';
    scene.add(doorBack);
    interactiveObjects.push(doorBack);

    // Hidden side door to ending (true exit)
    const hiddenDoor = createDoor(17, 2, 0, null, null, 'ending');
    hiddenDoor.userData.action = 'enter hidden door';
    hiddenDoor.material.color.setHex(0x00FF00);
    hiddenDoor.material.emissive.setHex(0x00FF00);
    hiddenDoor.material.emissiveIntensity = 0.3;
    scene.add(hiddenDoor);
    interactiveObjects.push(hiddenDoor);
}

// ===============================
// ENDING ROOM
// ===============================
function buildEndingRoom() {
    updateSceneTitle('Exit Chamber');
    sceneBounds = { minX: -8, maxX: 8, minZ: -8, maxZ: 8 };

    // Clean white room
    scene.fog = new THREE.Fog(0xffffff, 10, 30);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(16, 16);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        roughness: 0.5
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls
    createWall(0, 2.5, -8, 16, 5, 0.5, 0xffffff);
    createWall(0, 2.5, 8, 16, 5, 0.5, 0xffffff);
    createWall(-8, 2.5, 0, 0.5, 5, 16, 0xffffff);
    createWall(8, 2.5, 0, 0.5, 5, 16, 0xffffff);

    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(16, 16);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 5;
    scene.add(ceiling);

    // Text: "You Found the True Exit"
    // (Using a simple box as text placeholder)
    const textBoard = new THREE.BoxGeometry(6, 1, 0.2);
    const textMaterial = new THREE.MeshStandardMaterial({
        color: 0x4CAF50,
        emissive: 0x4CAF50,
        emissiveIntensity: 0.5
    });
    const textMesh = new THREE.Mesh(textBoard, textMaterial);
    textMesh.position.set(0, 3, -7);
    scene.add(textMesh);

    showMessage('You Found the True Exit!');

    // End door
    const endDoor = new THREE.BoxGeometry(2, 3, 0.3);
    const endDoorMaterial = new THREE.MeshStandardMaterial({
        color: 0x4CAF50,
        emissive: 0x4CAF50,
        emissiveIntensity: 0.3
    });
    const endDoorMesh = new THREE.Mesh(endDoor, endDoorMaterial);
    endDoorMesh.position.set(0, 1.5, 7);
    endDoorMesh.userData = { type: 'endDoor', action: 'finish game' };
    scene.add(endDoorMesh);
    interactiveObjects.push(endDoorMesh);

    // Bright ambient light
    const brightLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(brightLight);
}

// ===============================
// HELPER FUNCTIONS
// ===============================
function createWall(x, y, z, width, height, depth, color) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.8
    });
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    return wall;
}

function createPickupItem(x, y, z, color, id, action) {
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.2);
    const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.5
    });
    const item = new THREE.Mesh(geometry, material);
    item.position.set(x, y, z);
    item.castShadow = true;
    item.userData = { type: 'pickup', id: id, action: action };
    animatedObjects.push({ obj: item, type: 'float' });
    return item;
}

function createDoor(x, y, z, requiresItem, requiresName, nextScene) {
    const geometry = new THREE.BoxGeometry(3, 4, 0.5);
    const material = new THREE.MeshStandardMaterial({
        color: 0x0088FF,
        transparent: true,
        opacity: 0.6,
        emissive: 0x0088FF,
        emissiveIntensity: 0.3
    });
    const door = new THREE.Mesh(geometry, material);
    door.position.set(x, y, z);
    door.castShadow = true;
    door.userData = {
        type: 'door',
        requires: requiresItem,
        requiresName: requiresName,
        nextScene: nextScene,
        action: 'open door'
    };
    return door;
}

function createFlashingLight(x, y, z, color) {
    const lightGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const lightMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 1.0
    });
    const lightMesh = new THREE.Mesh(lightGeometry, lightMaterial);
    lightMesh.position.set(x, y, z);
    scene.add(lightMesh);

    const pointLight = new THREE.PointLight(color, 1, 10);
    pointLight.position.set(x, y, z);
    scene.add(pointLight);

    flashingLights.push({
        mesh: lightMesh,
        light: pointLight,
        color: color
    });
}

// ===============================
// PLAYER MOVEMENT
// ===============================
function updatePlayer(delta) {
    if (!controls.isLocked) return;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * PLAYER_SPEED * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * PLAYER_SPEED * delta;

    const prevPosition = controls.getObject().position.clone();
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    // Boundary checking
    const pos = controls.getObject().position;
    if (pos.x < sceneBounds.minX || pos.x > sceneBounds.maxX ||
        pos.z < sceneBounds.minZ || pos.z > sceneBounds.maxZ) {
        controls.getObject().position.copy(prevPosition);
    }

    // Keep player at correct height
    controls.getObject().position.y = PLAYER_HEIGHT;
}

// ===============================
// ANIMATION LOOP
// ===============================
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Update player movement
    if (gameStarted) {
        updatePlayer(delta);
    }

    // Animate flashing lights
    flashingLights.forEach(light => {
        const intensity = Math.sin(elapsed * 3) * 0.5 + 0.5;
        light.mesh.material.emissiveIntensity = intensity;
        light.light.intensity = intensity * 2;
    });

    // Animate objects
    animatedObjects.forEach(item => {
        if (item.type === 'float') {
            item.obj.position.y += Math.sin(elapsed * 2) * 0.001;
            item.obj.rotation.y += 0.01;
        } else if (item.type === 'vortex') {
            item.obj.rotation.y += 0.02;
            item.obj.material.emissiveIntensity = Math.sin(elapsed * 2) * 0.3 + 0.7;
        } else if (item.type === 'puddle') {
            item.obj.material.opacity = Math.sin(elapsed + item.obj.position.x) * 0.1 + 0.7;
        }
    });

    renderer.render(scene, camera);
}

// ===============================
// START GAME
// ===============================
init();
