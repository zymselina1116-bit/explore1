import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

console.log('Script loaded, THREE version:', THREE.REVISION);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

camera.position.set(0, 2.5, 0);
scene.background = new THREE.Color(0x000000);

// Flashlight setup
const flashlight = new THREE.SpotLight(0xffffff, 10.0, 25, 0.35, 0.3, 2);
flashlight.position.set(0, 0, 0);
camera.add(flashlight);
scene.add(camera);

const flashlightTarget = new THREE.Object3D();
flashlightTarget.position.set(0, 0, -1);
scene.add(flashlightTarget);
flashlight.target = flashlightTarget;

const textureLoader = new THREE.TextureLoader();
const inventory = [];
const interactiveObjects = [];
const worldObjects = [];
let currentScene = 'room1';
const gardenObjects = [];

// Evidence delivery system
const droppedEvidence = [];
const deliveryState = { bone: false, footprint: false, evidence1: false, evidence2: false, evidence3: false };
let selectedInventoryIndex = -1;
let draggedEvidence = null;
let isDragging = false;
let finalLetterSpawned = false;

let isMouseDown = false;
let previousMousePosition = { x: 0, y: 0 };
let yaw = 0;
let pitch = 0;
const moveState = { forward: false, backward: false, left: false, right: false };

function loadTexture(path) {
    const texture = textureLoader.load(
        path,
        () => console.log('Loaded:', path),
        undefined,
        (err) => console.error('Error loading:', path, err)
    );
    texture.encoding = THREE.sRGBEncoding;
    return texture;
}

const textures = {
    wall: loadTexture('Screenshot 2025-11-16 at 22.53.11.png'),
    floor: loadTexture('Screenshot 2025-11-16 at 22.51.42.png'),
    door: loadTexture('Screenshot 2025-11-16 at 22.54.35.png'),
    woodenDoor: loadTexture('https://raw.githubusercontent.com/zymselina1116-bit/explore1/c6486d63247f21f2a655b63055409fabe2dd0fe0/Screenshot%202025-11-19%20at%2002.44.50.png'),
    randomKey: loadTexture('Screenshot_2025-11-17_at_12.33.23-removebg-preview.png'),
    card: loadTexture('Screenshot_2025-11-17_at_12.30.02-removebg-preview (1).png'),
    cardReader: loadTexture('64a4a7a4f17dd4b4087b2c9feb3245e0-removebg-preview.png'),
    goldenKey: loadTexture('70dc331664376a64a8050baa7c7744a6-removebg-preview.png'),
    keyBoard: loadTexture('Screenshot 2025-11-16 at 23.31.20.png'),
    room2Floor: loadTexture('Screenshot 2025-11-16 at 22.56.00.png'),
    deskChair: loadTexture('Screenshot 2025-11-17 at 14.38.31.png'),
    evidence1: loadTexture('Screenshot 2025-11-17 at 14.12.36.png'),
    evidence2: loadTexture('Screenshot 2025-11-17 at 14.17.01.png'),
    evidence3: loadTexture('Screenshot 2025-11-17 at 14.18.31.png'),
    gardenGrass: loadTexture('https://raw.githubusercontent.com/zymselina1116-bit/explore1/10bd72d55c08bf6aa1d94153574f2cbfda0a1702/Screenshot%202025-11-18%20at%2021.19.28.png'),
    footprint: loadTexture('https://raw.githubusercontent.com/zymselina1116-bit/explore1/63b9e9a95c7e705c36df5553b89bb4bd083e5ea9/Screenshot_2025-11-18_at_19.23.01-removebg-preview.png'),
    footprintPhoto: loadTexture('https://raw.githubusercontent.com/zymselina1116-bit/explore1/5113b099b2a821e217e8c1b5f8e0ecaca65fd06c/Screenshot%202025-11-18%20at%2019.29.33.png'),
    postbox: loadTexture('https://raw.githubusercontent.com/zymselina1116-bit/explore1/7acf9ef3117d8abc7730149321b3794b6b01ecd4/Screenshot%202025-11-18%20at%2020.18.59.png'),
    boneBackpack: loadTexture('https://raw.githubusercontent.com/zymselina1116-bit/explore1/2e5977ca4001f1acc52b14306639ed463c8fbf9b/cfa82b6e85ad9a31beb6df5c67e3aeb4-removebg-preview.png'),
    bushTexture: loadTexture('https://raw.githubusercontent.com/zymselina1116-bit/explore1/1a447fbbb5aea7e6e56c4ca3dbe1b0aa73697c2c/Screenshot%202025-11-19%20at%2000.57.00.png'),
    flowerTexture: loadTexture('https://raw.githubusercontent.com/zymselina1116-bit/explore1/bf0e2df20354a430956b68ac9c97e34963a2c5fb/934cf2913e8cfeb7be072f66db469185-removebg-preview.png'),
    glassFrameTexture: loadTexture('https://raw.githubusercontent.com/zymselina1116-bit/explore1/faf4c32b96cf87e28797e870b44d64edd85d7f4f/Screenshot%202025-11-19%20at%2001.02.50.png'),
    stoneTexture: loadTexture('https://raw.githubusercontent.com/zymselina1116-bit/explore1/5573d4fea0431be2ee1e177482d81860a1b5bdb7/Screenshot%202025-11-19%20at%2000.59.27.png'),
    waterNormalTexture: loadTexture('https://raw.githubusercontent.com/zymselina1116-bit/explore1/91e007b95ebf8381b04b6c76cc0c5079353bfae1/Screenshot%202025-11-19%20at%2000.58.22.png'),
    boneTexture: loadTexture('https://raw.githubusercontent.com/zymselina1116-bit/explore1/d41f0186e74850cc0c40dc7fbf80e20a6e6fdcdb/Screenshot%202025-11-19%20at%2000.56.06.png')
};

textures.floor.wrapS = textures.floor.wrapT = THREE.RepeatWrapping;
textures.floor.repeat.set(4, 4);
textures.wall.wrapS = textures.wall.wrapT = THREE.RepeatWrapping;
textures.wall.repeat.set(2, 2);
textures.gardenGrass.wrapS = textures.gardenGrass.wrapT = THREE.RepeatWrapping;
textures.gardenGrass.repeat.set(6, 6);

// Create Room 1
const roomSize = 15;
const wallHeight = 5;

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize),
    new THREE.MeshStandardMaterial({
        map: textures.floor,
        color: 0xff4444 // Red tint
    })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);
worldObjects.push(floor);

const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize),
    new THREE.MeshStandardMaterial({
        map: textures.wall,
        color: 0xff3333 // Deep red tint
    })
);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = wallHeight;
scene.add(ceiling);

const wallGeometry = new THREE.PlaneGeometry(roomSize, wallHeight);

const wallNorth = new THREE.Mesh(wallGeometry, new THREE.MeshStandardMaterial({
    map: textures.wall,
    color: 0xff3333 // Deep red tint
}));
wallNorth.position.set(0, wallHeight / 2, -roomSize / 2);
scene.add(wallNorth);
worldObjects.push(wallNorth);

const wallSouth = new THREE.Mesh(wallGeometry, new THREE.MeshStandardMaterial({
    map: textures.wall,
    color: 0xff3333 // Deep red tint
}));
wallSouth.position.set(0, wallHeight / 2, roomSize / 2);
wallSouth.rotation.y = Math.PI;
scene.add(wallSouth);
worldObjects.push(wallSouth);

// West wall with doorway opening for wooden door (3m wide x 4.5m tall)
// Door opening exactly matches door dimensions: 3m wide (Z: -1.5 to 1.5), 4.5m tall (Y: 0 to 4.5)

// Top segment above door opening (3m wide, matches door width exactly)
const westWallTopCenter = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 0.5),
    new THREE.MeshStandardMaterial({
        map: textures.wall,
        color: 0xff3333 // Deep red tint
    })
);
westWallTopCenter.position.set(-roomSize / 2, wallHeight - 0.25, 0);
westWallTopCenter.rotation.y = Math.PI / 2;
scene.add(westWallTopCenter);

// Top north corner (fills space above and beside north segment)
const westWallTopNorth = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 0.5),
    new THREE.MeshStandardMaterial({
        map: textures.wall,
        color: 0xff3333 // Deep red tint
    })
);
westWallTopNorth.position.set(-roomSize / 2, wallHeight - 0.25, -4.5);
westWallTopNorth.rotation.y = Math.PI / 2;
scene.add(westWallTopNorth);

// Top south corner (fills space above and beside south segment)
const westWallTopSouth = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 0.5),
    new THREE.MeshStandardMaterial({
        map: textures.wall,
        color: 0xff3333 // Deep red tint
    })
);
westWallTopSouth.position.set(-roomSize / 2, wallHeight - 0.25, 4.5);
westWallTopSouth.rotation.y = Math.PI / 2;
scene.add(westWallTopSouth);

// North side segment (4.5m tall, matches door height exactly)
const westWallNorth = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 4.5),
    new THREE.MeshStandardMaterial({
        map: textures.wall,
        color: 0xff3333 // Deep red tint
    })
);
westWallNorth.position.set(-roomSize / 2, 2.25, -4.5);
westWallNorth.rotation.y = Math.PI / 2;
scene.add(westWallNorth);
worldObjects.push(westWallNorth);

// South side segment (4.5m tall, matches door height exactly)
const westWallSouth = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 4.5),
    new THREE.MeshStandardMaterial({
        map: textures.wall,
        color: 0xff3333 // Deep red tint
    })
);
westWallSouth.position.set(-roomSize / 2, 2.25, 4.5);
westWallSouth.rotation.y = Math.PI / 2;
scene.add(westWallSouth);
worldObjects.push(westWallSouth);

// East wall with doorway opening (exact 3m opening matching door)
const eastWallTop = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, 0.5),
    new THREE.MeshStandardMaterial({
        map: textures.wall,
        color: 0xff3333 // Deep red tint
    })
);
eastWallTop.position.set(roomSize / 2, wallHeight - 0.25, 0);
eastWallTop.rotation.y = -Math.PI / 2;
scene.add(eastWallTop);
// NOT added to worldObjects - purely visual, no collision

const eastWallNorth = new THREE.Mesh(
    new THREE.PlaneGeometry(6, wallHeight),
    new THREE.MeshStandardMaterial({
        map: textures.wall,
        color: 0xff3333 // Deep red tint
    })
);
eastWallNorth.position.set(roomSize / 2, wallHeight / 2, -4.5);
eastWallNorth.rotation.y = -Math.PI / 2;
scene.add(eastWallNorth);
worldObjects.push(eastWallNorth);

const eastWallSouth = new THREE.Mesh(
    new THREE.PlaneGeometry(6, wallHeight),
    new THREE.MeshStandardMaterial({
        map: textures.wall,
        color: 0xff3333 // Deep red tint
    })
);
eastWallSouth.position.set(roomSize / 2, wallHeight / 2, 4.5);
eastWallSouth.rotation.y = -Math.PI / 2;
scene.add(eastWallSouth);
worldObjects.push(eastWallSouth);

