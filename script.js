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

const textureLoader = new THREE.TextureLoader();
const inventory = [];
const interactiveObjects = [];
const worldObjects = [];

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
    evidence3: loadTexture('Screenshot 2025-11-17 at 14.18.31.png')
};

textures.floor.wrapS = textures.floor.wrapT = THREE.RepeatWrapping;
textures.floor.repeat.set(4, 4);
textures.wall.wrapS = textures.wall.wrapT = THREE.RepeatWrapping;
textures.wall.repeat.set(2, 2);

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

// East wall with doorway opening (exact 3m opening matching door size)
const eastWallTop = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, 0.5),
    new THREE.MeshStandardMaterial({ map: textures.wall })
);
eastWallTop.position.set(roomSize / 2, wallHeight - 0.25, 0);
eastWallTop.rotation.y = -Math.PI / 2;
scene.add(eastWallTop);
worldObjects.push(eastWallTop);

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
    new THREE.PlaneGeometry(2, 1.5),
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
        new THREE.PlaneGeometry(0.12, 0.12),
        new THREE.MeshStandardMaterial({ map: textures.randomKey, transparent: true })
    );
    decorKey.position.set(pos.x, pos.y, -roomSize / 2 + 0.06);
    decorKey.rotation.y = 0;
    scene.add(decorKey);
});

// Collectible card on key board (NORTH wall)
const collectibleCard = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.4),
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
    new THREE.PlaneGeometry(0.4, 0.3),
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

// Room 2 west wall with doorway opening (exact 3m opening matching door)
const room2WestWallTop = new THREE.Mesh(
    new THREE.PlaneGeometry(roomSize, 0.5),
    new THREE.MeshStandardMaterial({ map: textures.wall })
);
room2WestWallTop.position.set(room2Offset - roomSize / 2, wallHeight - 0.25, 0);
room2WestWallTop.rotation.y = Math.PI / 2;
scene.add(room2WestWallTop);
worldObjects.push(room2WestWallTop);

const room2WestWallNorth = new THREE.Mesh(
    new THREE.PlaneGeometry(6, wallHeight),
    new THREE.MeshStandardMaterial({ map: textures.wall })
);
room2WestWallNorth.position.set(room2Offset - roomSize / 2, wallHeight / 2, -4.5);
room2WestWallNorth.rotation.y = Math.PI / 2;
scene.add(room2WestWallNorth);
worldObjects.push(room2WestWallNorth);

const room2WestWallSouth = new THREE.Mesh(
    new THREE.PlaneGeometry(6, wallHeight),
    new THREE.MeshStandardMaterial({ map: textures.wall })
);
room2WestWallSouth.position.set(room2Offset - roomSize / 2, wallHeight / 2, 4.5);
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
                        console.log('Wooden door fully opened');
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

    renderer.render(scene, camera);
}

console.log('Starting animation loop');
animate();
