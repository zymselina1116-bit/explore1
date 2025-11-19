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
    woodenDoor: loadTexture('870c5435ceffda4aa972afb3244c2eca-removebg-preview.png'),
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

// West wall with doorway opening for wooden door (3m opening)
const westWallTop = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, 0.5),
    new THREE.MeshStandardMaterial({
        map: textures.wall,
        color: 0xff3333 // Deep red tint
    })
);
westWallTop.position.set(-roomSize / 2, wallHeight - 0.25, 0);
westWallTop.rotation.y = Math.PI / 2;
scene.add(westWallTop);
// NOT added to worldObjects - purely visual, no collision

const westWallNorth = new THREE.Mesh(
    new THREE.PlaneGeometry(6, wallHeight),
    new THREE.MeshStandardMaterial({
        map: textures.wall,
        color: 0xff3333 // Deep red tint
    })
);
westWallNorth.position.set(-roomSize / 2, wallHeight / 2, -4.5);
westWallNorth.rotation.y = Math.PI / 2;
scene.add(westWallNorth);
worldObjects.push(westWallNorth);

const westWallSouth = new THREE.Mesh(
    new THREE.PlaneGeometry(6, wallHeight),
    new THREE.MeshStandardMaterial({
        map: textures.wall,
        color: 0xff3333 // Deep red tint
    })
);
westWallSouth.position.set(-roomSize / 2, wallHeight / 2, 4.5);
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
const ambientLight = new THREE.AmbientLight(0xff2222, 0.8);
scene.add(ambientLight);

// Red pulsing lights (VERY BRIGHT - PRIMARY ILLUMINATION)
const redLight1 = new THREE.PointLight(0xff0000, 8, 35);
redLight1.position.set(-3, wallHeight - 0.5, -3);
scene.add(redLight1);
redLight1.userData.pulseLight = true;
redLight1.userData.baseIntensity = 8;

const redLight2 = new THREE.PointLight(0xff0000, 8, 35);
redLight2.position.set(3, wallHeight - 0.5, 3);
scene.add(redLight2);
redLight2.userData.pulseLight = true;
redLight2.userData.baseIntensity = 8;

const redLight3 = new THREE.PointLight(0xff0000, 8, 35);
redLight3.position.set(-3, wallHeight - 0.5, 3);
scene.add(redLight3);
redLight3.userData.pulseLight = true;
redLight3.userData.baseIntensity = 8;

const redLight4 = new THREE.PointLight(0xff0000, 8, 35);
redLight4.position.set(3, wallHeight - 0.5, -3);
scene.add(redLight4);
redLight4.userData.pulseLight = true;
redLight4.userData.baseIntensity = 8;

// Additional red lights at mid-wall positions
const redLight5 = new THREE.PointLight(0xff0000, 6, 30);
redLight5.position.set(0, wallHeight - 0.5, -6);
scene.add(redLight5);
redLight5.userData.pulseLight = true;
redLight5.userData.baseIntensity = 6;

const redLight6 = new THREE.PointLight(0xff0000, 6, 30);
redLight6.position.set(0, wallHeight - 0.5, 6);
scene.add(redLight6);
redLight6.userData.pulseLight = true;
redLight6.userData.baseIntensity = 6;

const redLight7 = new THREE.PointLight(0xff0000, 6, 30);
redLight7.position.set(-6, wallHeight - 0.5, 0);
scene.add(redLight7);
redLight7.userData.pulseLight = true;
redLight7.userData.baseIntensity = 6;

const redLight8 = new THREE.PointLight(0xff0000, 6, 30);
redLight8.position.set(6, wallHeight - 0.5, 0);
scene.add(redLight8);
redLight8.userData.pulseLight = true;
redLight8.userData.baseIntensity = 6;

