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
    gardenSoil: loadTexture('https://raw.githubusercontent.com/zymselina1116-bit/explore1/99e4555667f6736bd1a77eb5143396c6213feb6d/ca51356d700791cda042c52ae96bcca0.jpg'),
    footprint: loadTexture('https://raw.githubusercontent.com/zymselina1116-bit/explore1/63b9e9a95c7e705c36df5553b89bb4bd083e5ea9/Screenshot_2025-11-18_at_19.23.01-removebg-preview.png'),
    footprintPhoto: loadTexture('https://raw.githubusercontent.com/zymselina1116-bit/explore1/5113b099b2a821e217e8c1b5f8e0ecaca65fd06c/Screenshot%202025-11-18%20at%2019.29.33.png')
};

textures.floor.wrapS = textures.floor.wrapT = THREE.RepeatWrapping;
textures.floor.repeat.set(4, 4);
textures.wall.wrapS = textures.wall.wrapT = THREE.RepeatWrapping;
textures.wall.repeat.set(2, 2);
textures.gardenSoil.wrapS = textures.gardenSoil.wrapT = THREE.RepeatWrapping;
textures.gardenSoil.repeat.set(6, 6);

// Create Room 1
const roomSize = 15;
const wallHeight = 5;

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize),
    new THREE.MeshStandardMaterial({ map: textures.floor })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);
worldObjects.push(floor);

const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, roomSize),
    new THREE.MeshStandardMaterial({ map: textures.wall })
);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = wallHeight;
scene.add(ceiling);

const wallGeometry = new THREE.PlaneGeometry(roomSize, wallHeight);

const wallNorth = new THREE.Mesh(wallGeometry, new THREE.MeshStandardMaterial({ map: textures.wall }));
wallNorth.position.set(0, wallHeight / 2, -roomSize / 2);
scene.add(wallNorth);
worldObjects.push(wallNorth);

const wallSouth = new THREE.Mesh(wallGeometry, new THREE.MeshStandardMaterial({ map: textures.wall }));
wallSouth.position.set(0, wallHeight / 2, roomSize / 2);
wallSouth.rotation.y = Math.PI;
scene.add(wallSouth);
worldObjects.push(wallSouth);

const wallWest = new THREE.Mesh(wallGeometry, new THREE.MeshStandardMaterial({ map: textures.wall }));
wallWest.position.set(-roomSize / 2, wallHeight / 2, 0);
wallWest.rotation.y = Math.PI / 2;
scene.add(wallWest);
worldObjects.push(wallWest);

// East wall with doorway opening (exact 3m opening matching door)
const eastWallTop = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, 0.5),
    new THREE.MeshStandardMaterial({ map: textures.wall })
);
eastWallTop.position.set(roomSize / 2, wallHeight - 0.25, 0);
eastWallTop.rotation.y = -Math.PI / 2;
scene.add(eastWallTop);
// NOT added to worldObjects - purely visual, no collision

const eastWallNorth = new THREE.Mesh(
    new THREE.PlaneGeometry(6, wallHeight),
    new THREE.MeshStandardMaterial({ map: textures.wall })
);
eastWallNorth.position.set(roomSize / 2, wallHeight / 2, -4.5);
eastWallNorth.rotation.y = -Math.PI / 2;
scene.add(eastWallNorth);
worldObjects.push(eastWallNorth);

const eastWallSouth = new THREE.Mesh(
    new THREE.PlaneGeometry(6, wallHeight),
    new THREE.MeshStandardMaterial({ map: textures.wall })
);
eastWallSouth.position.set(roomSize / 2, wallHeight / 2, 4.5);
eastWallSouth.rotation.y = -Math.PI / 2;
scene.add(eastWallSouth);
worldObjects.push(eastWallSouth);

// Ambient light for base brightness
const ambientLight = new THREE.AmbientLight(0xff3333, 0.8);
scene.add(ambientLight);

// Red pulsing lights - much brighter
const redLight1 = new THREE.PointLight(0xff0000, 8, 30);
redLight1.position.set(-3, wallHeight - 0.5, -3);
scene.add(redLight1);
redLight1.userData.pulseLight = true;
redLight1.userData.baseIntensity = 8;

const redLight2 = new THREE.PointLight(0xff0000, 8, 30);
redLight2.position.set(3, wallHeight - 0.5, 3);
scene.add(redLight2);
redLight2.userData.pulseLight = true;
redLight2.userData.baseIntensity = 8;

const redLight3 = new THREE.PointLight(0xff0000, 8, 30);
redLight3.position.set(-3, wallHeight - 0.5, 3);
scene.add(redLight3);
redLight3.userData.pulseLight = true;
redLight3.userData.baseIntensity = 8;

const redLight4 = new THREE.PointLight(0xff0000, 8, 30);
redLight4.position.set(3, wallHeight - 0.5, -3);
scene.add(redLight4);
redLight4.userData.pulseLight = true;
redLight4.userData.baseIntensity = 8;