// Ambient light for base brightness (DOMINANT RED)
const ambientLight = new THREE.AmbientLight(0xff2222, 0.3);
scene.add(ambientLight);

// Red pulsing lights (DARKER - reduced illumination)
const redLight1 = new THREE.PointLight(0xff0000, 3, 25);
redLight1.position.set(-3, wallHeight - 0.5, -3);
scene.add(redLight1);
redLight1.userData.pulseLight = true;
redLight1.userData.baseIntensity = 3;

const redLight2 = new THREE.PointLight(0xff0000, 3, 25);
redLight2.position.set(3, wallHeight - 0.5, 3);
scene.add(redLight2);
redLight2.userData.pulseLight = true;
redLight2.userData.baseIntensity = 3;

const redLight3 = new THREE.PointLight(0xff0000, 3, 25);
redLight3.position.set(-3, wallHeight - 0.5, 3);
scene.add(redLight3);
redLight3.userData.pulseLight = true;
redLight3.userData.baseIntensity = 3;

const redLight4 = new THREE.PointLight(0xff0000, 3, 25);
redLight4.position.set(3, wallHeight - 0.5, -3);
scene.add(redLight4);
redLight4.userData.pulseLight = true;
redLight4.userData.baseIntensity = 3;

// Additional red lights at mid-wall positions
const redLight5 = new THREE.PointLight(0xff0000, 2, 20);
redLight5.position.set(0, wallHeight - 0.5, -6);
scene.add(redLight5);
redLight5.userData.pulseLight = true;
redLight5.userData.baseIntensity = 2;

const redLight6 = new THREE.PointLight(0xff0000, 2, 20);
redLight6.position.set(0, wallHeight - 0.5, 6);
scene.add(redLight6);
redLight6.userData.pulseLight = true;
redLight6.userData.baseIntensity = 2;

const redLight7 = new THREE.PointLight(0xff0000, 2, 20);
redLight7.position.set(-6, wallHeight - 0.5, 0);
scene.add(redLight7);
redLight7.userData.pulseLight = true;
redLight7.userData.baseIntensity = 2;

const redLight8 = new THREE.PointLight(0xff0000, 2, 20);
redLight8.position.set(6, wallHeight - 0.5, 0);
scene.add(redLight8);
redLight8.userData.pulseLight = true;
redLight8.userData.baseIntensity = 2;

// Spotlight on key board - RED-TINTED (now on NORTH wall)
const keyBoardSpotlight = new THREE.SpotLight(0xff6644, 2, 12, Math.PI / 6);
keyBoardSpotlight.position.set(0, 3, -6);
keyBoardSpotlight.target.position.set(0, 2, -roomSize / 2 + 0.1);
scene.add(keyBoardSpotlight);
scene.add(keyBoardSpotlight.target);

// Key board on wall (NORTH wall)
const keyBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 2),
    new THREE.MeshStandardMaterial({ map: textures.keyBoard })
);
keyBoard.position.set(0, 2, -roomSize / 2 + 0.05);
keyBoard.rotation.y = 0;
scene.add(keyBoard);

// 8 Random decorative keys scattered on key board (non-clickable)
const keyPositions = [
    { x: -0.7, y: 1.6 },
    { x: 0.3, y: 1.7 },
    { x: -0.4, y: 1.9 },
    { x: 0.6, y: 1.8 },
    { x: -0.2, y: 2.6 },
    { x: 0.4, y: 2.7 },
    { x: -0.8, y: 2.5 },
    { x: 0.7, y: 2.6 }
];
keyPositions.forEach(pos => {
    const decorKey = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.3),
        new THREE.MeshStandardMaterial({ map: textures.randomKey, transparent: true })
    );
    decorKey.position.set(pos.x, pos.y, -roomSize / 2 + 0.06);
    decorKey.rotation.y = 0;
    scene.add(decorKey);
});

// Collectible card on key board (NORTH wall)
const collectibleCard = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshStandardMaterial({ map: textures.card, transparent: true })
);
collectibleCard.position.set(-0.6, 2.3, -roomSize / 2 + 0.07);
collectibleCard.rotation.y = 0;
scene.add(collectibleCard);
collectibleCard.userData.isCollectible = true;
collectibleCard.userData.itemType = 'card';
collectibleCard.userData.texture = textures.card;
interactiveObjects.push(collectibleCard);

// Golden key on key board (collectible)
const goldenKey = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshStandardMaterial({ map: textures.goldenKey, transparent: true })
);
goldenKey.position.set(0.6, 2.3, -roomSize / 2 + 0.07);
goldenKey.rotation.y = 0;
scene.add(goldenKey);
goldenKey.userData.isCollectible = true;
goldenKey.userData.itemType = 'goldenKey';
goldenKey.userData.texture = textures.goldenKey;
interactiveObjects.push(goldenKey);

// Card reader
const cardReader = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.7),
    new THREE.MeshStandardMaterial({ map: textures.cardReader, transparent: true })
);
cardReader.position.set(roomSize / 2 - 0.05, 1.5, 2);
cardReader.rotation.y = -Math.PI / 2;
scene.add(cardReader);
cardReader.userData.isCardReader = true;
interactiveObjects.push(cardReader);

// Exit door (larger: 3m wide x 4.5m tall)
const exitDoor = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 4.5),
    new THREE.MeshStandardMaterial({ map: textures.door })
);
exitDoor.position.set(roomSize / 2 - 0.05, 2.25, 0);
exitDoor.rotation.y = -Math.PI / 2;
scene.add(exitDoor);
exitDoor.userData.isExitDoor = true;
exitDoor.userData.closed = true;
// Door visual is NOT in worldObjects - only collider blocks movement

const doorCollider = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 4.5, 3),
    new THREE.MeshBasicMaterial({ visible: false })
);
doorCollider.position.set(roomSize / 2 - 0.15, 2.25, 0);
scene.add(doorCollider);
doorCollider.userData.doorCollider = true;
doorCollider.userData.door = exitDoor;
worldObjects.push(doorCollider);

// Wooden door (WEST wall, interactive - opens with golden key, larger: 3m wide x 4.5m tall)
const woodenDoor = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 4.5),
    new THREE.MeshStandardMaterial({
        map: textures.woodenDoor,
        transparent: true,
        side: THREE.FrontSide // Only visible from Room1 side
    })
);
woodenDoor.position.set(-roomSize / 2 + 0.05, 2.25, 0.05); // Offset z to avoid Z-fighting
woodenDoor.rotation.y = Math.PI / 2;
scene.add(woodenDoor);
woodenDoor.userData.isWoodenDoor = true;
woodenDoor.userData.closed = true;
interactiveObjects.push(woodenDoor);

// Arched doorway frame (visible from Garden side)
const archFrameMaterial = new THREE.MeshStandardMaterial({
    color: 0xf8f8f8,
    metalness: 0.6,
    roughness: 0.3
});

// Arch top (semi-circular curve)
const archCurve = new THREE.TorusGeometry(1.5, 0.12, 8, 32, Math.PI);
const archTop = new THREE.Mesh(archCurve, archFrameMaterial);
archTop.rotation.z = Math.PI;
archTop.rotation.y = Math.PI / 2;
archTop.position.set(-roomSize / 2 - 0.1, 2.25 + 1.5, 0);
scene.add(archTop);

// Arch side pillars
const leftPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 3.75, 12),
    archFrameMaterial
);
leftPillar.position.set(-roomSize / 2 - 0.1, 2.25 - 0.375, -1.5);
scene.add(leftPillar);

const rightPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 3.75, 12),
    archFrameMaterial
);
rightPillar.position.set(-roomSize / 2 - 0.1, 2.25 - 0.375, 1.5);
scene.add(rightPillar);

// Wooden door collider (player cannot walk through until opened)
const woodenDoorCollider = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 4.5, 3),
    new THREE.MeshBasicMaterial({ visible: false })
);
woodenDoorCollider.position.set(-roomSize / 2 + 0.1, 2.25, 0);
scene.add(woodenDoorCollider);
woodenDoorCollider.userData.woodenDoorCollider = true;
woodenDoorCollider.userData.door = woodenDoor;
worldObjects.push(woodenDoorCollider);

// Garden trigger zone (invisible, right past the wooden door)
const gardenTrigger = new THREE.Box3(
    new THREE.Vector3(-roomSize / 2 - 2, 0, -2),
    new THREE.Vector3(-roomSize / 2 - 0.5, 5, 2)
);

// Mailbox (industrial rectangular postbox)
const mailboxGroup = new THREE.Group();
mailboxGroup.position.set(3, 1.25, -5);

// Main rectangular body - dark industrial metal
const mailboxBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 3.0, 0.7),
    new THREE.MeshStandardMaterial({
        map: textures.postbox,
        metalness: 0.85,
        roughness: 0.35,
        color: 0xff4444 // Red tint to reflect room lighting
    })
);
mailboxBody.position.y = 0.25; // Center the 3m tall box
mailboxGroup.add(mailboxBody);

// Realistic carved mail slot - inward opening
const slotDepth = 0.1;
const slotOuter = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.12, slotDepth),
    new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        metalness: 0.9,
        roughness: 0.2
    })
);
slotOuter.position.set(0, 0.3, 0.35 - slotDepth / 2);
mailboxGroup.add(slotOuter);

// Engraved "POSTBOX" text - carved into metal surface
const engravingGroup = new THREE.Group();
const letters = ['P', 'O', 'S', 'T', 'B', 'O', 'X'];
const letterSpacing = 0.08;
const totalWidth = letters.length * letterSpacing;
const startX = -totalWidth / 2 + letterSpacing / 2;

letters.forEach((letter, i) => {
    // Create carved letter using canvas
    const letterCanvas = document.createElement('canvas');
    letterCanvas.width = 64;
    letterCanvas.height = 64;
    const letterCtx = letterCanvas.getContext('2d');
    letterCtx.fillStyle = '#000000';
    letterCtx.fillRect(0, 0, 64, 64);
    letterCtx.fillStyle = '#333333';
    letterCtx.font = 'bold 48px Arial';
    letterCtx.textAlign = 'center';
    letterCtx.textBaseline = 'middle';
    letterCtx.fillText(letter, 32, 32);

    const letterTexture = new THREE.CanvasTexture(letterCanvas);
    const letterPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.07, 0.1),
        new THREE.MeshStandardMaterial({
            map: letterTexture,
            transparent: true,
            opacity: 0.6,
            emissive: 0x111111
        })
    );
    letterPlane.position.set(startX + i * letterSpacing, 0.6, 0.31);
    engravingGroup.add(letterPlane);
});

mailboxGroup.add(engravingGroup);

scene.add(mailboxGroup);
mailboxGroup.userData.isMailbox = true;
interactiveObjects.push(mailboxGroup);
worldObjects.push(mailboxGroup);

// ===== ROOM 2 =====
const room2Offset = 15; // Connected to Room 1's east wall

