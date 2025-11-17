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
    accessCard: './Screenshot 2025-11-16 at 23.30.10.png'
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

// Mouse drag camera controls
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
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

// Zoom state
let isZoomedIn = false;
let zoomTarget = null;
let zoomBrightLight = null; // Extra bright light for zoom view

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

    // Build scene
    console.log('Building scene...');
    await buildIndustrialHallScene();
    console.log('Scene built successfully');

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
        isDragging = true;
        previousMousePosition = { x: event.clientX, y: event.clientY };
    }
}

function onMouseMove(event) {
    if (isDragging) {
        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;

        cameraRotation.yaw -= deltaX * 0.002;
        cameraRotation.pitch -= deltaY * 0.002;

        // Clamp pitch to prevent over-rotation
        cameraRotation.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraRotation.pitch));

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
        isDragging = false;
    }
}

function onMouseClick(event) {
    if (isDragging) return; // Don't interact if we were dragging

    // If zoomed in and clicking outside objects, zoom out
    if (isZoomedIn && !currentHoveredObject) {
        isZoomedIn = false;
        zoomTarget = null;
        // Turn off bright light
        if (zoomBrightLight) {
            zoomBrightLight.intensity = 0;
        }
        return;
    }

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
    const doorTexture = await loadTexture(TEXTURES.scene1_door, 1, 1);
    const exitTexture = await loadTexture(TEXTURES.scene1_exit, 1, 1);
    const keyBoardTexture = await loadTexture(TEXTURES.keyBoard, 1, 1);
    const accessCardTexture = await loadTexture(TEXTURES.accessCard, 1, 1);
    console.log('Textures loaded - Floor:', !!floorTexture, 'Door:', !!doorTexture, 'Exit:', !!exitTexture, 'KeyBoard:', !!keyBoardTexture, 'Card:', !!accessCardTexture);

    // Floor (smaller room)
    const roomSize = 25;
    const floorGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
    const floorMaterial = new THREE.MeshStandardMaterial({
        map: floorTexture,
        color: floorTexture ? 0xffffff : 0x444444,
        roughness: 0.8,
        metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Walls (brushed metal - no texture to save GPU)
    const wallHeight = 6;
    const halfRoom = roomSize / 2;
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        metalness: 0.6,
        roughness: 0.4,
    });

    // Back wall
    const backWall = new THREE.Mesh(
        new THREE.PlaneGeometry(roomSize, wallHeight),
        wallMaterial
    );
    backWall.position.set(0, wallHeight / 2, -halfRoom);
    scene.add(backWall);

    // Front wall (with door gap)
    const frontWallLeft = new THREE.Mesh(
        new THREE.PlaneGeometry(8, wallHeight),
        wallMaterial
    );
    frontWallLeft.position.set(-8.5, wallHeight / 2, halfRoom);
    frontWallLeft.rotation.y = Math.PI;
    scene.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(
        new THREE.PlaneGeometry(8, wallHeight),
        wallMaterial
    );
    frontWallRight.position.set(8.5, wallHeight / 2, halfRoom);
    frontWallRight.rotation.y = Math.PI;
    scene.add(frontWallRight);

    // Left wall
    const leftWall = new THREE.Mesh(
        new THREE.PlaneGeometry(roomSize, wallHeight),
        wallMaterial
    );
    leftWall.position.set(-halfRoom, wallHeight / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(
        new THREE.PlaneGeometry(roomSize, wallHeight),
        wallMaterial
    );
    rightWall.position.set(halfRoom, wallHeight / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);

    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.9,
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
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

    // Main door (with texture)
    const doorGeometry = new THREE.BoxGeometry(4, 5, 0.2);
    const doorMaterial = new THREE.MeshStandardMaterial({
        map: doorTexture,
        color: doorTexture ? 0xffffff : 0x88aacc,
        metalness: 0.3,
        roughness: 0.4,
        transparent: doorTexture ? false : true,
        opacity: doorTexture ? 1.0 : 0.6,
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 2.5, halfRoom - 0.7);
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
            color: keyBoardTexture ? 0xffffff : 0x555555,
            metalness: 0.3,
            roughness: 0.5,
        })
    );
    keyBoard.position.set(-8, 2.5, halfRoom - 0.75);
    scene.add(keyBoard);

    // Store keyBoard reference
    window.keyBoardMesh = keyBoard;

    // Spotlight lamp just above key board (very bright yellow light, focused)
    const keyBoardSpotlight = new THREE.SpotLight(0xffff88, 12, 5, Math.PI / 8, 0.5, 2);
    keyBoardSpotlight.position.set(-8, 4.2, halfRoom - 1.2);
    keyBoardSpotlight.target.position.set(-8, 2.5, halfRoom - 0.75);
    scene.add(keyBoardSpotlight);
    scene.add(keyBoardSpotlight.target);

    // Extra bright light for zoom view (initially off)
    zoomBrightLight = new THREE.SpotLight(0xffffff, 0, 4, Math.PI / 6, 0.3, 1);
    zoomBrightLight.position.set(-8, 2.5, halfRoom - 2);
    zoomBrightLight.target.position.set(-8, 2.5, halfRoom - 0.75);
    scene.add(zoomBrightLight);
    scene.add(zoomBrightLight.target);

    // Lamp fixture visual
    const lampFixture = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 0.3, 16),
        new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.3,
        })
    );
    lampFixture.position.set(-8, 4.3, halfRoom - 1.2);
    lampFixture.rotation.x = Math.PI / 6;
    scene.add(lampFixture);

    // Access card (interactive with texture) - positioned on key board
    const cardGeometry = new THREE.BoxGeometry(0.6, 0.9, 0.03);
    const cardMaterial = new THREE.MeshStandardMaterial({
        map: accessCardTexture,
        color: accessCardTexture ? 0xffffff : 0x2C3E50,
        metalness: 0.1,
        roughness: 0.6,
    });
    const accessCard = new THREE.Mesh(cardGeometry, cardMaterial);
    accessCard.position.set(-8, 2.5, halfRoom - 0.65);
    accessCard.rotation.y = Math.PI; // Rotate 180 degrees to face the room
    scene.add(accessCard);

    // Store card reference
    window.accessCardMesh = accessCard;

    // Interactive key board - click to zoom in
    const keyBoardInteractive = {
        mesh: keyBoard,
        type: 'keyBoard',
        id: 'scene1_key_board',
        hintText: 'Click to examine key board',
        onClick: () => {
            if (!isZoomedIn) {
                isZoomedIn = true;
                zoomTarget = keyBoard;
                // Turn on bright light for zoom view
                if (zoomBrightLight) {
                    zoomBrightLight.intensity = 30;
                }
            }
        }
    };
    interactiveObjects.push(keyBoardInteractive);

    // Interactive card object - only works when zoomed in
    const cardInteractive = {
        mesh: accessCard,
        type: 'card',
        id: 'scene1_card_access',
        hintText: 'Double-click to pick up access card',
        onDoubleClick: () => {
            // Only allow interaction when zoomed in
            if (!isZoomedIn) return;

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
                    interactiveObjects = interactiveObjects.filter(obj => obj.id !== 'scene1_card_access');
                    // Auto zoom out after collecting
                    isZoomedIn = false;
                    zoomTarget = null;
                    // Turn off bright light
                    if (zoomBrightLight) {
                        zoomBrightLight.intensity = 0;
                    }
                } else {
                    accessCard.position.z = startZ + liftProgress * 0.5;
                    const scale = startScale + liftProgress * 0.2;
                    accessCard.scale.set(scale, scale, scale);
                }
            }, 20);
        }
    };
    interactiveObjects.push(cardInteractive);

    // Card reader near door
    const readerGroup = new THREE.Group();
    readerGroup.position.set(3, 1.3, halfRoom - 1);
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

    console.log('Industrial Hall scene built');
}