// Spotlight on key board - brighter (now on NORTH wall)
const keyBoardSpotlight = new THREE.SpotLight(0xffaa77, 6, 15, Math.PI / 6);
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

// Garden trigger zone (invisible, behind wooden door)
const gardenTrigger = new THREE.Box3(
    new THREE.Vector3(-roomSize / 2 - 3, 0, -2),
    new THREE.Vector3(-roomSize / 2 - 1.5, 5, 2)
);

// Mailbox
const mailbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.8, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.3 })
);
mailbox.position.set(3, 0.4, -5);
scene.add(mailbox);
mailbox.userData.isMailbox = true;
interactiveObjects.push(mailbox);
worldObjects.push(mailbox);

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

// Blue ambient light for Room 2
const room2AmbientLight = new THREE.AmbientLight(0x3366ff, 0.6);
scene.add(room2AmbientLight);

// Blue ceiling lights for Room 2
const blueLight1 = new THREE.PointLight(0x4488ff, 3, 20);
blueLight1.position.set(room2Offset - 3, wallHeight - 0.5, -3);
scene.add(blueLight1);

const blueLight2 = new THREE.PointLight(0x4488ff, 3, 20);
blueLight2.position.set(room2Offset + 3, wallHeight - 0.5, 3);
scene.add(blueLight2);

const blueLight3 = new THREE.PointLight(0x4488ff, 3, 20);
blueLight3.position.set(room2Offset - 3, wallHeight - 0.5, 3);
scene.add(blueLight3);

const blueLight4 = new THREE.PointLight(0x4488ff, 3, 20);
blueLight4.position.set(room2Offset + 3, wallHeight - 0.5, -3);
scene.add(blueLight4);

// LAB CYLINDERS - 2 futuristic glass tanks
const cylinders = [];

// Cylinder 1 - Back corner
const cyl1Height = 5;
const cyl1Radius = 0.6;
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

// Green light
const greenLight1 = new THREE.PointLight(0x00ff55, 1.5, 10);
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

// Cylinder 2 - Front corner
const cyl2Height = 5;
const cyl2Radius = 0.7;
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
const greenLight2 = new THREE.PointLight(0x00ff55, 1.5, 10);
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

// Cylinder 3 - Left back corner
const cyl3Height = 5;
const cyl3Radius = 0.5;
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

const greenLight3 = new THREE.PointLight(0x00ff55, 1.5, 10);
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

// Cylinder 4 - Left front area
const cyl4Height = 5;
const cyl4Radius = 0.65;
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

const greenLight4 = new THREE.PointLight(0x00ff55, 1.5, 10);
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

// Cylinder 5 - Center
const cyl5Height = 5;
const cyl5Radius = 0.55;
const cylinder5Group = new THREE.Group();

const glass5 = new THREE.Mesh(
    new THREE.CylinderGeometry(cyl5Radius, cyl5Radius, cyl5Height, 32),
    new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.15,
        metalness: 0.9,
        roughness: 0.05
    })
);
glass5.position.y = cyl5Height / 2;
cylinder5Group.add(glass5);

const liquid5 = new THREE.Mesh(
    new THREE.CylinderGeometry(cyl5Radius * 0.85, cyl5Radius * 0.85, cyl5Height * 0.9, 32),
    new THREE.MeshStandardMaterial({
        emissive: 0x00ff55,
        emissiveIntensity: 2.2,
        color: 0x00ff55,
        transparent: true,
        opacity: 0.85
    })
);
liquid5.position.y = cyl5Height / 2;
cylinder5Group.add(liquid5);

const greenLight5 = new THREE.PointLight(0x00ff55, 1.5, 10);
greenLight5.position.y = cyl5Height / 2;
cylinder5Group.add(greenLight5);

const bubbles5 = [];
for (let i = 0; i < 6; i++) {
    const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xccffcc, transparent: true, opacity: 0.5 })
    );
    bubble.position.set(
        (Math.random() - 0.5) * cyl5Radius * 1.2,
        Math.random() * cyl5Height,
        (Math.random() - 0.5) * cyl5Radius * 1.2
    );
    bubble.userData.speed = 0.01 + Math.random() * 0.01;
    bubble.userData.resetY = Math.random() * 0.5;
    bubbles5.push(bubble);
    cylinder5Group.add(bubble);
}

cylinder5Group.position.set(room2Offset, 0, 0);
cylinder5Group.userData.liquid = liquid5;
cylinder5Group.userData.bubbles = bubbles5;
cylinder5Group.userData.height = cyl5Height;
cylinder5Group.userData.radius = cyl5Radius;
scene.add(cylinder5Group);
cylinders.push(cylinder5Group);

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

// Evidence 1: On desk surface
const evidence1 = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.4),
    new THREE.MeshStandardMaterial({ map: textures.evidence1 })
);
evidence1.position.set(room2Offset - 3, 1.25, -3);
evidence1.rotation.x = -Math.PI / 2;
scene.add(evidence1);
evidence1.userData.isCollectible = true;
evidence1.userData.itemType = 'evidence1';
evidence1.userData.texture = textures.evidence1;
interactiveObjects.push(evidence1);