textures.room2Floor.wrapS = textures.room2Floor.wrapT = THREE.RepeatWrapping;
textures.room2Floor.repeat.set(4, 4);

// Room 2 floor
const room2Floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize),
    new THREE.MeshStandardMaterial({ map: textures.room2Floor })
);
room2Floor.rotation.x = -Math.PI / 2;
room2Floor.position.set(room2Offset, 0, 0);
scene.add(room2Floor);
worldObjects.push(room2Floor);

// Room 2 ceiling
const room2Ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize),
    new THREE.MeshStandardMaterial({ map: textures.wall })
);
room2Ceiling.rotation.x = Math.PI / 2;
room2Ceiling.position.set(room2Offset, wallHeight, 0);
scene.add(room2Ceiling);

// Room 2 walls
const room2WallNorth = new THREE.Mesh(wallGeometry, new THREE.MeshStandardMaterial({ map: textures.wall }));
room2WallNorth.position.set(room2Offset, wallHeight / 2, -roomSize / 2);
scene.add(room2WallNorth);
worldObjects.push(room2WallNorth);

const room2WallSouth = new THREE.Mesh(wallGeometry, new THREE.MeshStandardMaterial({ map: textures.wall }));
room2WallSouth.position.set(room2Offset, wallHeight / 2, roomSize / 2);
room2WallSouth.rotation.y = Math.PI;
scene.add(room2WallSouth);
worldObjects.push(room2WallSouth);

const room2WallEast = new THREE.Mesh(wallGeometry, new THREE.MeshStandardMaterial({ map: textures.wall }));
room2WallEast.position.set(room2Offset + roomSize / 2, wallHeight / 2, 0);
room2WallEast.rotation.y = -Math.PI / 2;
scene.add(room2WallEast);
worldObjects.push(room2WallEast);

// Room 2 west wall with doorway opening (completely open - no wall segments in door area)
const room2WestWallTop = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, 0.5),
    new THREE.MeshStandardMaterial({ map: textures.wall })
);
room2WestWallTop.position.set(room2Offset - roomSize / 2, wallHeight - 0.25, 0);
room2WestWallTop.rotation.y = Math.PI / 2;
scene.add(room2WestWallTop);
// NOT added to worldObjects - purely visual, no collision

const room2WestWallNorth = new THREE.Mesh(
    new THREE.PlaneGeometry(4, wallHeight),
    new THREE.MeshStandardMaterial({ map: textures.wall })
);
room2WestWallNorth.position.set(room2Offset - roomSize / 2, wallHeight / 2, -5.5);
room2WestWallNorth.rotation.y = Math.PI / 2;
scene.add(room2WestWallNorth);
worldObjects.push(room2WestWallNorth);

const room2WestWallSouth = new THREE.Mesh(
    new THREE.PlaneGeometry(4, wallHeight),
    new THREE.MeshStandardMaterial({ map: textures.wall })
);
room2WestWallSouth.position.set(room2Offset - roomSize / 2, wallHeight / 2, 5.5);
room2WestWallSouth.rotation.y = Math.PI / 2;
scene.add(room2WestWallSouth);
worldObjects.push(room2WestWallSouth);

// Dark ambient light for Room 2 (minimal base illumination)
const room2AmbientLight = new THREE.AmbientLight(0x001a1a, 0.15);
scene.add(room2AmbientLight);

// Add fog to Room 2 for dark atmosphere
scene.fog = new THREE.FogExp2(0x002200, 0.012);

// Remove bright ceiling lights - only cylinder glow will illuminate the room

// LAB CYLINDERS - 4 futuristic glass tanks reaching ceiling
const cylinders = [];

// Cylinder 1 - Full height, thin
const cyl1Height = wallHeight; // Reaches ceiling
const cyl1Radius = 0.4;
const cylinder1Group = new THREE.Group();

// Glass shell
const glass1 = new THREE.Mesh(
    new THREE.CylinderGeometry(cyl1Radius, cyl1Radius, cyl1Height, 32),
    new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.15,
        metalness: 0.9,
        roughness: 0.05
    })
);
glass1.position.y = cyl1Height / 2;
cylinder1Group.add(glass1);

// Liquid core
const liquid1 = new THREE.Mesh(
    new THREE.CylinderGeometry(cyl1Radius * 0.85, cyl1Radius * 0.85, cyl1Height * 0.9, 32),
    new THREE.MeshStandardMaterial({
        emissive: 0x00ff55,
        emissiveIntensity: 2.2,
        color: 0x00ff55,
        transparent: true,
        opacity: 0.85
    })
);
liquid1.position.y = cyl1Height / 2;
cylinder1Group.add(liquid1);

// Strong green light (primary illumination for dark room)
const greenLight1 = new THREE.PointLight(0x00ff55, 5.0, 25);
greenLight1.position.y = cyl1Height / 2;
cylinder1Group.add(greenLight1);

// Bubbles for cylinder 1
const bubbles1 = [];
for (let i = 0; i < 6; i++) {
    const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xccffcc, transparent: true, opacity: 0.5 })
    );
    bubble.position.set(
        (Math.random() - 0.5) * cyl1Radius * 1.2,
        Math.random() * cyl1Height,
        (Math.random() - 0.5) * cyl1Radius * 1.2
    );
    bubble.userData.speed = 0.01 + Math.random() * 0.01;
    bubble.userData.resetY = Math.random() * 0.5;
    bubbles1.push(bubble);
    cylinder1Group.add(bubble);
}

cylinder1Group.position.set(room2Offset + 5, 0, -5);
cylinder1Group.userData.liquid = liquid1;
cylinder1Group.userData.bubbles = bubbles1;
cylinder1Group.userData.height = cyl1Height;
cylinder1Group.userData.radius = cyl1Radius;
scene.add(cylinder1Group);
cylinders.push(cylinder1Group);

// Cylinder 2 - Full height, very thick
const cyl2Height = wallHeight; // Reaches ceiling
const cyl2Radius = 1.0;
const cylinder2Group = new THREE.Group();

// Glass shell
const glass2 = new THREE.Mesh(
    new THREE.CylinderGeometry(cyl2Radius, cyl2Radius, cyl2Height, 32),
    new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.15,
        metalness: 0.9,
        roughness: 0.05
    })
);
glass2.position.y = cyl2Height / 2;
cylinder2Group.add(glass2);

// Liquid core
const liquid2 = new THREE.Mesh(
    new THREE.CylinderGeometry(cyl2Radius * 0.85, cyl2Radius * 0.85, cyl2Height * 0.9, 32),
    new THREE.MeshStandardMaterial({
        emissive: 0x00ff55,
        emissiveIntensity: 2.2,
        color: 0x00ff55,
        transparent: true,
        opacity: 0.85
    })
);
liquid2.position.y = cyl2Height / 2;
cylinder2Group.add(liquid2);

// Green light
const greenLight2 = new THREE.PointLight(0x00ff55, 5.0, 25);
greenLight2.position.y = cyl2Height / 2;
cylinder2Group.add(greenLight2);

// Bubbles for cylinder 2
const bubbles2 = [];
for (let i = 0; i < 6; i++) {
    const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xccffcc, transparent: true, opacity: 0.5 })
    );
    bubble.position.set(
        (Math.random() - 0.5) * cyl2Radius * 1.2,
        Math.random() * cyl2Height,
        (Math.random() - 0.5) * cyl2Radius * 1.2
    );
    bubble.userData.speed = 0.01 + Math.random() * 0.01;
    bubble.userData.resetY = Math.random() * 0.5;
    bubbles2.push(bubble);
    cylinder2Group.add(bubble);
}

cylinder2Group.position.set(room2Offset + 5, 0, 5);
cylinder2Group.userData.liquid = liquid2;
cylinder2Group.userData.bubbles = bubbles2;
cylinder2Group.userData.height = cyl2Height;
cylinder2Group.userData.radius = cyl2Radius;
scene.add(cylinder2Group);
cylinders.push(cylinder2Group);

// Cylinder 3 - Full height, medium thickness
const cyl3Height = wallHeight; // Reaches ceiling
const cyl3Radius = 0.6;
const cylinder3Group = new THREE.Group();

const glass3 = new THREE.Mesh(
    new THREE.CylinderGeometry(cyl3Radius, cyl3Radius, cyl3Height, 32),
    new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.15,
        metalness: 0.9,
        roughness: 0.05
    })
);
glass3.position.y = cyl3Height / 2;
cylinder3Group.add(glass3);

const liquid3 = new THREE.Mesh(
    new THREE.CylinderGeometry(cyl3Radius * 0.85, cyl3Radius * 0.85, cyl3Height * 0.9, 32),
    new THREE.MeshStandardMaterial({
        emissive: 0x00ff55,
        emissiveIntensity: 2.2,
        color: 0x00ff55,
        transparent: true,
        opacity: 0.85
    })
);
liquid3.position.y = cyl3Height / 2;
cylinder3Group.add(liquid3);

const greenLight3 = new THREE.PointLight(0x00ff55, 5.0, 25);
greenLight3.position.y = cyl3Height / 2;
cylinder3Group.add(greenLight3);

const bubbles3 = [];
for (let i = 0; i < 6; i++) {
    const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xccffcc, transparent: true, opacity: 0.5 })
    );
    bubble.position.set(
        (Math.random() - 0.5) * cyl3Radius * 1.2,
        Math.random() * cyl3Height,
        (Math.random() - 0.5) * cyl3Radius * 1.2
    );
    bubble.userData.speed = 0.01 + Math.random() * 0.01;
    bubble.userData.resetY = Math.random() * 0.5;
    bubbles3.push(bubble);
    cylinder3Group.add(bubble);
}

cylinder3Group.position.set(room2Offset - 5, 0, -5);
cylinder3Group.userData.liquid = liquid3;
cylinder3Group.userData.bubbles = bubbles3;
cylinder3Group.userData.height = cyl3Height;
cylinder3Group.userData.radius = cyl3Radius;
scene.add(cylinder3Group);
cylinders.push(cylinder3Group);

// Cylinder 4 - Full height, wide (largest)
const cyl4Height = wallHeight; // Reaches ceiling
const cyl4Radius = 0.85;
const cylinder4Group = new THREE.Group();

const glass4 = new THREE.Mesh(
    new THREE.CylinderGeometry(cyl4Radius, cyl4Radius, cyl4Height, 32),
    new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.15,
        metalness: 0.9,
        roughness: 0.05
    })
);
glass4.position.y = cyl4Height / 2;
cylinder4Group.add(glass4);

const liquid4 = new THREE.Mesh(
    new THREE.CylinderGeometry(cyl4Radius * 0.85, cyl4Radius * 0.85, cyl4Height * 0.9, 32),
    new THREE.MeshStandardMaterial({
        emissive: 0x00ff55,
        emissiveIntensity: 2.2,
        color: 0x00ff55,
        transparent: true,
        opacity: 0.85
    })
);
liquid4.position.y = cyl4Height / 2;
cylinder4Group.add(liquid4);

const greenLight4 = new THREE.PointLight(0x00ff55, 5.0, 25);
greenLight4.position.y = cyl4Height / 2;
cylinder4Group.add(greenLight4);

