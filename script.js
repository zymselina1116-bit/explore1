import * as THREE from 'https://esm.sh/three@0.160.0';

// ====================================================================
// TEXTURE URLS
// ====================================================================
const TEXTURES = {
    scene1_floor: './Screenshot 2025-11-16 at 22.51.42.png',
    scene1_wall: './Screenshot 2025-11-16 at 22.53.11.png',
    scene1_door: './Screenshot 2025-11-16 at 22.54.35.png',
    scene1_exit: './Screenshot 2025-11-16 at 22.55.14.png',
    scene2_floor: './Screenshot 2025-11-16 at 22.56.00.png',
    keyBoard: './Screenshot 2025-11-16 at 23.31.20.png',
    accessCard: './card-new.png',
    key: './key-new.png',
    cardReader: './card-reader.png',
    // Scene 2 textures
    woodenDoor: './870c5435ceffda4aa972afb3244c2eca-removebg-preview.png',
    creatureSketch: './Screenshot 2025-11-17 at 14.12.36.png',
    goldenKey: './70dc331664376a64a8050baa7c7744a6-removebg-preview.png',
    profileCard: './Screenshot 2025-11-17 at 14.17.01.png',
    mapItem: './Screenshot 2025-11-17 at 14.18.31.png',
    furniture: './Screenshot 2025-11-17 at 14.38.31.png',
    keyBoard2: './Screenshot 2025-11-17 at 14.39.55.png',
    drawer: './Screenshot 2025-11-17 at 22.38.36.png'
};

// ====================================================================
// GAME STATE
// ====================================================================
const gameState = {
    currentScene: 'industrialHall',
    hasAccessCard: false,
    doorUnlocked: false,
    enteredNextRoom: false,
    inventory: new Set(),
    // Scene 2 state
    evidenceCollected: new Set(), // tracks: 'creature', 'profile', 'map'
    hasGoldenKey: false,
    woodenDoorUnlocked: false,
    deskDrawerOpen: false,
};