// Evidence 2: Wall poster
const evidence2 = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.8),
    new THREE.MeshStandardMaterial({ map: textures.evidence2 })
);
evidence2.position.set(room2Offset, 2.5, -roomSize / 2 + 0.05);
evidence2.rotation.y = 0;
scene.add(evidence2);
evidence2.userData.isCollectible = true;
evidence2.userData.itemType = 'evidence2';
evidence2.userData.texture = textures.evidence2;
interactiveObjects.push(evidence2);

// Evidence 3: On floor
const evidence3 = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshStandardMaterial({ map: textures.evidence3 })
);
evidence3.position.set(room2Offset + 4, 0.01, 4);
evidence3.rotation.x = -Math.PI / 2;
scene.add(evidence3);
evidence3.userData.isCollectible = true;
evidence3.userData.itemType = 'evidence3';
evidence3.userData.texture = textures.evidence3;
interactiveObjects.push(evidence3);

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

        if (obj.userData.isCollectible && !obj.userData.collected) {
            // Collect item with lift animation
            obj.userData.collected = true;

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

                // Rotate door open smoothly around left hinge
                const targetRotation = obj.rotation.y + Math.PI / 2;
                const openAnim = setInterval(() => {
                    obj.rotation.y += 0.05;

                    if (obj.rotation.y >= targetRotation) {
                        clearInterval(openAnim);
                        obj.rotation.y = targetRotation;

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
        if (item.texture) {
            div.style.backgroundImage = `url(${item.texture.image.src})`;
        }
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
        isMouseDown = true;
        previousMousePosition = { x: event.clientX, y: event.clientY };
    }
}

function onMouseUp(event) {
    if (event.button === 0) {
        isMouseDown = false;
    }
}

function onMouseMove(event) {
    if (isMouseDown) {
        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;

        yaw -= deltaX * 0.002;
        pitch -= deltaY * 0.002;
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

        previousMousePosition = { x: event.clientX, y: event.clientY };
    }
}

document.addEventListener('mousedown', onMouseDown);
document.addEventListener('mouseup', onMouseUp);
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('click', onClick);

// Keyboard controls (W=backward, S=forward, A=right, D=left)
document.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 'W') moveState.backward = true;
    if (e.key === 's' || e.key === 'S') moveState.forward = true;
    if (e.key === 'a' || e.key === 'A') moveState.right = true;
    if (e.key === 'd' || e.key === 'D') moveState.left = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W') moveState.backward = false;
    if (e.key === 's' || e.key === 'S') moveState.forward = false;
    if (e.key === 'a' || e.key === 'A') moveState.right = false;
    if (e.key === 'd' || e.key === 'D') moveState.left = false;
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

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

    const speed = 0.1;
    const moveDir = new THREE.Vector3();

    if (moveState.forward) moveDir.z += 1;
    if (moveState.backward) moveDir.z -= 1;
    if (moveState.left) moveDir.x += 1;
    if (moveState.right) moveDir.x -= 1;

    if (moveDir.length() > 0) {
        moveDir.normalize();
        moveDir.applyQuaternion(camera.quaternion);
        moveDir.y = 0;
        moveDir.normalize();

        const newPos = camera.position.clone().add(moveDir.multiplyScalar(speed));
        newPos.y = 2.5;

        if (!checkCollision(newPos)) {
            camera.position.copy(newPos);
        }
    }

    // Check if player walked through wooden door into garden trigger zone
    if (currentScene === 'room1' && woodenDoor.userData.closed === false) {
        if (gardenTrigger.containsPoint(camera.position)) {
            console.log('Entering garden...');
            buildGardenScene();
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

    // Garden animations
    if (currentScene === 'garden') {
        gardenObjects.forEach(obj => {
            // Fountain water animations
            if (obj.userData.particles) {
                obj.userData.particles.forEach(particle => {
                    particle.position.y += particle.userData.speed;
                    if (particle.position.y > 2) {
                        particle.position.y = particle.userData.resetY;
                        particle.position.x = (Math.random() - 0.5) * 0.3;
                        particle.position.z = (Math.random() - 0.5) * 0.3;
                    }
                });

                // Animate water basin surface
                const waterBasin = obj.userData.waterBasin;
                if (waterBasin) {
                    waterBasin.position.y = 0.55 + Math.sin(time * 0.002) * 0.02;
                }
            }

            // Feather bobbing animation
            if (obj.userData && obj.userData.bobTime !== undefined) {
                obj.userData.bobTime += 0.02;
                obj.position.y = 0.8 + Math.sin(obj.userData.bobTime) * 0.1;

                // Pulsing emissive
                const mat = obj.material;
                if (mat.emissiveIntensity !== undefined) {
                    mat.emissiveIntensity = 1.5 + Math.sin(time * 0.003) * 0.5;
                }
            }
        });
    }

    renderer.render(scene, camera);
}

console.log('Starting animation loop');
animate();