const bubbles4 = [];
for (let i = 0; i < 6; i++) {
    const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xccffcc, transparent: true, opacity: 0.5 })
    );
    bubble.position.set(
        (Math.random() - 0.5) * cyl4Radius * 1.2,
        Math.random() * cyl4Height,
        (Math.random() - 0.5) * cyl4Radius * 1.2
    );
    bubble.userData.speed = 0.01 + Math.random() * 0.01;
    bubble.userData.resetY = Math.random() * 0.5;
    bubbles4.push(bubble);
    cylinder4Group.add(bubble);
}

cylinder4Group.position.set(room2Offset - 5, 0, 3);
cylinder4Group.userData.liquid = liquid4;
cylinder4Group.userData.bubbles = bubbles4;
cylinder4Group.userData.height = cyl4Height;
cylinder4Group.userData.radius = cyl4Radius;
scene.add(cylinder4Group);
cylinders.push(cylinder4Group);

// Laboratory desk (larger)
const labDesk = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 1.2, 1.5),
    new THREE.MeshStandardMaterial({ map: textures.deskChair })
);
labDesk.position.set(room2Offset - 3, 0.6, -3);
scene.add(labDesk);
worldObjects.push(labDesk);

// Laboratory chair (larger)
const labChair = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1.5, 1),
    new THREE.MeshStandardMaterial({ map: textures.deskChair })
);
labChair.position.set(room2Offset - 3, 0.75, -1.5);
scene.add(labChair);
worldObjects.push(labChair);

// Evidence 1: On desk surface (deliverable sketch)
const evidence1 = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.4),
    new THREE.MeshStandardMaterial({
        map: textures.evidence1,
        emissive: 0xaaffaa,
        emissiveIntensity: 0.3
    })
);
evidence1.position.set(room2Offset - 3, 1.25, -3);
evidence1.rotation.x = -Math.PI / 2;
scene.add(evidence1);
evidence1.userData.isCollectible = true;
evidence1.userData.itemType = 'evidence1';
evidence1.userData.texture = textures.evidence1;
evidence1.userData.isEvidence = true; // Flag for pulsing
interactiveObjects.push(evidence1);

// Evidence 2: Wall poster (deliverable sketch)
const evidence2 = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.8),
    new THREE.MeshStandardMaterial({
        map: textures.evidence2,
        emissive: 0xaaffaa,
        emissiveIntensity: 0.3
    })
);
evidence2.position.set(room2Offset, 2.5, -roomSize / 2 + 0.05);
evidence2.rotation.y = 0;
scene.add(evidence2);
evidence2.userData.isCollectible = true;
evidence2.userData.itemType = 'evidence2';
evidence2.userData.texture = textures.evidence2;
evidence2.userData.isEvidence = true; // Flag for pulsing
interactiveObjects.push(evidence2);

// Evidence 3: On floor (deliverable sketch)
const evidence3 = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshStandardMaterial({
        map: textures.evidence3,
        emissive: 0xaaffaa,
        emissiveIntensity: 0.3
    })
);
evidence3.position.set(room2Offset + 4, 0.01, 4);
evidence3.rotation.x = -Math.PI / 2;
scene.add(evidence3);
evidence3.userData.isCollectible = true;
evidence3.userData.itemType = 'evidence3';
evidence3.userData.texture = textures.evidence3;
evidence3.userData.isEvidence = true; // Flag for pulsing
interactiveObjects.push(evidence3);

// Build Garden Interior (in same scene, behind wooden door)
buildGardenInterior();

// GARDEN SCENE
function buildGardenScene() {
    // Clear current scene
    while(scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }
    scene.add(camera);
    worldObjects.length = 0;
    interactiveObjects.length = 0;
    gardenObjects.length = 0;

    currentScene = 'garden';
    camera.position.set(-roomSize / 2 + 1, 2.5, 0);

    // Garden ground with height variation
    const gardenSize = 20;
    const groundGeometry = new THREE.PlaneGeometry(gardenSize, gardenSize, 32, 32);
    const vertices = groundGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        vertices[i + 2] = Math.random() * 0.3 - 0.15;
    }
    groundGeometry.attributes.position.needsUpdate = true;
    groundGeometry.computeVertexNormals();

    const ground = new THREE.Mesh(
        groundGeometry,
        new THREE.MeshStandardMaterial({ map: textures.gardenSoil })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);
    worldObjects.push(ground);

    // Magical ambient lighting
    const ambientLight = new THREE.AmbientLight(0xaaff88, 0.8);
    scene.add(ambientLight);

    const warmLight = new THREE.DirectionalLight(0xffffaa, 0.6);
    warmLight.position.set(5, 10, 5);
    scene.add(warmLight);

    // Hedge walls (green plant walls)
    const hedgeMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5016 });

    const hedgeNorth = new THREE.Mesh(
        new THREE.BoxGeometry(gardenSize, 3, 1),
        hedgeMaterial
    );
    hedgeNorth.position.set(0, 1.5, -gardenSize / 2);
    scene.add(hedgeNorth);
    worldObjects.push(hedgeNorth);

    const hedgeSouth = new THREE.Mesh(
        new THREE.BoxGeometry(gardenSize, 3, 1),
        hedgeMaterial
    );
    hedgeSouth.position.set(0, 1.5, gardenSize / 2);
    scene.add(hedgeSouth);
    worldObjects.push(hedgeSouth);

    const hedgeEast = new THREE.Mesh(
        new THREE.BoxGeometry(1, 3, gardenSize),
        hedgeMaterial
    );
    hedgeEast.position.set(gardenSize / 2, 1.5, 0);
    scene.add(hedgeEast);
    worldObjects.push(hedgeEast);

    const hedgeWest = new THREE.Mesh(
        new THREE.BoxGeometry(1, 3, gardenSize - 4),
        hedgeMaterial
    );
    hedgeWest.position.set(-gardenSize / 2, 1.5, 0);
    scene.add(hedgeWest);
    worldObjects.push(hedgeWest);

    // 3D Flower bushes
    const bushPositions = [
        { x: -6, z: -6 }, { x: -4, z: -8 }, { x: 6, z: -7 },
        { x: 8, z: -4 }, { x: -7, z: 5 }, { x: -3, z: 7 },
        { x: 4, z: 6 }, { x: 7, z: 8 }, { x: -8, z: -2 },
        { x: 8, z: 2 }, { x: -5, z: 0 }, { x: 5, z: -2 }
    ];

    bushPositions.forEach((pos, idx) => {
        const bushGroup = new THREE.Group();

        // Green foliage
        const bushHeight = 0.8 + Math.random() * 0.5;
        const bushRadius = 0.6 + Math.random() * 0.4;
        const foliage = new THREE.Mesh(
            new THREE.SphereGeometry(bushRadius, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x3a7d44, roughness: 0.9 })
        );
        foliage.position.y = bushHeight;
        foliage.scale.y = 0.7;
        bushGroup.add(foliage);

        // Colorful flowers
        for (let i = 0; i < 8; i++) {
            const flower = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 6, 6),
                new THREE.MeshStandardMaterial({
                    color: [0xff69b4, 0xffff00, 0xff6347, 0x9370db][Math.floor(Math.random() * 4)],
                    emissive: [0xff69b4, 0xffff00, 0xff6347, 0x9370db][Math.floor(Math.random() * 4)],
                    emissiveIntensity: 0.3
                })
            );
            const angle = (Math.PI * 2 * i) / 8;
            flower.position.set(
                Math.cos(angle) * bushRadius * 0.8,
                bushHeight + Math.random() * 0.3,
                Math.sin(angle) * bushRadius * 0.8
            );
            bushGroup.add(flower);
        }

        bushGroup.position.set(pos.x, 0, pos.z);
        scene.add(bushGroup);
        gardenObjects.push(bushGroup);
    });

    // Magical fountain in center
    const fountainGroup = new THREE.Group();

    // Stone base
    const fountainBase = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.8, 0.5, 16),
        new THREE.MeshStandardMaterial({ color: 0x8b7d6b, roughness: 0.7 })
    );
    fountainBase.position.y = 0.25;
    fountainGroup.add(fountainBase);

    // Water basin
    const waterBasin = new THREE.Mesh(
        new THREE.CylinderGeometry(1.3, 1.3, 0.3, 16),
        new THREE.MeshStandardMaterial({
            color: 0x88ffee,
            emissive: 0x44ccaa,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.7,
            metalness: 0.3,
            roughness: 0.1
        })
    );
    waterBasin.position.y = 0.55;
    fountainGroup.add(waterBasin);
    fountainGroup.userData.waterBasin = waterBasin;

    // Water particles
    const particles = [];
    for (let i = 0; i < 20; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0xaaffff, transparent: true, opacity: 0.6 })
        );
        particle.position.set(
            (Math.random() - 0.5) * 0.3,
            0.7 + Math.random() * 0.5,
            (Math.random() - 0.5) * 0.3
        );
        particle.userData.speed = 0.01 + Math.random() * 0.02;
        particle.userData.resetY = 0.7;
        particles.push(particle);
        fountainGroup.add(particle);
    }
    fountainGroup.userData.particles = particles;

    // Fountain glow light
    const fountainLight = new THREE.PointLight(0x88ffee, 0.6, 8);
    fountainLight.position.y = 0.7;
    fountainGroup.add(fountainLight);

    scene.add(fountainGroup);
    gardenObjects.push(fountainGroup);

    // Bone collectible (hidden in bush)
    const bone = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.05, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xf5f5dc })
    );
    bone.position.set(-6, 0.5, -6);
    bone.rotation.y = Math.random() * Math.PI;
    scene.add(bone);
    bone.userData.isCollectible = true;
    bone.userData.itemType = 'bone';
    bone.userData.texture = textures.evidence1;
    interactiveObjects.push(bone);

    // Footprint on ground
    const footprintMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.8),
        new THREE.MeshStandardMaterial({ map: textures.footprint, transparent: true })
    );
    footprintMesh.rotation.x = -Math.PI / 2;
    footprintMesh.position.set(3, 0.05, -4);
    scene.add(footprintMesh);
    footprintMesh.userData.isCollectible = true;
    footprintMesh.userData.itemType = 'footprint';
    footprintMesh.userData.texture = textures.footprintPhoto;
    interactiveObjects.push(footprintMesh);

    // Glowing feather (in bush)
    const feather = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, 0.4),
        new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xaaddff,
            emissiveIntensity: 1.5,
            transparent: true,
            side: THREE.DoubleSide
        })
    );
    feather.position.set(7, 0.8, 6);
    feather.rotation.y = Math.random() * Math.PI;
    scene.add(feather);
    feather.userData.isCollectible = true;
    feather.userData.itemType = 'feather';
    feather.userData.texture = textures.evidence2;
    feather.userData.bobTime = 0;
    interactiveObjects.push(feather);
    gardenObjects.push(feather);
}