const scenes = {
    industrialHall: {
        objects: [],
        cleanup: null,
    },
    officeFloor: {
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

// Mouse drag camera controls
let isMouseDown = false;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let mouseDownPosition = { x: 0, y: 0 };
let cameraRotation = { yaw: 0, pitch: 0 };

// Movement
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const PLAYER_SPEED = 25.0;
const PLAYER_HEIGHT = 2.2;

// Flashlight
let flashlight = null; // Flashlight that follows camera

// Door animation
let doorAnimating = false;
let doorPosition = 0;
const DOOR_TARGET_POSITION = 5;
const DOOR_ANIMATION_SPEED = 8.0; // Faster animation

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
    console.log('Initializing game...');

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a1a1a);
    scene.fog = new THREE.FogExp2(0x2a1515, 0.012);
    console.log('Scene created');

    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, PLAYER_HEIGHT, 0);
    console.log('Camera created at:', camera.position);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = false; // Disabled for GPU performance
    document.body.appendChild(renderer.domElement);
    console.log('Renderer added to DOM');

    // Camera container for rotation
    controls = {
        getObject: () => camera,
        isLocked: true
    };

    // Raycaster
    raycaster = new THREE.Raycaster();
    raycaster.far = 20; // Increased range to detect objects across the room

    // Clock
    clock = new THREE.Clock();

    // Event listeners
    setupEventListeners();

    // Build both scenes (connected)
    console.log('Building scenes...');
    await buildIndustrialHallScene();
    await buildOfficeFloorScene();
    console.log('Both scenes built successfully');

    // Debug: Print all meshes in the scene
    console.log('\n========== SCENE MESH DEBUG ==========');
    scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            const name = object.name || 'Unnamed';
            const geomType = object.geometry.type;
            const pos = object.position;
            const mat = object.material;

            let materialInfo = '';
            if (mat.map) {
                materialInfo = `Textured (${mat.map ? 'has texture' : 'no texture'})`;
            } else {
                materialInfo = `Plain color: ${mat.color ? '#' + mat.color.getHexString() : 'none'}`;
            }

            console.log(`Mesh: "${name}"`);
            console.log(`  Geometry: ${geomType}`);
            console.log(`  Position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
            console.log(`  Material: ${materialInfo}`);
            console.log(`  Has texture map: ${!!mat.map}`);
            console.log('---');
        }
    });
    console.log('========== END MESH DEBUG ==========\n');

    // Start animation
    console.log('Starting animation loop');
    animate();
}

// ====================================================================
// EVENT LISTENERS
// ====================================================================
function setupEventListeners() {
    // Keyboard
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Mouse drag for camera rotation
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('click', onMouseClick);

    // Window resize
    window.addEventListener('resize', onWindowResize);

    // Backpack toggle functionality
    const backpackIcon = document.getElementById('backpack-icon');
    const backpackPanel = document.getElementById('backpack-panel');

    if (backpackIcon && backpackPanel) {
        backpackIcon.addEventListener('click', () => {
            if (backpackPanel.style.display === 'none') {
                backpackPanel.style.display = 'block';
            } else {
                backpackPanel.style.display = 'none';
            }
        });
    }
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

function onMouseDown(event) {
    if (event.button === 0) { // Left mouse button
        isMouseDown = true;
        isDragging = false; // Reset dragging
        previousMousePosition = { x: event.clientX, y: event.clientY };
        mouseDownPosition = { x: event.clientX, y: event.clientY };
    }
}

function onMouseMove(event) {
    if (isMouseDown) {
        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;

        // Check if mouse moved enough to be considered dragging
        const dragDistance = Math.sqrt(
            Math.pow(event.clientX - mouseDownPosition.x, 2) +
            Math.pow(event.clientY - mouseDownPosition.y, 2)
        );

        if (dragDistance > 3) { // 3 pixels threshold
            isDragging = true;
        }

        if (isDragging) {
            cameraRotation.yaw -= deltaX * 0.002;
            cameraRotation.pitch -= deltaY * 0.002;

            // Clamp pitch to prevent over-rotation
            cameraRotation.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraRotation.pitch));
        }

        previousMousePosition = { x: event.clientX, y: event.clientY };
    }

    // Update hover object (only when not dragging)
    if (!isDragging && controls.isLocked) {
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(
            interactiveObjects.map(obj => obj.mesh)
        );

        if (intersects.length > 0) {
            const intersectedMesh = intersects[0].object;
            const interactiveObj = interactiveObjects.find(
                obj => obj.mesh === intersectedMesh
            );

            if (interactiveObj) {
                currentHoveredObject = interactiveObj;
            } else {
                currentHoveredObject = null;
            }
        } else {
            currentHoveredObject = null;
        }
    }
}

function onMouseUp(event) {
    if (event.button === 0) {
        isMouseDown = false;
        isDragging = false;
    }
}

function onMouseClick(event) {
    if (isDragging) return; // Don't interact if we were dragging

    // Perform raycasting to find what we're clicking on
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(
        interactiveObjects.map(obj => obj.mesh)
    );

    if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object;
        const interactiveObj = interactiveObjects.find(
            obj => obj.mesh === intersectedMesh
        );

        if (interactiveObj && interactiveObj.onClick) {
            console.log('Clicked on:', interactiveObj.id);
            interactiveObj.onClick();
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ====================================================================
// MESSAGE DISPLAY
// ====================================================================
function showMessage(text) {
    const messageDiv = document.getElementById('message-display');
    if (messageDiv) {
        messageDiv.textContent = text;
        messageDiv.style.display = 'block';

        // Hide message after 2 seconds
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 2000);
    }
}

// ====================================================================
// BUILD INDUSTRIAL HALL SCENE
// ====================================================================
async function buildIndustrialHallScene() {
    // Load textures
    const floorTexture = await loadTexture(TEXTURES.scene1_floor, 4, 4);
    const wallTexture = await loadTexture(TEXTURES.scene1_wall, 2, 2);
    const doorTexture = await loadTexture(TEXTURES.scene1_door, 1, 1);
    const exitTexture = await loadTexture(TEXTURES.scene1_exit, 1, 1);
    const keyBoardTexture = await loadTexture(TEXTURES.keyBoard, 1, 1);
    const accessCardTexture = await loadTexture(TEXTURES.accessCard, 1, 1);
    const keyTexture = await loadTexture(TEXTURES.key, 1, 1);
    const woodenDoorTexture = await loadTexture(TEXTURES.woodenDoor, 1, 1);
    const goldenKeyTexture = await loadTexture(TEXTURES.goldenKey, 1, 1);
    const cardReaderTexture = await loadTexture(TEXTURES.cardReader, 1, 1);
    console.log('Textures loaded - Floor:', !!floorTexture, 'Wall:', !!wallTexture, 'Door:', !!doorTexture, 'Exit:', !!exitTexture, 'KeyBoard:', !!keyBoardTexture, 'Card:', !!accessCardTexture, 'Key:', !!keyTexture, 'CardReader:', !!cardReaderTexture);

    // Floor (extended beyond door for walkway)
    const roomSize = 25;
    const floorGeometry = new THREE.PlaneGeometry(40, 40); // Extended floor
    const floorMaterial = new THREE.MeshStandardMaterial({
        map: floorTexture,
        color: floorTexture ? 0xffffff : 0x444444,
        roughness: 0.8,
        metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.name = 'Floor';
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Walls (with texture)
    const wallHeight = 6;
    const halfRoom = roomSize / 2;
    const wallMaterial = new THREE.MeshStandardMaterial({
        map: wallTexture,
        color: wallTexture ? 0xffffff : 0xff0000, // Red if texture fails to load
        metalness: 0.6,
        roughness: 0.4,
        side: THREE.DoubleSide, // Render both sides
    });

    // Back wall
    const backWall = new THREE.Mesh(
        new THREE.PlaneGeometry(roomSize, wallHeight),
        wallMaterial
    );
    backWall.name = 'BackWall';
    backWall.position.set(0, wallHeight / 2, -halfRoom);
    scene.add(backWall);

    // Front wall (with door gap) - separates Scene 1 and Scene 2
    // Door is 4 units wide, centered at x=0 (spans -2 to 2)
    // Left wall: from -12.5 to -2 = 10.5 units
    // Right wall: from 2 to 12.5 = 10.5 units
    const frontWallLeft = new THREE.Mesh(
        new THREE.PlaneGeometry(10.5, wallHeight),
        wallMaterial
    );
    frontWallLeft.name = 'FrontWallLeft';
    frontWallLeft.position.set(-7.25, wallHeight / 2, halfRoom);
    frontWallLeft.rotation.y = Math.PI;
    scene.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(
        new THREE.PlaneGeometry(10.5, wallHeight),
        wallMaterial
    );
    frontWallRight.name = 'FrontWallRight';
    frontWallRight.position.set(7.25, wallHeight / 2, halfRoom);
    frontWallRight.rotation.y = Math.PI;
    scene.add(frontWallRight);

    // Left wall
    const leftWall = new THREE.Mesh(
        new THREE.PlaneGeometry(roomSize, wallHeight),
        wallMaterial
    );
    leftWall.name = 'LeftWall';
    leftWall.position.set(-halfRoom, wallHeight / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(
        new THREE.PlaneGeometry(roomSize, wallHeight),
        wallMaterial
    );
    rightWall.name = 'RightWall';
    rightWall.position.set(halfRoom, wallHeight / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);

    // Ceiling (with floor texture)
    const ceilingGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        map: floorTexture,
        color: floorTexture ? 0xffffff : 0xff0000,
        roughness: 0.8,
        metalness: 0.2,
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.name = 'Ceiling';
    ceiling.position.y = wallHeight;
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);

    // Single ceiling light (reduced for performance)
    const light = new THREE.PointLight(0xffddcc, 2.5, 25);
    light.position.set(0, wallHeight - 1, 0);
    light.castShadow = false; // Disable shadows for performance
    scene.add(light);

    // Ambient light (with red tint, much brighter)
    const ambientLight = new THREE.AmbientLight(0xff4444, 1.5);
    scene.add(ambientLight);

    // Two large red ceiling warning lights with gradient (much brighter)
    const mainRedLight1 = new THREE.SpotLight(0xff0000, 15, 20, Math.PI / 4, 0.5, 2);
    mainRedLight1.position.set(-6, wallHeight - 0.5, -4);
    mainRedLight1.target.position.set(-6, 0, -4);
    scene.add(mainRedLight1);
    scene.add(mainRedLight1.target);

    // Shared geometry and material for large red lights (optimized, brighter)
    const largeRedGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.3, 24);
    const largeRedMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 3.5,
    });

    // Visual mesh for first large red light
    const largeRedMesh1 = new THREE.Mesh(largeRedGeometry, largeRedMaterial);
    largeRedMesh1.position.set(-6, wallHeight - 0.5, -4);
    scene.add(largeRedMesh1);

    const mainRedLight2 = new THREE.SpotLight(0xff0000, 15, 20, Math.PI / 4, 0.5, 2);
    mainRedLight2.position.set(6, wallHeight - 0.5, 4);
    mainRedLight2.target.position.set(6, 0, 4);
    scene.add(mainRedLight2);
    scene.add(mainRedLight2.target);

    // Visual mesh for second large red light
    const largeRedMesh2 = new THREE.Mesh(largeRedGeometry, largeRedMaterial);
    largeRedMesh2.position.set(6, wallHeight - 0.5, 4);
    scene.add(largeRedMesh2);

    // Store for animation
    window.mainRedLights = [
        { light: mainRedLight1, mesh: largeRedMesh1 },
        { light: mainRedLight2, mesh: largeRedMesh2 }
    ];

    // Main door (with texture, flush with wall)
    const doorGeometry = new THREE.BoxGeometry(4, 5, 0.2);
    const doorMaterial = new THREE.MeshStandardMaterial({
        map: doorTexture,
        color: doorTexture ? 0xffffff : 0xff0000, // Red if texture fails
        metalness: 0.3,
        roughness: 0.4,
        transparent: false,
        opacity: 1.0,
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.name = 'Door';
    door.position.set(0, 2.5, halfRoom); // Flush with wall, no gap
    scene.add(door);

    // Store door reference for animation
    window.gameDoor = door;

    // Interactive door - shows message if no card
    const doorInteractive = {
        mesh: door,
        type: 'door',
        id: 'scene1_main_door',
        hintText: 'Click to open door',
        onClick: () => {
            if (!gameState.hasAccessCard) {
                showMessage('Find the key');
            }
        }
    };
    interactiveObjects.push(doorInteractive);

    // Exit sign (with texture)
    const exitSign = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.5, 0.1),
        new THREE.MeshStandardMaterial({
            map: exitTexture,
            color: exitTexture ? 0xffffff : 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.8,
        })
    );
    exitSign.position.set(0, 5.5, halfRoom - 1);
    scene.add(exitSign);

    // Metal key board on wall (with texture)
    const keyBoard = new THREE.Mesh(
        new THREE.BoxGeometry(4, 3, 0.15),
        new THREE.MeshStandardMaterial({
            map: keyBoardTexture,
            color: keyBoardTexture ? 0xffffff : 0xff0000, // Red if texture fails
            metalness: 0.3,
            roughness: 0.5,
        })
    );
    keyBoard.name = 'KeyBoard';
    keyBoard.position.set(-8, 2.5, halfRoom - 0.75);
    scene.add(keyBoard);

    // Store keyBoard reference
    window.keyBoardMesh = keyBoard;

    // Spotlight lamp just above key board (very bright yellow light, focused)
    const keyBoardSpotlight = new THREE.SpotLight(0xffff88, 15, 8, Math.PI / 7, 0.5, 2);
    keyBoardSpotlight.position.set(-8, 4.2, halfRoom - 1.2);
    keyBoardSpotlight.target.position.set(-8, 2.5, halfRoom - 0.75);
    scene.add(keyBoardSpotlight);
    scene.add(keyBoardSpotlight.target);

    // Flashlight that follows camera (brighter and more visible)
    flashlight = new THREE.SpotLight(0xffffcc, 8, 20, Math.PI / 7, 0.6, 1.2);
    flashlight.position.copy(camera.position);
    scene.add(flashlight);

    const flashlightTarget = new THREE.Object3D();
    scene.add(flashlightTarget);
    flashlight.target = flashlightTarget;

    // Lamp fixture removed - no grey objects allowed

    // Decorative keys on board - facing the room (with texture)
    const keyPositions = [
        [-9.2, 3.2],
        [-8.6, 3.5],
        [-8.0, 3.3],
        [-7.4, 3.6],
        [-6.8, 3.4],
        [-9.3, 2.5],
        [-8.2, 2.6],
        [-7.1, 2.4],
        [-9.5, 1.8],
        [-8.5, 1.7],
        [-7.5, 1.9],
        [-6.7, 1.6],
    ];

    // Shared key material with texture
    const keyMaterial = new THREE.MeshStandardMaterial({
        map: keyTexture,
        transparent: true,
        metalness: 0.3,
        roughness: 0.5,
    });

    // Shared key geometry
    const keyGeometry = new THREE.PlaneGeometry(0.2, 0.5);

    keyPositions.forEach((pos, i) => {
        const key = new THREE.Mesh(keyGeometry, keyMaterial);
        key.position.set(pos[0], pos[1], halfRoom - 0.85); // In front of board, facing room
        key.rotation.y = Math.PI; // Face the room
        scene.add(key);
    });

    // Access card (interactive with texture) - positioned IN FRONT of key board
    const cardGeometry = new THREE.PlaneGeometry(0.6, 0.9);
    const cardMaterial = new THREE.MeshStandardMaterial({
        map: accessCardTexture,
        transparent: true,
        metalness: 0.1,
        roughness: 0.6,
    });
    const accessCard = new THREE.Mesh(cardGeometry, cardMaterial);
    accessCard.name = 'AccessCard';
    accessCard.position.set(-8, 2.5, halfRoom - 0.85); // In front of board
    accessCard.rotation.y = Math.PI; // Rotate 180 degrees to face the room
    scene.add(accessCard);

    // Store card reference
    window.accessCardMesh = accessCard;

    // Interactive card object - single click to pick up
    const cardInteractive = {
        mesh: accessCard,
        type: 'card',
        id: 'scene1_card_access',
        hintText: 'Click to pick up access card',
        onClick: () => {
            console.log('Access card clicked!');
            // Pick up card with lift animation
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
                    interactiveObjects = interactiveObjects.filter(obj => obj.id !== 'scene1_card_access');
                    console.log('Access card picked up! gameState.hasAccessCard:', gameState.hasAccessCard);
                } else {
                    accessCard.position.z = startZ + liftProgress * 0.5;
                    const scale = startScale + liftProgress * 0.2;
                    accessCard.scale.set(scale, scale, scale);
                }
            }, 20);
        }
    };
    interactiveObjects.push(cardInteractive);

    // Card reader near door (with texture, flush with wall)
    const cardReaderMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.7),
        new THREE.MeshStandardMaterial({
            map: cardReaderTexture,
            transparent: true,
            metalness: 0.2,
            roughness: 0.6,
        })
    );
    cardReaderMesh.name = 'CardReader';
    cardReaderMesh.position.set(3, 1.5, halfRoom); // Flush with wall, no gap
    cardReaderMesh.rotation.y = Math.PI; // Face the room
    scene.add(cardReaderMesh);

    // Interactive card reader
    const cardReaderInteractive = {
        mesh: cardReaderMesh,
        type: 'cardReader',
        id: 'scene1_card_reader',
        hintText: 'Click to use card reader',
        onClick: () => {
            console.log('Card reader clicked! Has card:', gameState.hasAccessCard, 'Door unlocked:', gameState.doorUnlocked);
            if (!gameState.hasAccessCard) {
                showMessage('You need an access card');
                return;
            }
            if (!gameState.doorUnlocked) {
                gameState.doorUnlocked = true;
                // Start door opening animation
                doorAnimating = true;
                doorPosition = 0; // Reset door position
                showMessage('Door unlocked - Opening!');
                console.log('Door unlocked! doorAnimating:', doorAnimating, 'gameDoor:', !!window.gameDoor, 'doorPosition:', doorPosition);
            } else {
                showMessage('Door already open');
                console.log('Door already unlocked');
            }
        }
    };
    interactiveObjects.push(cardReaderInteractive);

    // Red alarm lights (reduced for performance, adjusted for smaller room)
    const alarmPositions = [
        [-11, 5.5, -11],
        [11, 5.5, -11],
        [-11, 5.5, 11],
        [11, 5.5, 11],
    ];

    // Shared material for all alarm lights (reduces GPU load, brighter)
    const alarmMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 3.0,
    });

    alarmPositions.forEach(pos => {
        const alarmMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 16, 16), // Reduced geometry
            alarmMaterial // Reuse same material
        );
        alarmMesh.position.set(...pos);
        scene.add(alarmMesh);

        const alarmLight = new THREE.PointLight(0xff0000, 5, 18);
        alarmLight.position.set(...pos);
        alarmLight.castShadow = false; // Disable shadows for performance
        scene.add(alarmLight);

        alarmLights.push({ mesh: alarmMesh, light: alarmLight });
    });

    // Wooden door on back wall (opposite to Scene 2 entrance)
    const woodenDoor = new THREE.Mesh(
        new THREE.BoxGeometry(4, 5, 0.2),
        new THREE.MeshStandardMaterial({
            map: woodenDoorTexture,
            transparent: true,
            color: woodenDoorTexture ? 0xffffff : 0xff0000,
        })
    );
    woodenDoor.name = 'WoodenDoor';
    woodenDoor.position.set(0, 2.5, -halfRoom + 0.1); // Flush with back wall
    scene.add(woodenDoor);

    // Golden key next to wooden door on back wall
    const goldenKey = new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, 0.8),
        new THREE.MeshStandardMaterial({
            map: goldenKeyTexture,
            transparent: true,
            emissive: 0xffaa00,
            emissiveIntensity: 0.5,
        })
    );
    goldenKey.name = 'GoldenKey';
    goldenKey.position.set(-6, 2.5, -halfRoom + 0.2);
    scene.add(goldenKey);

    // Golden key interactive (double-click to collect after evidence)
    let lastGoldenKeyClickTime = 0;
    const goldenKeyInteractive = {
        mesh: goldenKey,
        type: 'goldenKey',
        id: 'golden_key',
        hintText: 'Double-click to take golden key',
        onClick: () => {
            const now = Date.now();
            const isDoubleClick = (now - lastGoldenKeyClickTime) < 300;
            lastGoldenKeyClickTime = now;

            if (!isDoubleClick) {
                console.log('Single click on golden key (need double-click)');
                return;
            }

            if (gameState.evidenceCollected.size < 3) {
                showMessage('Collect all evidence first');
                console.log('Need all 3 evidence items first');
                return;
            }

            console.log('Golden key collected!');
            gameState.hasGoldenKey = true;
            scene.remove(goldenKey);
            interactiveObjects = interactiveObjects.filter(obj => obj.id !== 'golden_key');
            showMessage('Golden key obtained');
        }
    };
    interactiveObjects.push(goldenKeyInteractive);

    // Wooden door interactive (opens with golden key)
    const woodenDoorInteractive = {
        mesh: woodenDoor,
        type: 'woodenDoor',
        id: 'wooden_door',
        hintText: 'Click to unlock door',
        onClick: () => {
            if (!gameState.hasGoldenKey) {
                showMessage('Door is locked');
                console.log('Need golden key to unlock wooden door');
                return;
            }

            if (!gameState.woodenDoorUnlocked) {
                gameState.woodenDoorUnlocked = true;
                showMessage('Door unlocked');
                console.log('Wooden door unlocked!');
                // Animate door opening - rotate
                const doorOpenInterval = setInterval(() => {
                    woodenDoor.rotation.y -= 0.05; // Rotate door open
                    if (woodenDoor.rotation.y <= -Math.PI / 2) { // Open 90 degrees
                        woodenDoor.rotation.y = -Math.PI / 2;
                        clearInterval(doorOpenInterval);
                    }
                }, 16);
            }
        }
    };
    interactiveObjects.push(woodenDoorInteractive);

    console.log('Industrial Hall scene built');
}

// ====================================================================
// BUILD OFFICE FLOOR SCENE (SCENE 2)
// ====================================================================
async function buildOfficeFloorScene() {
    // Load textures
    const floorTexture = await loadTexture(TEXTURES.scene2_floor, 5, 5);
    const wallTexture = await loadTexture(TEXTURES.scene1_wall, 3, 3);
    const furnitureTexture = await loadTexture(TEXTURES.furniture, 1, 1);
    const keyBoard2Texture = await loadTexture(TEXTURES.keyBoard2, 1, 1);
    const woodenDoorTexture = await loadTexture(TEXTURES.woodenDoor, 1, 1);
    const goldenKeyTexture = await loadTexture(TEXTURES.goldenKey, 1, 1);
    const keyTexture = await loadTexture(TEXTURES.key, 1, 1);
    const creatureTexture = await loadTexture(TEXTURES.creatureSketch, 1, 1);
    const profileTexture = await loadTexture(TEXTURES.profileCard, 1, 1);
    const mapTexture = await loadTexture(TEXTURES.mapItem, 1, 1);
    const drawerTexture = await loadTexture(TEXTURES.drawer, 1, 1);

    console.log('Scene 2 textures loaded');

    // Room size (same as Scene 1 for consistency)
    const roomSize = 25;
    const roomWidth = roomSize;
    const roomDepth = roomSize;
    const wallHeight = 6;
    const halfRoom = roomSize / 2;
    const halfWidth = halfRoom;
    const halfDepth = halfRoom;

    // Scene 2 offset - position it right behind Scene 1
    // Scene 1 ends at z=12.5, Scene 2 back wall should be at z=12.5
    // Scene 2 center = 12.5 + halfDepth = 25
    const scene2OffsetZ = 12.5 + halfDepth;

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
    const floorMaterial = new THREE.MeshStandardMaterial({
        map: floorTexture,
        color: floorTexture ? 0xffffff : 0xff0000,
        roughness: 0.8,
        metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.name = 'Scene2_Floor';
    floor.position.set(0, 0, scene2OffsetZ);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Wall material
    const wallMaterial = new THREE.MeshStandardMaterial({
        map: wallTexture,
        color: wallTexture ? 0xffffff : 0xff0000,
        metalness: 0.6,
        roughness: 0.4,
        side: THREE.DoubleSide,
    });

    // Back wall removed - connects to Scene 1 door

    // Front wall (with wooden door gap)
    // Wooden door is 4 units wide, centered at x=0 (spans -2 to 2)
    // Left wall: from -12.5 to -2 = 10.5 units
    // Right wall: from 2 to 12.5 = 10.5 units
    const frontWallLeft = new THREE.Mesh(
        new THREE.PlaneGeometry(10.5, wallHeight),
        wallMaterial
    );
    frontWallLeft.name = 'Scene2_FrontWallLeft';
    frontWallLeft.position.set(-7.25, wallHeight / 2, scene2OffsetZ + halfDepth);
    frontWallLeft.rotation.y = Math.PI;
    scene.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(
        new THREE.PlaneGeometry(10.5, wallHeight),
        wallMaterial
    );
    frontWallRight.name = 'Scene2_FrontWallRight';
    frontWallRight.position.set(7.25, wallHeight / 2, scene2OffsetZ + halfDepth);
    frontWallRight.rotation.y = Math.PI;
    scene.add(frontWallRight);

    // Left wall
    const leftWall = new THREE.Mesh(
        new THREE.PlaneGeometry(roomDepth, wallHeight),
        wallMaterial
    );
    leftWall.name = 'Scene2_LeftWall';
    leftWall.position.set(-halfWidth, wallHeight / 2, scene2OffsetZ);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(
        new THREE.PlaneGeometry(roomDepth, wallHeight),
        wallMaterial
    );
    rightWall.name = 'Scene2_RightWall';
    rightWall.position.set(halfWidth, wallHeight / 2, scene2OffsetZ);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);

    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        map: floorTexture,
        color: floorTexture ? 0xffffff : 0xff0000,
        roughness: 0.8,
        metalness: 0.2,
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.name = 'Scene2_Ceiling';
    ceiling.position.set(0, wallHeight, scene2OffsetZ);
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);

    // Lighting: Cool blue laboratory environment (futuristic industrial)
    const ambientLight = new THREE.AmbientLight(0x3366ff, 0.5); // Cool blue ambient
    scene.add(ambientLight);

    const mainLight = new THREE.PointLight(0x4488ff, 2.5, 50); // Blue main light
    mainLight.position.set(0, wallHeight - 1, scene2OffsetZ);
    scene.add(mainLight);

    // Blue ceiling lights for full coverage
    const blueCeilingLights = [
        [-10, wallHeight - 0.5, scene2OffsetZ - 10],
        [-8, wallHeight - 0.5, scene2OffsetZ - 5],
        [-5, wallHeight - 0.5, scene2OffsetZ - 8],
        [0, wallHeight - 0.5, scene2OffsetZ - 10],
        [5, wallHeight - 0.5, scene2OffsetZ - 5],
        [8, wallHeight - 0.5, scene2OffsetZ - 8],
        [10, wallHeight - 0.5, scene2OffsetZ - 10],
        [-10, wallHeight - 0.5, scene2OffsetZ],
        [-5, wallHeight - 0.5, scene2OffsetZ + 2],
        [0, wallHeight - 0.5, scene2OffsetZ],
        [5, wallHeight - 0.5, scene2OffsetZ - 2],
        [10, wallHeight - 0.5, scene2OffsetZ],
        [-10, wallHeight - 0.5, scene2OffsetZ + 10],
        [-5, wallHeight - 0.5, scene2OffsetZ + 8],
        [0, wallHeight - 0.5, scene2OffsetZ + 10],
        [5, wallHeight - 0.5, scene2OffsetZ + 8],
        [8, wallHeight - 0.5, scene2OffsetZ + 10],
        [10, wallHeight - 0.5, scene2OffsetZ + 10]
    ];

    blueCeilingLights.forEach(pos => {
        const blueCeilingLight = new THREE.PointLight(0x2266ff, 2.0, 16);
        blueCeilingLight.position.set(pos[0], pos[1], pos[2]);
        scene.add(blueCeilingLight);
    });

    // Additional blue area lights
    const blueAreaLights = [
        [-8, 3.5, scene2OffsetZ - 8],
        [8, 3.5, scene2OffsetZ - 8],
        [-8, 3.5, scene2OffsetZ + 8],
        [8, 3.5, scene2OffsetZ + 8],
        [0, 3.5, scene2OffsetZ]
    ];

    blueAreaLights.forEach(pos => {
        const blueLight = new THREE.PointLight(0x3388ff, 1.5, 12);
        blueLight.position.set(pos[0], pos[1], pos[2]);
        scene.add(blueLight);
    });

    // Update flashlight color to match blue theme
    if (flashlight) {
        flashlight.intensity = 6;
        flashlight.color.setHex(0x6699ff); // Cool blue flashlight
    }

    // Materials for laboratory furniture using existing textures
    const labMetalMaterial = new THREE.MeshStandardMaterial({
        map: furnitureTexture,
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.7,
    });

    const wallPanelMaterial = new THREE.MeshStandardMaterial({
        map: wallTexture,
        color: 0xffffff,
        metalness: 0.6,
        roughness: 0.4,
    });

    // Single desk with 5 drawers in center of room
    const deskWidth = 4;
    const deskHeight = 1.5;
    const deskDepth = 2.5;

    // Main desk surface
    const mainDesk = new THREE.Mesh(
        new THREE.BoxGeometry(deskWidth, deskHeight, deskDepth),
        labMetalMaterial
    );
    mainDesk.name = 'MainDesk';
    mainDesk.position.set(0, deskHeight / 2, scene2OffsetZ);
    scene.add(mainDesk);

    // Create 5 drawers - positioned in a row on the desk
    const drawerWidth = 0.7;
    const drawerHeight = 0.4;
    const drawerDepth = 1.5;
    const drawers = [];

    for (let i = 0; i < 5; i++) {
        const drawer = new THREE.Mesh(
            new THREE.BoxGeometry(drawerWidth, drawerHeight, drawerDepth),
            new THREE.MeshStandardMaterial({
                map: drawerTexture,
                color: drawerTexture ? 0xffffff : 0xff0000,
            })
        );
        drawer.name = `Drawer_${i}`;
        // Position drawers side by side
        const xPos = -1.6 + i * 0.8; // Spread across desk width
        drawer.position.set(xPos, 1.0, scene2OffsetZ);
        drawer.userData.drawerIndex = i;
        drawer.userData.isOpen = false;
        drawer.userData.initialZ = scene2OffsetZ;
        scene.add(drawer);
        drawers.push(drawer);
    }

    window.scene2Drawers = drawers;

    // Evidence items: 1 on desk, 2 hidden in drawers
    const evidenceY = deskHeight + 0.1;

    // Creature sketch - on top of desk (visible)
    const creatureSketch = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 1.0),
        new THREE.MeshStandardMaterial({
            map: creatureTexture,
            transparent: true,
        })
    );
    creatureSketch.name = 'CreatureSketch';
    creatureSketch.position.set(0.5, evidenceY, scene2OffsetZ - 0.5);
    creatureSketch.rotation.x = -Math.PI / 2;
    scene.add(creatureSketch);

    // Blue flickering glow for creature sketch on desk
    const creatureGlow = new THREE.PointLight(0x4488ff, 0.8, 6);
    creatureGlow.position.set(0.5, evidenceY + 0.5, scene2OffsetZ - 0.5);
    scene.add(creatureGlow);
    window.creatureGlow = creatureGlow; // Store for flicker animation

    // Profile card - hidden in drawer 1 (index 1)
    const profileCard = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 1.0),
        new THREE.MeshStandardMaterial({
            map: profileTexture,
            transparent: true,
        })
    );
    profileCard.name = 'ProfileCard';
    profileCard.position.set(drawers[1].position.x, 1.3, scene2OffsetZ);
    profileCard.rotation.x = -Math.PI / 2;
    profileCard.visible = false; // Hidden until drawer opens
    scene.add(profileCard);

    // Map item - hidden in drawer 3 (index 3)
    const mapItem = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.9),
        new THREE.MeshStandardMaterial({
            map: mapTexture,
            transparent: true,
        })
    );
    mapItem.name = 'MapItem';
    mapItem.position.set(drawers[3].position.x, 1.3, scene2OffsetZ);
    mapItem.rotation.x = -Math.PI / 2;
    mapItem.visible = false; // Hidden until drawer opens
    scene.add(mapItem);

    // Store which evidence is in which drawer
    drawers[1].userData.evidence = profileCard;
    drawers[3].userData.evidence = mapItem;

    // Interactive evidence items
    const createEvidenceInteractive = (mesh, id, name, textureUrl) => ({
        mesh,
        type: 'evidence',
        id,
        hintText: `Click to collect ${name}`,
        onClick: () => {
            console.log(`Collected evidence: ${id}`);
            gameState.evidenceCollected.add(id);
            scene.remove(mesh);
            interactiveObjects = interactiveObjects.filter(obj => obj.id !== id);
            updateProgressUI();

            // Add to backpack
            addEvidenceToBackpack(name, textureUrl);
            showMessage(`Collected: ${name}`);

            if (gameState.evidenceCollected.size === 3) {
                console.log('All evidence collected! Golden key is now usable');
                showMessage('All evidence collected');
            }
        }
    });

    interactiveObjects.push(createEvidenceInteractive(creatureSketch, 'evidence_creature', 'Creature Sketch', TEXTURES.creatureSketch));
    interactiveObjects.push(createEvidenceInteractive(profileCard, 'evidence_profile', 'Profile Card', TEXTURES.profileCard));
    interactiveObjects.push(createEvidenceInteractive(mapItem, 'evidence_map', 'Map', TEXTURES.mapItem));

    // Drawer interactives (opens to reveal evidence inside)
    drawers.forEach((drawer, index) => {
        const drawerInteractive = {
            mesh: drawer,
            type: 'drawer',
            id: `drawer_${index}`,
            hintText: 'Click to open drawer',
            onClick: () => {
                if (!drawer.userData.isOpen) {
                    drawer.userData.isOpen = true;
                    showMessage(`Drawer ${index + 1} opened`);
                    console.log(`Drawer ${index} opened`);

                    // Animate drawer sliding out
                    const drawerOpenInterval = setInterval(() => {
                        drawer.position.z += 0.05; // Slide drawer forward
                        if (drawer.position.z >= drawer.userData.initialZ + 0.8) {
                            drawer.position.z = drawer.userData.initialZ + 0.8;
                            clearInterval(drawerOpenInterval);

                            // Reveal evidence if this drawer contains one
                            if (drawer.userData.evidence) {
                                drawer.userData.evidence.visible = true;
                                drawer.userData.evidence.position.z = drawer.position.z + 0.1;
                            }
                        }
                    }, 16);
                } else {
                    showMessage('Drawer already open');
                }
            }
        };
        interactiveObjects.push(drawerInteractive);
    });

    // Wooden door moved to Scene 1 (no longer in Scene 2)
    // Golden key moved to Scene 1 (no longer in Scene 2)

    console.log('Scene 2 - Office Floor scene built with single desk and 5 drawers');
}

// ====================================================================
// SCENE TRANSITION
// ====================================================================
function cleanupScene1() {
    // Remove all Scene 1 objects
    const toRemove = [];
    scene.traverse((object) => {
        if (object instanceof THREE.Mesh && !object.name.startsWith('Scene2_')) {
            toRemove.push(object);
        }
    });

    toRemove.forEach(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (obj.material.map) obj.material.map.dispose();
            obj.material.dispose();
        }
        scene.remove(obj);
    });

    // Clear Scene 1 lights
    const lights = scene.children.filter(child =>
        child instanceof THREE.Light &&
        !(child === flashlight)
    );
    lights.forEach(light => scene.remove(light));

    // Clear alarm lights
    alarmLights = [];
    window.mainRedLights = null;
    window.gameDoor = null;

    console.log('Scene 1 cleaned up');
}

async function transitionToScene2() {
    console.log('Starting transition to Scene 2');

    // Clean up Scene 1
    cleanupScene1();

    // Reset interactive objects (keep only flashlight-related)
    interactiveObjects = [];

    // Reset player position for Scene 2 (start at back of room)
    camera.position.set(0, PLAYER_HEIGHT, -15);
    cameraRotation.yaw = 0;
    cameraRotation.pitch = 0;

    // Update game state
    gameState.currentScene = 'officeFloor';

    // Build Scene 2
    await buildOfficeFloorScene();

    // Show progress UI
    updateProgressUI();

    console.log('Transition to Scene 2 complete');
}

// ====================================================================
// PROGRESS UI (ICONS ONLY)
// ====================================================================
function updateProgressUI() {
    const progressDiv = document.getElementById('progress-indicator');
    if (!progressDiv) return;

    const collected = gameState.evidenceCollected.size;
    progressDiv.textContent = `${collected}/3`;
    progressDiv.style.display = 'block';
}

// ====================================================================
// BACKPACK EVIDENCE SYSTEM
// ====================================================================
function addEvidenceToBackpack(evidenceName, evidenceTexture) {
    const backpackContents = document.getElementById('backpack-contents');
    if (!backpackContents) return;

    // Create evidence item element
    const evidenceItem = document.createElement('div');
    evidenceItem.style.cssText = `
        background: rgba(255, 170, 0, 0.2);
        border: 2px solid #ffaa00;
        border-radius: 8px;
        padding: 10px;
        color: #ffaa00;
        font-family: monospace;
        font-size: 14px;
        text-align: center;
        cursor: pointer;
        transition: background 0.3s;
    `;
    evidenceItem.textContent = evidenceName;
    evidenceItem.setAttribute('data-texture', evidenceTexture);

    // Hover effects
    evidenceItem.addEventListener('mouseenter', () => {
        evidenceItem.style.background = 'rgba(255, 170, 0, 0.4)';
    });
    evidenceItem.addEventListener('mouseleave', () => {
        evidenceItem.style.background = 'rgba(255, 170, 0, 0.2)';
    });

    backpackContents.appendChild(evidenceItem);
}

// ====================================================================
// FURNITURE COLLISION DETECTION
// ====================================================================
function checkFurnitureCollision(position) {
    // Scene 2 offset - same as in buildOfficeFloorScene (room size 25x25)
    const scene2OffsetZ = 12.5 + 12.5; // 25

    // Single desk collision (4 units wide, 2.5 units deep, centered at origin)
    const deskX = 0;
    const deskZ = scene2OffsetZ;
    const deskHalfWidth = 4 / 2 + 0.5; // desk width / 2 + margin
    const deskHalfDepth = 2.5 / 2 + 0.5; // desk depth / 2 + margin

    if (position.x > deskX - deskHalfWidth && position.x < deskX + deskHalfWidth &&
        position.z > deskZ - deskHalfDepth && position.z < deskZ + deskHalfDepth) {
        return true;
    }

    return false;
}

// ====================================================================
// UPDATE FUNCTION
// ====================================================================
function update(delta) {
    if (!controls.isLocked) return;

    // Update flashlight to follow camera
    if (flashlight) {
        flashlight.position.copy(camera.position);

        // Point flashlight in camera direction
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        const targetPosition = camera.position.clone().add(direction.multiplyScalar(5));
        flashlight.target.position.copy(targetPosition);
    }

    // Apply camera rotation from mouse drag
    camera.rotation.order = 'YXZ';
    camera.rotation.y = cameraRotation.yaw;
    camera.rotation.x = cameraRotation.pitch;

    // Movement
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveBackward) - Number(moveForward);
    direction.x = Number(moveLeft) - Number(moveRight);
    direction.normalize();

    if (moveForward || moveBackward) {
        velocity.z -= direction.z * PLAYER_SPEED * delta;
    }
    if (moveLeft || moveRight) {
        velocity.x -= direction.x * PLAYER_SPEED * delta;
    }

    // Calculate movement direction based on camera yaw
    const moveX = -velocity.x * Math.cos(cameraRotation.yaw) + velocity.z * Math.sin(cameraRotation.yaw);
    const moveZ = -velocity.x * Math.sin(cameraRotation.yaw) - velocity.z * Math.cos(cameraRotation.yaw);

    const prevPosition = camera.position.clone();
    camera.position.x += moveX * delta;
    camera.position.z += moveZ * delta;

    // Collision detection - both rooms connected
    let hitWall = false;
    let doorBlocked = false;

    // Scene 1 boundaries (z: -12.5 to 12.5, x: -12.5 to 12.5)
    // Scene 2 boundaries (z: 12.5 to 37.5, x: -12.5 to 12.5) - Same size as Scene 1

    const inScene1 = camera.position.z < 12.5;
    const inScene2 = camera.position.z >= 12.5;

    if (inScene1) {
        // Scene 1 collision
        hitWall = camera.position.x < -11 || camera.position.x > 11 || camera.position.z < -11;

        // Check if trying to go through Scene 1 door
        const atDoorWall = camera.position.z > 12 && camera.position.z < 13;
        const inDoorArea = camera.position.x > -2 && camera.position.x < 2;
        doorBlocked = atDoorWall && (!gameState.doorUnlocked || !inDoorArea);
    } else if (inScene2) {
        // Scene 2 collision (same size room as Scene 1: 25x25)
        const scene2End = 12.5 + 25; // 37.5
        hitWall = camera.position.x < -11 || camera.position.x > 11;

        // Check wooden door collision - allow free movement up to door area
        // Only block passage beyond the door (when door is locked)
        const beyondDoor = camera.position.z > scene2End;
        const inWoodenDoorArea = camera.position.x > -2 && camera.position.x < 2;
        doorBlocked = beyondDoor && (!gameState.woodenDoorUnlocked || !inWoodenDoorArea);

        // Collision with desks and furniture
        const furnitureCollision = checkFurnitureCollision(camera.position);
        if (furnitureCollision) {
            camera.position.copy(prevPosition);
            return;
        }
    }

    if (hitWall || doorBlocked) {
        camera.position.copy(prevPosition);
    }

    // Keep player at correct height
    camera.position.y = PLAYER_HEIGHT;

    // Raycasting for interactive objects
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(
        interactiveObjects.map(obj => obj.mesh)
    );

    if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object;
        const interactiveObj = interactiveObjects.find(
            obj => obj.mesh === intersectedMesh
        );

        if (interactiveObj) {
            currentHoveredObject = interactiveObj;
        } else {
            currentHoveredObject = null;
        }
    } else {
        currentHoveredObject = null;
    }

    // Door animation (slide to the right)
    if (doorAnimating && window.gameDoor) {
        doorPosition += DOOR_ANIMATION_SPEED * delta;
        if (doorPosition >= DOOR_TARGET_POSITION) {
            doorPosition = DOOR_TARGET_POSITION;
            doorAnimating = false;
            console.log('Door animation complete! Final position:', doorPosition);
        }
        window.gameDoor.position.x = doorPosition;
    }

    // Animation timer for effects
    const time = clock.getElapsedTime();

    // Evidence indicator light - flickering blue glow for creature sketch on desk
    if (window.creatureGlow && !gameState.evidenceCollected.has('evidence_creature')) {
        const flicker1 = Math.sin(time * 3 + 0.5) * 0.2 + 0.6;
        window.creatureGlow.intensity = flicker1;
    }

    // Main red ceiling lights - slow rhythmic breathing (brighter)
    if (window.mainRedLights) {
        const breathe = Math.sin(time * 0.8) * 0.3 + 0.7; // Slow pulse (0.4 to 1.0)
        window.mainRedLights.forEach(redLight => {
            redLight.light.intensity = 12 + breathe * 6;
            redLight.mesh.material.emissiveIntensity = 3 + breathe * 2;
        });
    }

    // Smaller alarm lights pulsing (dramatic flashing, brighter)
    alarmLights.forEach((alarm, index) => {
        const offset = index * 0.5;
        const intensity = Math.abs(Math.sin(time * 4 + offset));
        const sparkle = Math.random() * 0.3;
        alarm.mesh.material.emissiveIntensity = 2.5 + intensity * 3 + sparkle;
        alarm.light.intensity = 4 + intensity * 8 + sparkle;
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
console.log('Game script loading...');
init().catch(error => {
    console.error('Failed to initialize game:', error);
    document.body.innerHTML = `<div style="color: red; padding: 20px;">Error: ${error.message}</div>`;
});