// Spotlight on key board - RED-TINTED (now on NORTH wall)
const keyBoardSpotlight = new THREE.SpotLight(0xff6644, 6, 15, Math.PI / 6);
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
    new THREE.MeshStandardMaterial({ map: textures.woodenDoor, transparent: true })
);
woodenDoor.position.set(-roomSize / 2 + 0.05, 2.25, 0);
woodenDoor.rotation.y = Math.PI / 2;
scene.add(woodenDoor);
woodenDoor.userData.isWoodenDoor = true;
woodenDoor.userData.closed = true;
interactiveObjects.push(woodenDoor);

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
        new THREE.MeshStandardMaterial({ map: textures.gardenGrass })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(gardenOffsetX, 0, 0);
    scene.add(ground);
    worldObjects.push(ground);

    // Glass walls (transparent greenhouse)
    const glassMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.65,
        metalness: 0.1,
        roughness: 0.05,
        side: THREE.DoubleSide
    });

    const wallHeight = 8;

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

    // East side - opaque interior wall with doorway opening (behind glass)
    // This creates the Room1 entrance visible from Garden side
    const doorWidth = 3; // Matches wooden door exactly
    const doorHeight = 4.5; // Matches wooden door exactly
    const doorCenterY = 2.25; // Matches wooden door center height

    // Opaque wall material (same as Room1 walls)
    const gardenInteriorWallMaterial = new THREE.MeshStandardMaterial({
        map: textures.wall,
        color: 0xff3333 // Red tint to match Room1
    });

    // Top wall segment (above doorway)
    const eastWallTop = new THREE.Mesh(
        new THREE.PlaneGeometry(gardenSize, wallHeight - doorHeight - doorCenterY + wallHeight / 2),
        gardenInteriorWallMaterial
    );
    const topSegmentHeight = wallHeight - doorHeight - doorCenterY + wallHeight / 2;
    eastWallTop.position.set(
        gardenOffsetX + gardenSize / 2 - 0.05,
        doorCenterY + doorHeight / 2 + topSegmentHeight / 2,
        0
    );
    eastWallTop.rotation.y = Math.PI / 2;
    scene.add(eastWallTop);

    // North wall segment (left of doorway)
    const northSegmentWidth = (gardenSize - doorWidth) / 2;
    const eastWallNorth = new THREE.Mesh(
        new THREE.PlaneGeometry(northSegmentWidth, wallHeight),
        gardenInteriorWallMaterial
    );
    eastWallNorth.position.set(
        gardenOffsetX + gardenSize / 2 - 0.05,
        wallHeight / 2,
        -doorWidth / 2 - northSegmentWidth / 2
    );
    eastWallNorth.rotation.y = Math.PI / 2;
    scene.add(eastWallNorth);

    // South wall segment (right of doorway)
    const eastWallSouth = new THREE.Mesh(
        new THREE.PlaneGeometry(northSegmentWidth, wallHeight),
        gardenInteriorWallMaterial
    );
    eastWallSouth.position.set(
        gardenOffsetX + gardenSize / 2 - 0.05,
        wallHeight / 2,
        doorWidth / 2 + northSegmentWidth / 2
    );
    eastWallSouth.rotation.y = Math.PI / 2;
    scene.add(eastWallSouth);

    // Bottom wall segment (below doorway, if any)
    if (doorCenterY - doorHeight / 2 > 0) {
        const bottomSegmentHeight = doorCenterY - doorHeight / 2;
        const eastWallBottom = new THREE.Mesh(
            new THREE.PlaneGeometry(doorWidth, bottomSegmentHeight),
            gardenInteriorWallMaterial
        );
        eastWallBottom.position.set(
            gardenOffsetX + gardenSize / 2 - 0.05,
            bottomSegmentHeight / 2,
            0
        );
        eastWallBottom.rotation.y = Math.PI / 2;
        scene.add(eastWallBottom);
    }

    // Outer glass panels (not covering doorway) - split around the opening
    const glassEastTop = new THREE.Mesh(
        new THREE.PlaneGeometry(gardenSize, wallHeight - doorHeight - doorCenterY + wallHeight / 2),
        glassMaterial
    );
    glassEastTop.position.set(
        gardenOffsetX + gardenSize / 2,
        doorCenterY + doorHeight / 2 + topSegmentHeight / 2,
        0
    );
    glassEastTop.rotation.y = Math.PI / 2;
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
    glassEastNorth.rotation.y = Math.PI / 2;
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
    glassEastSouth.rotation.y = Math.PI / 2;
    scene.add(glassEastSouth);

    // Glass ceiling panels
    const ceilingGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(gardenSize, gardenSize),
        glassMaterial
    );
    ceilingGlass.rotation.x = Math.PI / 2;
    ceilingGlass.position.set(gardenOffsetX, wallHeight, 0);
    scene.add(ceilingGlass);

    // Metal frame structure (thin dark beams with texture)
    const frameMaterial = new THREE.MeshStandardMaterial({
        map: textures.glassFrameTexture,
        metalness: 0.8,
        roughness: 0.3
    });

    // Vertical corner posts
    const postPositions = [
        [gardenOffsetX - gardenSize / 2, wallHeight / 2, -gardenSize / 2],
        [gardenOffsetX + gardenSize / 2, wallHeight / 2, -gardenSize / 2],
        [gardenOffsetX - gardenSize / 2, wallHeight / 2, gardenSize / 2],
        [gardenOffsetX + gardenSize / 2, wallHeight / 2, gardenSize / 2]
    ];
    postPositions.forEach(pos => {
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, wallHeight, 8),
            frameMaterial
        );
        post.position.set(...pos);
        scene.add(post);
    });

    // Warm sunlight from ceiling
    const sunLight = new THREE.DirectionalLight(0xffffcc, 0.8);
    sunLight.position.set(gardenOffsetX, wallHeight - 1, 0);
    sunLight.target.position.set(gardenOffsetX, 0, 0);
    scene.add(sunLight);
    scene.add(sunLight.target);

    // Soft ambient lighting (warm + green) - BRIGHTER
    const gardenAmbient = new THREE.AmbientLight(0xaaff88, 1.2);
    scene.add(gardenAmbient);

    const warmGlow = new THREE.PointLight(0xffeeaa, 0.8, 30);
    warmGlow.position.set(gardenOffsetX, 4, 0);
    scene.add(warmGlow);

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

    // 3D Flower bushes (expanded with more positions)
    const bushPositions = [
        { x: -4, z: -6 }, { x: -2, z: -8 }, { x: 4, z: -7 },
        { x: 6, z: -4 }, { x: -5, z: 5 }, { x: -2, z: 7 },
        { x: 3, z: 6 }, { x: 5, z: 8 }, { x: -7, z: -2 },
        { x: 7, z: 2 }, { x: -4, z: 0 }, { x: 4, z: -2 },
        // Additional bushes
        { x: -8, z: -6 }, { x: -6, z: -8 }, { x: 8, z: -6 },
        { x: 8, z: 6 }, { x: -8, z: 6 }, { x: -1, z: -4 },
        { x: 1, z: -6 }, { x: -3, z: 3 }, { x: 6, z: 0 },
        { x: -6, z: 2 }, { x: 2, z: -3 }, { x: 0, z: 5 }
    ];

    bushPositions.forEach(pos => {
        const bushGroup = new THREE.Group();

        // Volumetric bush made with 8-15 crossed transparent planes
        const numPlanes = 8 + Math.floor(Math.random() * 8); // 8-15 planes
        const bushHeight = 1.2 + Math.random() * 0.8;
        const bushWidth = 1.0 + Math.random() * 0.6;

        const bushMaterial = new THREE.MeshStandardMaterial({
            map: textures.bushTexture,
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide,
            color: 0xffffff
        });

        for (let i = 0; i < numPlanes; i++) {
            const angle = (Math.PI / numPlanes) * i;
            const plane = new THREE.Mesh(
                new THREE.PlaneGeometry(bushWidth, bushHeight),
                bushMaterial
            );
            plane.position.y = bushHeight / 2;
            plane.rotation.y = angle;
            bushGroup.add(plane);
        }

        // Optional flower layer with crossed planes (smaller, on top)
        const numFlowerPlanes = 4 + Math.floor(Math.random() * 4);
        const flowerHeight = bushHeight * 0.6;
        const flowerWidth = bushWidth * 0.7;

        const flowerMaterial = new THREE.MeshStandardMaterial({
            map: textures.flowerTexture,
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide,
            emissive: 0xffaa88,
            emissiveIntensity: 0.2
        });

        for (let i = 0; i < numFlowerPlanes; i++) {
            const angle = (Math.PI / numFlowerPlanes) * i;
            const flowerPlane = new THREE.Mesh(
                new THREE.PlaneGeometry(flowerWidth, flowerHeight),
                flowerMaterial
            );
            flowerPlane.position.y = bushHeight * 0.6;
            flowerPlane.rotation.y = angle;
            bushGroup.add(flowerPlane);
        }

        bushGroup.position.set(gardenOffsetX + pos.x, 0, pos.z);
        scene.add(bushGroup);
        gardenObjects.push(bushGroup);
    });

    // Separate standalone flowers scattered throughout garden
    const flowerPositions = [
        { x: -3, z: -3 }, { x: 2, z: -5 }, { x: -1, z: -7 },
        { x: 5, z: -5 }, { x: -7, z: 0 }, { x: 3, z: 1 },
        { x: -5, z: 3 }, { x: 1, z: 4 }, { x: 7, z: 5 },
        { x: -2, z: 6 }, { x: 4, z: 7 }, { x: -6, z: -4 },
        { x: 6, z: -2 }, { x: -4, z: 2 }, { x: 2, z: 3 },
        { x: 0, z: -2 }, { x: -1, z: 1 }, { x: 3, z: -4 }
    ];

    flowerPositions.forEach(pos => {
        const flowerGroup = new THREE.Group();

        // Create small flower cluster with crossed planes
        const numPlanes = 4 + Math.floor(Math.random() * 4);
        const flowerHeight = 0.4 + Math.random() * 0.3;
        const flowerWidth = 0.3 + Math.random() * 0.2;

        const flowerMaterial = new THREE.MeshStandardMaterial({
            map: textures.flowerTexture,
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide,
            emissive: [0xff69b4, 0xffff00, 0xff6347, 0x9370db, 0xffa500][Math.floor(Math.random() * 5)],
            emissiveIntensity: 0.4
        });

        for (let i = 0; i < numPlanes; i++) {
            const angle = (Math.PI / numPlanes) * i;
            const flowerPlane = new THREE.Mesh(
                new THREE.PlaneGeometry(flowerWidth, flowerHeight),
                flowerMaterial
            );
            flowerPlane.position.y = flowerHeight / 2;
            flowerPlane.rotation.y = angle;
            flowerGroup.add(flowerPlane);
        }

        flowerGroup.position.set(gardenOffsetX + pos.x, 0, pos.z);
        scene.add(flowerGroup);
        gardenObjects.push(flowerGroup);
    });

    // Center fountain with glowing water
    const fountainGroup = new THREE.Group();

    // Stone base with texture
    const fountainBase = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 1.9, 0.5, 20),
        new THREE.MeshStandardMaterial({
            map: textures.stoneTexture,
            roughness: 0.7
        })
    );
    fountainBase.position.y = 0.25;
    fountainGroup.add(fountainBase);

    // Water basin with physical material and normal map
    textures.waterNormalTexture.wrapS = textures.waterNormalTexture.wrapT = THREE.RepeatWrapping;
    textures.waterNormalTexture.repeat.set(2, 2);

    const waterBasin = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 1.4, 0.3, 20),
        new THREE.MeshPhysicalMaterial({
            color: 0xaaffff,
            emissive: 0x44ddff,
            emissiveIntensity: 0.4,
            transmission: 0.9,
            opacity: 1,
            roughness: 0.1,
            ior: 1.33,
            thickness: 0.5,
            normalMap: textures.waterNormalTexture,
            normalScale: new THREE.Vector2(0.3, 0.3)
        })
    );
    waterBasin.position.y = 0.55;
    fountainGroup.add(waterBasin);
    fountainGroup.userData.waterBasin = waterBasin;

    // Sparkle particles (gentle animation)
    const particles = [];
    for (let i = 0; i < 25; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0xddffff, transparent: true, opacity: 0.7 })
        );
        particle.position.set(
            (Math.random() - 0.5) * 0.4,
            0.7 + Math.random() * 0.6,
            (Math.random() - 0.5) * 0.4
        );
        particle.userData.speed = 0.008 + Math.random() * 0.015;
        particle.userData.resetY = 0.7;
        particles.push(particle);
        fountainGroup.add(particle);
    }
    fountainGroup.userData.particles = particles;

    // Fountain glow light
    const fountainLight = new THREE.PointLight(0xaaffff, 0.7, 10);
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

    // Stylized trees at garden perimeter (near glass walls, clear of evidence)
    const treePositions = [
        { x: -9, z: -9 }, { x: -8, z: 9 }, { x: 8, z: -9 },
        { x: 9, z: 8 }, { x: -9, z: 3 }, { x: 9, z: -3 },
        { x: 3, z: -9 }, { x: -3, z: 9 }
    ];

    treePositions.forEach(pos => {
        const treeGroup = new THREE.Group();

        // Tree trunk - brown cylinder
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.2, 2.5, 8),
            new THREE.MeshStandardMaterial({
                color: 0x4a3520,
                roughness: 0.9
            })
        );
        trunk.position.y = 1.25;
        treeGroup.add(trunk);

        // Tree canopy - green crossed planes for volumetric look
        const canopyHeight = 2.0;
        const canopyWidth = 1.5;
        const numCanopyPlanes = 6;

        for (let i = 0; i < numCanopyPlanes; i++) {
            const angle = (Math.PI / numCanopyPlanes) * i;
            const canopyPlane = new THREE.Mesh(
                new THREE.PlaneGeometry(canopyWidth, canopyHeight),
                new THREE.MeshStandardMaterial({
                    color: 0x2a5a1f,
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide
                })
            );
            canopyPlane.position.y = 3.0;
            canopyPlane.rotation.y = angle;
            treeGroup.add(canopyPlane);
        }

        treeGroup.position.set(gardenOffsetX + pos.x, 0, pos.z);
        scene.add(treeGroup);
        gardenObjects.push(treeGroup);
    });

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

    // Reduced movement speed in garden (80% slower than normal)
    const baseSpeed = 0.1;
    const speed = currentScene === 'garden' ? baseSpeed * 0.2 : baseSpeed;

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
                particle.position.y += particle.userData.speed;
                if (particle.position.y > 2) {
                    particle.position.y = particle.userData.resetY;
                    particle.position.x = (Math.random() - 0.5) * 0.4;
                    particle.position.z = (Math.random() - 0.5) * 0.4;
                }
            });

            // Animate water basin surface (gentle ripple + normal map scrolling)
            const waterBasin = obj.userData.waterBasin;
            if (waterBasin) {
                waterBasin.position.y = 0.55 + Math.sin(time * 0.002) * 0.02;

                // Scroll normal map for water movement effect
                if (waterBasin.material.normalMap) {
                    waterBasin.material.normalMap.offset.x = (time * 0.00005) % 1;
                    waterBasin.material.normalMap.offset.y = (time * 0.00003) % 1;
                }
            }
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