// Build Garden Interior (greenhouse behind wooden door)
function buildGardenInterior() {
    const gardenOffsetX = -17.5; // Garden center X position (RIGHT behind wooden door)
    const gardenSize = 20;

    // Garden ground with grass/moss texture
    const groundGeometry = new THREE.PlaneGeometry(gardenSize, gardenSize, 32, 32);
    const vertices = groundGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        vertices[i + 2] = Math.random() * 0.2 - 0.1; // Slight height variation
    }
    groundGeometry.attributes.position.needsUpdate = true;
    groundGeometry.computeVertexNormals();

    const ground = new THREE.Mesh(
        groundGeometry,
        new THREE.MeshStandardMaterial({
            map: textures.gardenGrass,
            color: 0xf5f5dc // Soft beige tint for dreamy atmosphere
        })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(gardenOffsetX, 0, 0);
    scene.add(ground);
    worldObjects.push(ground);

    // Dreamy glass conservatory - semi-transparent glass with soft reflections
    const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        transmission: 0.9,
        metalness: 0.0,
        roughness: 0.1,
        ior: 1.5,
        thickness: 0.5,
        envMapIntensity: 0.5,
        side: THREE.DoubleSide
    });

    const wallHeight = 10; // Taller walls for grand conservatory feel

    // North glass wall
    const glassNorth = new THREE.Mesh(
        new THREE.PlaneGeometry(gardenSize, wallHeight),
        glassMaterial
    );
    glassNorth.position.set(gardenOffsetX, wallHeight / 2, -gardenSize / 2);
    scene.add(glassNorth);

    // South glass wall
    const glassSouth = new THREE.Mesh(
        new THREE.PlaneGeometry(gardenSize, wallHeight),
        glassMaterial
    );
    glassSouth.position.set(gardenOffsetX, wallHeight / 2, gardenSize / 2);
    glassSouth.rotation.y = Math.PI;
    scene.add(glassSouth);

    // West glass wall
    const glassWest = new THREE.Mesh(
        new THREE.PlaneGeometry(gardenSize, wallHeight),
        glassMaterial
    );
    glassWest.position.set(gardenOffsetX - gardenSize / 2, wallHeight / 2, 0);
    glassWest.rotation.y = Math.PI / 2;
    scene.add(glassWest);

    // East glass wall - split around doorway opening (Room1 west wall is the opaque barrier)
    const doorWidth = 3; // Matches wooden door exactly
    const doorHeight = 4.5; // Matches wooden door exactly
    const doorCenterY = 2.25; // Matches wooden door center height

    // Glass panels split to avoid covering doorway (Room1 wall already exists behind)
    const topSegmentHeight = wallHeight - doorHeight - doorCenterY + wallHeight / 2;
    const northSegmentWidth = (gardenSize - doorWidth) / 2;

    const glassEastTop = new THREE.Mesh(
        new THREE.PlaneGeometry(gardenSize, topSegmentHeight),
        glassMaterial
    );
    glassEastTop.position.set(
        gardenOffsetX + gardenSize / 2,
        doorCenterY + doorHeight / 2 + topSegmentHeight / 2,
        0
    );
    glassEastTop.rotation.y = -Math.PI / 2;
    scene.add(glassEastTop);

    const glassEastNorth = new THREE.Mesh(
        new THREE.PlaneGeometry(northSegmentWidth, doorHeight),
        glassMaterial
    );
    glassEastNorth.position.set(
        gardenOffsetX + gardenSize / 2,
        doorCenterY,
        -doorWidth / 2 - northSegmentWidth / 2
    );
    glassEastNorth.rotation.y = -Math.PI / 2;
    scene.add(glassEastNorth);

    const glassEastSouth = new THREE.Mesh(
        new THREE.PlaneGeometry(northSegmentWidth, doorHeight),
        glassMaterial
    );
    glassEastSouth.position.set(
        gardenOffsetX + gardenSize / 2,
        doorCenterY,
        doorWidth / 2 + northSegmentWidth / 2
    );
    glassEastSouth.rotation.y = -Math.PI / 2;
    scene.add(glassEastSouth);

    // Curved glass dome ceiling (arch shape, botanical palace style)
    const domeSegments = 16;
    const domeRadius = gardenSize / 1.5;
    const domeHeight = 12;

    // Create curved dome using hemisphere geometry
    const domeGeometry = new THREE.SphereGeometry(domeRadius, domeSegments, domeSegments / 2, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeometry, glassMaterial);
    dome.position.set(gardenOffsetX, wallHeight, 0);
    scene.add(dome);

    // White structural frames (elegant conservatory style)
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0xf8f8f8,
        metalness: 0.6,
        roughness: 0.2
    });

    // Vertical corner posts (taller for grand conservatory)
    const postPositions = [
        [gardenOffsetX - gardenSize / 2, wallHeight / 2, -gardenSize / 2],
        [gardenOffsetX + gardenSize / 2, wallHeight / 2, -gardenSize / 2],
        [gardenOffsetX - gardenSize / 2, wallHeight / 2, gardenSize / 2],
        [gardenOffsetX + gardenSize / 2, wallHeight / 2, gardenSize / 2]
    ];
    postPositions.forEach(pos => {
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, wallHeight, 8),
            frameMaterial
        );
        post.position.set(...pos);
        scene.add(post);
    });

    // Additional vertical supports around perimeter (every 4 units)
    const perimeterPosts = [];
    for (let i = -gardenSize / 2; i <= gardenSize / 2; i += 4) {
        if (Math.abs(i) < 2) continue; // Skip doorway area on east side

        // North wall posts
        const northPost = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, wallHeight, 8),
            frameMaterial
        );
        northPost.position.set(gardenOffsetX + i, wallHeight / 2, -gardenSize / 2);
        scene.add(northPost);

        // South wall posts
        const southPost = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, wallHeight, 8),
            frameMaterial
        );
        southPost.position.set(gardenOffsetX + i, wallHeight / 2, gardenSize / 2);
        scene.add(southPost);

        // West wall posts
        const westPost = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, wallHeight, 8),
            frameMaterial
        );
        westPost.position.set(gardenOffsetX - gardenSize / 2, wallHeight / 2, i);
        scene.add(westPost);
    }

    // Horizontal frame beams at mid-height (curved window tops)
    for (let i = -gardenSize / 2; i <= gardenSize / 2; i += 4) {
        if (Math.abs(i) < 2) continue; // Skip doorway

        // Create arched window frame tops
        const archCurve = new THREE.TorusGeometry(2, 0.06, 8, 16, Math.PI);
        const archTop = new THREE.Mesh(archCurve, frameMaterial);
        archTop.rotation.z = Math.PI;
        archTop.position.set(gardenOffsetX + i, wallHeight * 0.6, -gardenSize / 2 + 0.1);
        scene.add(archTop);
    }

    // Dome structural ribs (radial pattern from center)
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const ribCurve = new THREE.TorusGeometry(domeRadius * 0.8, 0.08, 8, 16, Math.PI);
        const rib = new THREE.Mesh(ribCurve, frameMaterial);
        rib.rotation.y = angle;
        rib.rotation.x = Math.PI / 2;
        rib.position.set(gardenOffsetX, wallHeight + domeRadius * 0.3, 0);
        scene.add(rib);
    }

    // Strong natural sunlight from above (golden hour glow)
    const sunLight = new THREE.DirectionalLight(0xfff4d6, 2.5);
    sunLight.position.set(gardenOffsetX, wallHeight + domeHeight, 3);
    sunLight.target.position.set(gardenOffsetX, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
    scene.add(sunLight.target);

    // Wide global illumination - soft warm highlights, pastel golden + green
    const gardenAmbient = new THREE.AmbientLight(0xf5e6d3, 1.8);
    scene.add(gardenAmbient);

    // Pastel green fill light
    const greenFill = new THREE.HemisphereLight(0xdfffcc, 0xe8f5e0, 1.2);
    scene.add(greenFill);

    // Multiple warm point lights for soft highlights (no dark areas)
    const warmLightPositions = [
        [gardenOffsetX - 6, 6, -6],
        [gardenOffsetX + 6, 6, -6],
        [gardenOffsetX - 6, 6, 6],
        [gardenOffsetX + 6, 6, 6],
        [gardenOffsetX, 8, 0]
    ];
    warmLightPositions.forEach(pos => {
        const warmLight = new THREE.PointLight(0xfff8e7, 0.8, 25);
        warmLight.position.set(...pos);
        scene.add(warmLight);
    });

    // God-rays effect through ceiling (volumetric light simulation)
    const godRayPositions = [
        [gardenOffsetX - 4, wallHeight + 2, -4],
        [gardenOffsetX + 4, wallHeight + 2, -4],
        [gardenOffsetX, wallHeight + 3, 0],
        [gardenOffsetX - 4, wallHeight + 2, 4],
        [gardenOffsetX + 4, wallHeight + 2, 4]
    ];
    godRayPositions.forEach(pos => {
        const godRay = new THREE.SpotLight(0xfffaee, 1.5, 30, Math.PI / 6, 0.3, 0.8);
        godRay.position.set(...pos);
        godRay.target.position.set(pos[0], 0, pos[2]);
        scene.add(godRay);
        scene.add(godRay.target);
    });

    // Garden boundary colliders (invisible walls)
    const boundaryMaterial = new THREE.MeshBasicMaterial({ visible: false });

    // North boundary
    const northBoundary = new THREE.Mesh(
        new THREE.BoxGeometry(gardenSize, wallHeight, 0.5),
        boundaryMaterial
    );
    northBoundary.position.set(gardenOffsetX, wallHeight / 2, -gardenSize / 2);
    scene.add(northBoundary);
    worldObjects.push(northBoundary);

    // South boundary
    const southBoundary = new THREE.Mesh(
        new THREE.BoxGeometry(gardenSize, wallHeight, 0.5),
        boundaryMaterial
    );
    southBoundary.position.set(gardenOffsetX, wallHeight / 2, gardenSize / 2);
    scene.add(southBoundary);
    worldObjects.push(southBoundary);

    // West boundary
    const westBoundary = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, wallHeight, gardenSize),
        boundaryMaterial
    );
    westBoundary.position.set(gardenOffsetX - gardenSize / 2, wallHeight / 2, 0);
    scene.add(westBoundary);
    worldObjects.push(westBoundary);

    // East boundary (with opening for door entrance)
    const eastBoundaryNorth = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, wallHeight, 6),
        boundaryMaterial
    );
    eastBoundaryNorth.position.set(gardenOffsetX + gardenSize / 2, wallHeight / 2, -7);
    scene.add(eastBoundaryNorth);
    worldObjects.push(eastBoundaryNorth);

    const eastBoundarySouth = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, wallHeight, 6),
        boundaryMaterial
    );
    eastBoundarySouth.position.set(gardenOffsetX + gardenSize / 2, wallHeight / 2, 7);
    scene.add(eastBoundarySouth);
    worldObjects.push(eastBoundarySouth);

    // Realistic rounded bushes using cross-plane geometry with texture
    // Positioned 2.5m+ from fountain, avoiding bone (-4, -6) and footprint (3, -4)
    const bushPositions = [
        { x: -6, z: -7 }, { x: 6, z: -7 }, { x: -7, z: -3 },
        { x: 7, z: -3 }, { x: -6, z: 7 }, { x: 6, z: 7 },
        { x: -8, z: -5 }, { x: 8, z: -5 }, { x: -7, z: 5 },
        { x: 7, z: 5 }, { x: -5, z: -8 }, { x: 5, z: -8 },
        { x: -5, z: 8 }, { x: 5, z: 8 }
    ];

    bushPositions.forEach(pos => {
        const bushGroup = new THREE.Group();

        // Randomize bush size and appearance
        const bushHeight = 0.7 + Math.random() * 0.7; // 0.7 - 1.4
        const bushRadius = 0.4 + Math.random() * 0.4; // 0.4 - 0.8
        const numPlanes = 6 + Math.floor(Math.random() * 3); // 6-8 planes
        const scaleNoise = 0.9 + Math.random() * 0.2; // 0.9 - 1.1

        // Color variation (±10% hue and brightness)
        const hueShift = (Math.random() - 0.5) * 0.2; // ±10%
        const brightnessShift = 0.9 + Math.random() * 0.2; // 90%-110%
        const baseColor = new THREE.Color(0x6b8e5a);
        baseColor.offsetHSL(hueShift, 0, (brightnessShift - 1) * 0.1);

        // Bush material with texture
        const bushMaterial = new THREE.MeshStandardMaterial({
            map: textures.bushTexture,
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide,
            color: baseColor,
            roughness: 0.8
        });

        // Create cross-plane geometry
        for (let i = 0; i < numPlanes; i++) {
            const angle = (Math.PI / numPlanes) * i;
            const plane = new THREE.Mesh(
                new THREE.PlaneGeometry(bushRadius * 2 * scaleNoise, bushHeight * scaleNoise),
                bushMaterial
            );
            plane.position.y = bushHeight / 2;
            plane.rotation.y = angle;
            bushGroup.add(plane);
        }

        bushGroup.position.set(gardenOffsetX + pos.x, 0, pos.z);
        bushGroup.userData.isBush = true;
        bushGroup.userData.windOffset = Math.random() * Math.PI * 2;
        bushGroup.userData.windSpeed = 0.15 + Math.random() * 0.05; // 0.15-0.2
        scene.add(bushGroup);
        gardenObjects.push(bushGroup);

        // Add flower cluster at bush base
        const flowerClusterGroup = new THREE.Group();
        const numFlowers = 3 + Math.floor(Math.random() * 4); // 3-6 flowers per bush

        for (let f = 0; f < numFlowers; f++) {
            const flowerSize = 0.12 + Math.random() * 0.08;

            // Slight HSL random shift for color variation
            const flowerHue = Math.random(); // Random hue
            const flowerColor = new THREE.Color().setHSL(flowerHue, 0.7, 0.7);

            const flower = new THREE.Mesh(
                new THREE.PlaneGeometry(flowerSize, flowerSize),
                new THREE.MeshStandardMaterial({
                    map: textures.flowerTexture,
                    transparent: true,
                    alphaTest: 0.5,
                    side: THREE.DoubleSide,
                    color: flowerColor,
                    emissive: flowerColor,
                    emissiveIntensity: 0.3
                })
            );
            flower.position.set(
                (Math.random() - 0.5) * bushRadius * 1.5,
                0.05,
                (Math.random() - 0.5) * bushRadius * 1.5
            );
            flower.rotation.x = -Math.PI / 2;
            flower.rotation.z = Math.random() * Math.PI * 2;
            flowerClusterGroup.add(flower);
        }

        flowerClusterGroup.position.set(gardenOffsetX + pos.x, 0, pos.z);
        scene.add(flowerClusterGroup);
        gardenObjects.push(flowerClusterGroup);
    });

    // Tall thin trees with soft leaves (NOT cubes!)
    const tallTreePositions = [
        { x: -8, z: -8 }, { x: 8, z: -8 },
        { x: -8, z: 8 }, { x: 8, z: 8 }
    ];

    tallTreePositions.forEach(pos => {
        const treeGroup = new THREE.Group();

        // Tall thin trunk (dark brown)
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.15, 6, 8),
            new THREE.MeshStandardMaterial({
                color: 0x3e2a1f,
                roughness: 0.95
            })
        );
        trunk.position.y = 3;
        treeGroup.add(trunk);

        // Soft leaves - multiple layers of crossed transparent planes
        const leafLayers = 4;
        for (let layer = 0; layer < leafLayers; layer++) {
            const layerY = 4.5 + layer * 0.8;
            const layerSize = 2.0 - layer * 0.3;

            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const leaf = new THREE.Mesh(
                    new THREE.PlaneGeometry(layerSize, layerSize * 1.2),
                    new THREE.MeshStandardMaterial({
                        color: 0x4a6b3a,
                        transparent: true,
                        opacity: 0.7,
                        side: THREE.DoubleSide
                    })
                );
                leaf.position.y = layerY;
                leaf.rotation.y = angle;
                leaf.rotation.x = (Math.random() - 0.5) * 0.4;
                treeGroup.add(leaf);
            }
        }

        treeGroup.position.set(gardenOffsetX + pos.x, 0, pos.z);
        scene.add(treeGroup);
        gardenObjects.push(treeGroup);
    });

    // Center fountain - smooth stone bowl with magical water
    const fountainGroup = new THREE.Group();

    // Smooth stone bowl (hemisphere shape)
    const bowlGeometry = new THREE.SphereGeometry(1.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const stoneBowl = new THREE.Mesh(
        bowlGeometry,
        new THREE.MeshStandardMaterial({
            map: textures.stoneTexture,
            roughness: 0.6,
            color: 0xe8e0d8 // Soft cream stone tint
        })
    );
    stoneBowl.position.y = 0.3;
    stoneBowl.rotation.x = Math.PI; // Flip to create bowl shape
    fountainGroup.add(stoneBowl);

    // Magical water surface with shimmer texture
    textures.waterNormalTexture.wrapS = textures.waterNormalTexture.wrapT = THREE.RepeatWrapping;
    textures.waterNormalTexture.repeat.set(3, 3);

    const waterSurface = new THREE.Mesh(
        new THREE.CircleGeometry(1.5, 32),
        new THREE.MeshPhysicalMaterial({
            map: textures.waterNormalTexture,
            color: 0xb8e6ff,
            emissive: 0x88d4ff,
            emissiveIntensity: 0.5,
            transmission: 0.95,
            opacity: 1,
            roughness: 0.05,
            ior: 1.33,
            thickness: 0.3,
            normalMap: textures.waterNormalTexture,
            normalScale: new THREE.Vector2(0.5, 0.5),
            transparent: true
        })
    );
    waterSurface.rotation.x = -Math.PI / 2;
    waterSurface.position.y = 0.6;
    fountainGroup.add(waterSurface);
    fountainGroup.userData.waterSurface = waterSurface;

    // Magical glow particles rising from water (subtle shimmer)
    const particles = [];
    for (let i = 0; i < 30; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 6, 6),
            new THREE.MeshBasicMaterial({
                color: 0xddeeff,
                transparent: true,
                opacity: 0.6
            })
        );
        particle.position.set(
            (Math.random() - 0.5) * 1.2,
            0.65 + Math.random() * 0.4,
            (Math.random() - 0.5) * 1.2
        );
        particle.userData.speed = 0.005 + Math.random() * 0.01;
        particle.userData.resetY = 0.65;
        particle.userData.floatOffset = Math.random() * Math.PI * 2;
        particles.push(particle);
        fountainGroup.add(particle);
    }
    fountainGroup.userData.particles = particles;

    // Gentle magical glow light
    const fountainLight = new THREE.PointLight(0xaaddff, 0.9, 12);
    fountainLight.position.y = 0.7;
    fountainGroup.add(fountainLight);

    fountainGroup.position.set(gardenOffsetX, 0, 0);
    scene.add(fountainGroup);
    gardenObjects.push(fountainGroup);

    // BONE collectible (glowing, with texture, near bushes)
    const bone = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.5),
        new THREE.MeshStandardMaterial({
            map: textures.boneTexture,
            transparent: true,
            emissive: 0x88ff88,
            emissiveIntensity: 1.6,
            side: THREE.DoubleSide
        })
    );
    bone.position.set(gardenOffsetX - 4, 0.25, -6);
    bone.rotation.x = -Math.PI / 2; // Lay flat on ground
    bone.rotation.z = Math.random() * Math.PI;
    scene.add(bone);
    bone.userData.isCollectible = true;
    bone.userData.itemType = 'bone';
    bone.userData.texture = textures.evidence1;
    bone.userData.isBone = true; // Flag for pulsing animation
    interactiveObjects.push(bone);
    gardenObjects.push(bone);

    // Bone glow light
    const boneLight = new THREE.PointLight(0xaaffaa, 0.5, 4);
    boneLight.position.copy(bone.position);
    scene.add(boneLight);
    bone.userData.glowLight = boneLight;

    // FOOTPRINT collectible (glowing, on ground)
    const footprintMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.8),
        new THREE.MeshStandardMaterial({
            map: textures.footprint,
            transparent: true,
            emissive: 0xaaffaa,
            emissiveIntensity: 1.0
        })
    );
    footprintMesh.rotation.x = -Math.PI / 2;
    footprintMesh.position.set(gardenOffsetX + 3, 0.02, -4);
    scene.add(footprintMesh);
    footprintMesh.userData.isCollectible = true;
    footprintMesh.userData.itemType = 'footprint';
    footprintMesh.userData.texture = textures.footprintPhoto;
    footprintMesh.userData.isFootprint = true; // Special flag for photo popup
    interactiveObjects.push(footprintMesh);
    gardenObjects.push(footprintMesh);

    // Sparkling dust particles floating in air (atmospheric effect)
    const dustParticles = [];
    for (let i = 0; i < 80; i++) {
        const dustParticle = new THREE.Mesh(
            new THREE.SphereGeometry(0.015, 4, 4),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.4
            })
        );
        dustParticle.position.set(
            gardenOffsetX + (Math.random() - 0.5) * gardenSize,
            Math.random() * wallHeight,
            (Math.random() - 0.5) * gardenSize
        );
        dustParticle.userData.floatSpeed = 0.003 + Math.random() * 0.005;
        dustParticle.userData.drift = (Math.random() - 0.5) * 0.01;
        dustParticle.userData.sparkleOffset = Math.random() * Math.PI * 2;
        dustParticles.push(dustParticle);
        scene.add(dustParticle);
        gardenObjects.push(dustParticle);
    }

    console.log('Garden interior built behind wooden door');
}