// ====================================================================
// UPDATE FUNCTION
// ====================================================================
function update(delta) {
    if (!controls.isLocked) return;

    // Handle zoom view
    if (isZoomedIn && zoomTarget) {
        // Zoom camera to key board position (centered on screen)
        const targetPos = zoomTarget.position.clone();
        targetPos.z -= 2; // Move camera back from board
        targetPos.y = 2.5; // Center vertically

        // Smoothly move camera to zoom position
        camera.position.lerp(targetPos, 0.1);

        // Look at the board
        const lookAtTarget = zoomTarget.position.clone();
        camera.lookAt(lookAtTarget);

        // Don't allow movement or camera rotation when zoomed
        return;
    }

    // Apply camera rotation from mouse drag
    camera.rotation.order = 'YXZ';
    camera.rotation.y = cameraRotation.yaw;
    camera.rotation.x = cameraRotation.pitch;

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

    // Calculate movement direction based on camera yaw
    const moveX = -velocity.x * Math.cos(cameraRotation.yaw) + velocity.z * Math.sin(cameraRotation.yaw);
    const moveZ = -velocity.x * Math.sin(cameraRotation.yaw) - velocity.z * Math.cos(cameraRotation.yaw);

    const prevPosition = camera.position.clone();
    camera.position.x += moveX * delta;
    camera.position.z += moveZ * delta;

    // Collision detection (simple boundary for smaller room)
    if (camera.position.x < -11 || camera.position.x > 11 || camera.position.z < -11 || camera.position.z > 11) {
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
        }
        window.gameDoor.position.x = doorPosition;
    }

    // Main red ceiling lights - slow rhythmic breathing (brighter)
    const time = clock.getElapsedTime();
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