// Raycaster for clicks
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onClick(event) {
    if (event.target !== renderer.domElement) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects);

    if (intersects.length > 0) {
        const obj = intersects[0].object;

        // Final letter click
        if (obj.userData.isFinalLetter) {
            showFinalMessage();
            scene.remove(obj);
            const idx = interactiveObjects.indexOf(obj);
            if (idx > -1) interactiveObjects.splice(idx, 1);
            return;
        }

        if (obj.userData.isCollectible && !obj.userData.collected) {
            // Collect item with lift animation
            obj.userData.collected = true;

            // Special handling for footprint - show photo popup
            if (obj.userData.isFootprint) {
                // Brighten animation
                const originalIntensity = obj.material.emissiveIntensity;
                let brightenProgress = 0;
                const brightenAnim = setInterval(() => {
                    brightenProgress += 0.1;
                    obj.material.emissiveIntensity = originalIntensity + Math.sin(brightenProgress * Math.PI) * 0.6;

                    if (brightenProgress >= 1) {
                        clearInterval(brightenAnim);
                        obj.visible = false;

                        // Show photo popup for 1 second
                        const popup = document.createElement('div');
                        popup.style.position = 'fixed';
                        popup.style.top = '50%';
                        popup.style.left = '50%';
                        popup.style.transform = 'translate(-50%, -50%)';
                        popup.style.width = '300px';
                        popup.style.height = '400px';
                        popup.style.backgroundImage = `url(${obj.userData.texture.image.src})`;
                        popup.style.backgroundSize = 'contain';
                        popup.style.backgroundRepeat = 'no-repeat';
                        popup.style.backgroundPosition = 'center';
                        popup.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                        popup.style.border = '3px solid white';
                        popup.style.zIndex = '10000';
                        popup.style.pointerEvents = 'none';
                        document.body.appendChild(popup);

                        setTimeout(() => {
                            document.body.removeChild(popup);
                        }, 1000);
                    }
                }, 16);
            } else {
                // Normal lift animation for other items
                const startY = obj.position.y;
                let liftProgress = 0;
                const liftAnim = setInterval(() => {
                    liftProgress += 0.05;
                    obj.position.y = startY + Math.sin(liftProgress * Math.PI) * 0.3;

                    if (liftProgress >= 1) {
                        clearInterval(liftAnim);
                        obj.visible = false;
                    }
                }, 16);
            }

            inventory.push({
                type: obj.userData.itemType,
                texture: obj.userData.texture,
                mesh: obj
            });
            updateInventoryUI();
            console.log('Collected:', obj.userData.itemType);
        } else if (obj.userData.isCardReader) {
            const hasCard = inventory.some(item => item.type === 'card');
            if (hasCard) {
                const door = scene.children.find(child => child.userData.isExitDoor);
                if (door && door.userData.closed) {
                    door.userData.closed = false;
                    console.log('Exit door opening');
                    const slideAnim = setInterval(() => {
                        door.position.z += 0.1;
                        if (door.position.z > 5) {
                            clearInterval(slideAnim);
                            const collider = worldObjects.find(w => w.userData.doorCollider && w.userData.door === door);
                            if (collider) {
                                worldObjects.splice(worldObjects.indexOf(collider), 1);
                                scene.remove(collider);
                            }
                        }
                    }, 16);
                }
            } else {
                console.log('Need card to open exit door');
            }
        } else if (obj.userData.isWoodenDoor && obj.userData.closed) {
            const hasGoldenKey = inventory.some(item => item.type === 'goldenKey');
            if (hasGoldenKey) {
                obj.userData.closed = false;
                console.log('Wooden door opening');

                // Slide door open along Z-axis
                const targetZ = obj.position.z + 4.5;
                const openAnim = setInterval(() => {
                    obj.position.z += 0.1;

                    if (obj.position.z >= targetZ) {
                        clearInterval(openAnim);
                        obj.position.z = targetZ;

                        // Remove collider so player can walk through
                        const collider = worldObjects.find(w => w.userData.woodenDoorCollider && w.userData.door === obj);
                        if (collider) {
                            worldObjects.splice(worldObjects.indexOf(collider), 1);
                            scene.remove(collider);
                        }
                        console.log('Wooden door fully opened - you can now walk through');
                    }
                }, 16);
            } else {
                console.log('Need golden key to open wooden door');
            }
        }
    }
}

function updateInventoryUI() {
    const panel = document.getElementById('inventory-panel');
    panel.innerHTML = '';

    inventory.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'inventory-item';
        div.dataset.index = index;

        // Use bone backpack icon for bone, footprint photo for footprint
        if (item.type === 'bone' && textures.boneBackpack) {
            div.style.backgroundImage = `url(${textures.boneBackpack.image.src})`;
        } else if (item.texture) {
            div.style.backgroundImage = `url(${item.texture.image.src})`;
        }

        // Highlight if selected
        if (index === selectedInventoryIndex) {
            div.style.border = '3px solid yellow';
            div.style.boxShadow = '0 0 10px yellow';
        }

        // Single click - select
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            if (selectedInventoryIndex === index) {
                selectedInventoryIndex = -1;
            } else {
                selectedInventoryIndex = index;
            }
            updateInventoryUI();
        });

        // Double click - drop to world
        div.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            dropEvidenceToWorld(index);
        });

        panel.appendChild(div);
    });
}

document.getElementById('backpack').addEventListener('click', () => {
    const panel = document.getElementById('inventory-panel');
    panel.classList.toggle('open');
});

// Mouse controls
function onMouseDown(event) {
    if (event.button === 0) {
        // Check for evidence dragging first
        startDragEvidence(event);

        if (!isDragging) {
            isMouseDown = true;
            previousMousePosition = { x: event.clientX, y: event.clientY };
        }
    }
}

function onMouseUp(event) {
    if (event.button === 0) {
        endDragEvidence();
        isMouseDown = false;
    }
}

function onMouseMove(event) {
    // Update drag if dragging evidence
    if (isDragging) {
        updateDragEvidence(event);
        return;
    }

    if (isMouseDown) {
        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;

        yaw -= deltaX * 0.002;
        pitch -= deltaY * 0.002;
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

        previousMousePosition = { x: event.clientX, y: event.clientY };
    } else {
        // Hover detection for bone evidence
        const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
        const intersects = raycaster.intersectObjects(interactiveObjects);

        // Reset all bone emissive intensities
        gardenObjects.forEach(obj => {
            if (obj.userData.isBone && !obj.userData.collected) {
                obj.material.emissiveIntensity = 1.4 + Math.sin(Date.now() * 0.002) * 0.4;
            }
        });

        // Brighten bone on hover
        if (intersects.length > 0) {
            const obj = intersects[0].object;
            if (obj.userData.isBone && !obj.userData.collected) {
                obj.material.emissiveIntensity = 2.0;
            }
        }
    }
}

document.addEventListener('mousedown', onMouseDown);
document.addEventListener('mouseup', onMouseUp);
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('click', onClick);

// Keyboard controls (W=forward, S=backward, A=left, D=right)
document.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 'W') moveState.forward = true;
    if (e.key === 's' || e.key === 'S') moveState.backward = true;
    if (e.key === 'a' || e.key === 'A') moveState.left = true;
    if (e.key === 'd' || e.key === 'D') moveState.right = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W') moveState.forward = false;
    if (e.key === 's' || e.key === 'S') moveState.backward = false;
    if (e.key === 'a' || e.key === 'A') moveState.left = false;
    if (e.key === 'd' || e.key === 'D') moveState.right = false;
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Drop evidence from backpack to world
function dropEvidenceToWorld(inventoryIndex) {
    const item = inventory[inventoryIndex];
    if (!item || (item.type !== 'bone' && item.type !== 'footprint' && item.type !== 'evidence1' && item.type !== 'evidence2' && item.type !== 'evidence3')) return;

    // Spawn 3D evidence near player's feet
    const spawnPos = camera.position.clone();
    spawnPos.y = 0.3;
    spawnPos.add(new THREE.Vector3(0, 0, 1.5)); // In front of player

    let evidenceMesh;

    if (item.type === 'bone') {
        evidenceMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.5, 0.5),
            new THREE.MeshStandardMaterial({
                map: textures.boneTexture,
                transparent: true,
                emissive: 0x88ff88,
                emissiveIntensity: 1.2,
                side: THREE.DoubleSide
            })
        );
        evidenceMesh.rotation.x = -Math.PI / 2;
    } else if (item.type === 'footprint') {
        evidenceMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.8),
            new THREE.MeshStandardMaterial({
                map: textures.footprint,
                transparent: true,
                emissive: 0xaaffaa,
                emissiveIntensity: 0.8
            })
        );
        evidenceMesh.rotation.x = -Math.PI / 2;
    } else if (item.type === 'evidence1') {
        evidenceMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.4, 0.4),
            new THREE.MeshStandardMaterial({
                map: textures.evidence1,
                transparent: true,
                emissive: 0xaaffaa,
                emissiveIntensity: 0.6
            })
        );
        evidenceMesh.rotation.x = -Math.PI / 2;
    } else if (item.type === 'evidence2') {
        evidenceMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.8),
            new THREE.MeshStandardMaterial({
                map: textures.evidence2,
                transparent: true,
                emissive: 0xaaffaa,
                emissiveIntensity: 0.6
            })
        );
        evidenceMesh.rotation.x = -Math.PI / 2;
    } else if (item.type === 'evidence3') {
        evidenceMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.5, 0.5),
            new THREE.MeshStandardMaterial({
                map: textures.evidence3,
                transparent: true,
                emissive: 0xaaffaa,
                emissiveIntensity: 0.6
            })
        );
        evidenceMesh.rotation.x = -Math.PI / 2;
    }

    evidenceMesh.position.copy(spawnPos);
    evidenceMesh.userData.evidenceType = item.type;
    evidenceMesh.userData.isDraggable = true;
    scene.add(evidenceMesh);
    droppedEvidence.push(evidenceMesh);

    // Lift animation
    const startY = spawnPos.y - 0.5;
    evidenceMesh.position.y = startY;
    let liftProgress = 0;
    const liftAnim = setInterval(() => {
        liftProgress += 0.08;
        evidenceMesh.position.y = startY + Math.sin(liftProgress * Math.PI) * 0.5 + 0.3;
        if (liftProgress >= 1) {
            clearInterval(liftAnim);
            evidenceMesh.position.y = spawnPos.y;
        }
    }, 16);

    // Remove from inventory
    inventory.splice(inventoryIndex, 1);
    selectedInventoryIndex = -1;
    updateInventoryUI();

    console.log('Dropped evidence:', item.type);
}

// Drag evidence with mouse
function startDragEvidence(event) {
    if (isDragging) return;

    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);
    const intersects = raycaster.intersectObjects(droppedEvidence);

    if (intersects.length > 0) {
        draggedEvidence = intersects[0].object;
        isDragging = true;
        renderer.domElement.style.cursor = 'grabbing';
    }
}

function updateDragEvidence(event) {
    if (!isDragging || !draggedEvidence) return;

    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

    // Project to ground plane
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint) {
        draggedEvidence.position.x = intersectPoint.x;
        draggedEvidence.position.z = intersectPoint.z;
    }
}

function endDragEvidence() {
    if (!isDragging || !draggedEvidence) return;

    // Check if dropped into mailbox
    const mailboxPos = mailboxGroup.position;
    const evidencePos = draggedEvidence.position;
    const distance = Math.sqrt(
        Math.pow(evidencePos.x - mailboxPos.x, 2) +
        Math.pow(evidencePos.z - mailboxPos.z, 2)
    );

    if (distance < 1.5) {
        // Evidence delivered!
        deliverEvidence(draggedEvidence);
    }

    isDragging = false;
    draggedEvidence = null;
    renderer.domElement.style.cursor = 'default';
}

// Deliver evidence to mailbox
function deliverEvidence(evidenceMesh) {
    const evidenceType = evidenceMesh.userData.evidenceType;

    // Sucked into mailbox animation
    const mailboxPos = mailboxGroup.position.clone();
    mailboxPos.y = 1.5;

    let suckProgress = 0;
    const suckAnim = setInterval(() => {
        suckProgress += 0.1;
        evidenceMesh.position.lerp(mailboxPos, 0.15);
        evidenceMesh.scale.multiplyScalar(0.92);

        if (suckProgress >= 1) {
            clearInterval(suckAnim);
            scene.remove(evidenceMesh);
            droppedEvidence.splice(droppedEvidence.indexOf(evidenceMesh), 1);

            // Mark as delivered
            deliveryState[evidenceType] = true;
            console.log(`${evidenceType} delivered!`);

            // Check if all 5 evidence items delivered
            if (deliveryState.bone && deliveryState.footprint && deliveryState.evidence1 && deliveryState.evidence2 && deliveryState.evidence3 && !finalLetterSpawned) {
                setTimeout(() => spawnFinalLetter(), 500);
            }
        }
    }, 16);
}

// Spawn final letter from mailbox
function spawnFinalLetter() {
    finalLetterSpawned = true;

    // Mailbox shake
    const originalPos = mailboxGroup.position.clone();
    let shakeTime = 0;
    const shakeAnim = setInterval(() => {
        shakeTime += 0.05;
        mailboxGroup.position.x = originalPos.x + Math.sin(shakeTime * 30) * 0.05;
        mailboxGroup.position.y = originalPos.y + Math.sin(shakeTime * 25) * 0.03;

        if (shakeTime >= 0.4) {
            clearInterval(shakeAnim);
            mailboxGroup.position.copy(originalPos);

            // Spawn letter
            const letter = new THREE.Mesh(
                new THREE.PlaneGeometry(0.4, 0.6),
                new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    emissive: 0xffffaa,
                    emissiveIntensity: 0.3,
                    roughness: 0.8
                })
            );
            letter.position.set(
                mailboxGroup.position.x,
                mailboxGroup.position.y + 1.8,
                mailboxGroup.position.z
            );
            letter.rotation.x = -Math.PI / 2;
            letter.userData.isFinalLetter = true;
            scene.add(letter);
            interactiveObjects.push(letter);

            // Float down animation
            const targetY = 0.05;
            let floatProgress = 0;
            const floatAnim = setInterval(() => {
                floatProgress += 0.02;
                letter.position.y = mailboxGroup.position.y + 1.8 - floatProgress * 1.8;

                if (letter.position.y <= targetY) {
                    clearInterval(floatAnim);
                    letter.position.y = targetY;
                    console.log('Final letter landed - click to read');
                }
            }, 16);
        }
    }, 16);
}

// Show final message overlay
function showFinalMessage() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'final-message-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.5s';

    // Message image
    const messageImg = document.createElement('img');
    messageImg.src = '/mnt/data/A_photograph_of_a_handwritten_note_features_a_clos.png';
    messageImg.style.maxWidth = '80%';
    messageImg.style.maxHeight = '70%';
    messageImg.style.border = '3px solid white';
    messageImg.style.boxShadow = '0 0 20px rgba(255,255,255,0.5)';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.marginTop = '20px';
    closeBtn.style.padding = '15px 40px';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.backgroundColor = '#ffffff';
    closeBtn.style.border = '2px solid #333';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.borderRadius = '5px';

    closeBtn.addEventListener('click', () => {
        overlay.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(overlay);
        }, 500);
    });

    overlay.appendChild(messageImg);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);

    // Fade in
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 10);

    // Hide game UI
    document.getElementById('backpack').style.display = 'none';
    document.getElementById('inventory-panel').style.display = 'none';
}

function checkCollision(newPos) {
    const playerBox = new THREE.Box3().setFromCenterAndSize(
        newPos,
        new THREE.Vector3(0.8, 4, 0.8)
    );

    for (const obj of worldObjects) {
        if (obj.userData.doorCollider && obj.userData.door && !obj.userData.door.userData.closed) {
            continue;
        }
        if (obj.userData.woodenDoorCollider && obj.userData.door && !obj.userData.door.userData.closed) {
            continue;
        }

        const objBox = new THREE.Box3().setFromObject(obj);
        if (playerBox.intersectsBox(objBox)) {
            return true;
        }
    }
    return false;
}

function animate() {
    requestAnimationFrame(animate);

    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
    camera.quaternion.copy(quaternion);

    // Update flashlight target to point forward from camera
    const flashlightDirection = new THREE.Vector3(0, 0, -1);
    flashlightDirection.applyQuaternion(camera.quaternion);
    flashlightTarget.position.copy(camera.position).add(flashlightDirection);

    // Movement speed (slower in Garden conservatory for dreamy atmosphere)
    const baseSpeed = 0.1;
    const speed = currentScene === 'garden' ? baseSpeed * 0.3 : baseSpeed; // 30% normal speed in Garden (much slower)

    // Get camera forward direction (projected onto horizontal plane)
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    // Get right direction (perpendicular to forward)
    const right = new THREE.Vector3();
    right.copy(forward).cross(new THREE.Vector3(0, 1, 0)).normalize();

    // Build movement vector from input
    const moveDir = new THREE.Vector3();

    if (moveState.forward) moveDir.add(forward);
    if (moveState.backward) moveDir.sub(forward);
    if (moveState.left) moveDir.sub(right);
    if (moveState.right) moveDir.add(right);

    if (moveDir.length() > 0) {
        moveDir.normalize();

        const newPos = camera.position.clone().add(moveDir.multiplyScalar(speed));
        newPos.y = 2.5;

        if (!checkCollision(newPos)) {
            camera.position.copy(newPos);
        }
    }

    // Check if player walked through wooden door into garden
    if (currentScene === 'room1' && woodenDoor.userData.closed === false) {
        if (gardenTrigger.containsPoint(camera.position)) {
            console.log('Entered garden area');
            currentScene = 'garden';
        }
    }

    // Flicker red lights (dramatic strobing effect)
    const time = Date.now();
    scene.children.forEach(child => {
        if (child.userData.pulseLight) {
            // Random flickering with occasional bright flashes
            const flicker = Math.random() * 0.3;
            const flash = Math.sin(time * 0.008) > 0.7 ? 3 : 0;
            const strobe = Math.floor(time * 0.01) % 2 === 0 ? 1 : 0.3;
            child.intensity = child.userData.baseIntensity * strobe + flicker + flash;
        }
    });

    // Animate cylinders
    cylinders.forEach((cyl, idx) => {
        const liquid = cyl.userData.liquid;
        const bubbles = cyl.userData.bubbles;
        const height = cyl.userData.height;
        const radius = cyl.userData.radius;

        // Swirling liquid rotation
        liquid.rotation.y += 0.0004;

        // Gentle wobble
        const wobbleSpeed = 0.0008 + idx * 0.0002;
        liquid.position.x = Math.sin(time * wobbleSpeed) * 0.015;
        liquid.position.z = Math.cos(time * wobbleSpeed) * 0.015;

        // Animate bubbles rising
        bubbles.forEach(bubble => {
            bubble.position.y += bubble.userData.speed;

            // Reset bubble at top
            if (bubble.position.y > height) {
                bubble.position.y = bubble.userData.resetY;
                bubble.position.x = (Math.random() - 0.5) * radius * 1.2;
                bubble.position.z = (Math.random() - 0.5) * radius * 1.2;
            }
        });
    });

    // Garden animations (always animate, since garden is in same scene)
    gardenObjects.forEach(obj => {
        // Fountain water animations
        if (obj.userData.particles) {
            obj.userData.particles.forEach(particle => {
                // Magical particles rising from water with gentle float
                particle.position.y += particle.userData.speed;
                particle.position.x += Math.sin(time * 0.001 + particle.userData.floatOffset) * 0.002;
                particle.position.z += Math.cos(time * 0.001 + particle.userData.floatOffset) * 0.002;

                if (particle.position.y > 1.5) {
                    particle.position.y = particle.userData.resetY;
                    particle.position.x = (Math.random() - 0.5) * 1.2;
                    particle.position.z = (Math.random() - 0.5) * 1.2;
                }
            });

            // Animate water surface (subtle ripple + shimmering normal map scrolling)
            const waterSurface = obj.userData.waterSurface;
            if (waterSurface) {
                waterSurface.position.y = 0.6 + Math.sin(time * 0.0015) * 0.015;

                // Scroll normal map for shimmering water effect
                if (waterSurface.material.normalMap) {
                    waterSurface.material.normalMap.offset.x = (time * 0.00008) % 1;
                    waterSurface.material.normalMap.offset.y = (time * 0.00005) % 1;
                }
            }
        }

        // Floating dust particles (sparkle in god-rays)
        if (obj.userData.floatSpeed) {
            obj.position.y += obj.userData.floatSpeed;
            obj.position.x += obj.userData.drift;

            // Gentle sparkle effect
            obj.material.opacity = 0.3 + Math.sin(time * 0.002 + obj.userData.sparkleOffset) * 0.2;

            // Reset when reaching top or drifting too far
            if (obj.position.y > 10) {
                obj.position.y = 0;
            }
            const gardenOffsetX = -17.5;
            if (Math.abs(obj.position.x - gardenOffsetX) > 10) {
                obj.position.x = gardenOffsetX + (Math.random() - 0.5) * 20;
            }
        }

        // Bush wind sway animation (gentle rotation oscillation)
        if (obj.userData.isBush) {
            const windIntensity = 0.15 + Math.sin(time * obj.userData.windSpeed + obj.userData.windOffset) * 0.05;
            obj.rotation.y = Math.sin(time * 0.0008 + obj.userData.windOffset) * windIntensity;
            obj.rotation.x = Math.sin(time * 0.0006 + obj.userData.windOffset) * (windIntensity * 0.5);
        }

        // Bone pulsing glow animation
        if (obj.userData.isBone && !obj.userData.collected) {
            obj.material.emissiveIntensity = 1.4 + Math.sin(time * 0.002) * 0.4;
        }

        // Evidence items pulsing glow animation (Room 2)
        if (obj.userData.isEvidence && !obj.userData.collected) {
            obj.material.emissiveIntensity = 0.3 + Math.sin(time * 0.003) * 0.15;
        }
    });

    renderer.render(scene, camera);
}

console.log('Starting animation loop');
animate();
