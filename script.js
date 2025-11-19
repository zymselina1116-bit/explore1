import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { PointerLockControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

camera.position.set(0, 2.5, 0);

const textureLoader = new THREE.TextureLoader();
const inventory = [];
const collectedEvidence = new Set();
const interactiveObjects = [];
const worldObjects = [];

let isMouseDown = false;
let previousMousePosition = { x: 0, y: 0 };
let yaw = 0;
let pitch = 0;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const moveState = { forward: false, backward: false, left: false, right: false };

function loadTexture(url) {
    const texture = textureLoader.load(url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/'));
    texture.encoding = THREE.sRGBEncoding;
    return texture;
}

const textures = {
    room1: {
        wall: loadTexture('https://github.com/zymselina1116-bit/explore1/blob/bc6cc02efce2574779b5c11bbd7d45fd5c88c0f7/Screenshot%202025-11-16%20at%2022.53.11.png'),
        floor: loadTexture('https://github.com/zymselina1116-bit/explore1/blob/dff059a88212ae711ad111cd1c7e122d5960b4c6/Screenshot%202025-11-16%20at%2022.51.42.png'),
        exitSign: loadTexture('https://github.com/zymselina1116-bit/explore1/blob/5d3e31b7b410add1d2eb0c84ad5b7b226538c480/Screenshot%202025-11-16%20at%2022.55.14.png'),
        door: loadTexture('https://github.com/zymselina1116-bit/explore1/blob/5d3e31b7b410add1d2eb0c84ad5b7b226538c480/Screenshot%202025-11-16%20at%2022.54.35.png'),
        keyBoard: loadTexture('https://github.com/zymselina1116-bit/explore1/blob/9ab3c168a10a41d2fe3597c3822f637864d4cd87/Screenshot%202025-11-17%20at%2011.10.47.png'),
        decorativeKey: loadTexture('https://github.com/zymselina1116-bit/explore1/blob/dd860cf4ac71beb6913db100d1620c43ea7a9db3/Screenshot_2025-11-17_at_12.33.23-removebg-preview.png'),
        card: loadTexture('https://github.com/zymselina1116-bit/explore1/blob/c047a4d3a7c936d4139a67e599e3b2e9bf8d72e0/Screenshot_2025-11-17_at_12.30.02-removebg-preview%20(1).png'),
        cardReader: loadTexture('https://github.com/zymselina1116-bit/explore1/blob/ab2a7a7ae2c696ba19c868a450f29b93a7cf741a/64a4a7a4f17dd4b4087b2c9feb3245e0-removebg-preview.png')
    },
    room2: {
        floor: loadTexture('https://github.com/zymselina1116-bit/explore1/blob/065d4eb3c2ae1c5b3b33a8199bf266160fd5d135/Screenshot%202025-11-16%20at%2022.56.00.png'),
        woodenDoor: loadTexture('https://github.com/zymselina1116-bit/explore1/blob/abde0ebda68734a1b01823d64e4866f7de0576ac/870c5435ceffda4aa972afb3244c2eca-removebg-preview.png'),
        drawer: loadTexture('https://github.com/zymselina1116-bit/explore1/blob/22176af62993a5a20de5a1507d22889651da79ee/Screenshot%202025-11-17%20at%2022.38.36.png'),
        deskChair: loadTexture('https://github.com/zymselina1116-bit/explore1/blob/0cea118e27622c79370204d5d8f16df07b6c040a/Screenshot%202025-11-17%20at%2014.38.31.png'),
        keyBoard2: loadTexture('https://github.com/zymselina1116-bit/explore1/blob/0f765bfd4724117ff007b30c785519fded800442/Screenshot%202025-11-17%20at%2014.39.55.png'),
        sketch: loadTexture('https://github.com/zymselina1116-bit/explore1/blob/59a16a5bca99236efd7ccbe3aa5171537e9e601c/Screenshot%202025-11-17%20at%2014.12.36.png'),
        profile: loadTexture('https://github.com/zymselina1116-bit/explore1/blob/f926237eaddf468b678626e4a12502f8706ec9a1/Screenshot%202025-11-17%20at%2014.17.01.png'),
        map: loadTexture('https://github.com/zymselina1116-bit/explore1/blob/920492d25b27d3757056b528df0994eeaba4f374/Screenshot%202025-11-17%20at%2014.18.31.png'),
        goldenKey: loadTexture('https://github.com/zymselina1116-bit/explore1/blob/5ab47d9b881a577ccdce9dcd7f8237378014ae1e/70dc331664376a64a8050baa7c7744a6-removebg-preview.png')
    }
};

textures.room1.floor.wrapS = textures.room1.floor.wrapT = THREE.RepeatWrapping;
textures.room1.floor.repeat.set(4, 4);
textures.room1.wall.wrapS = textures.room1.wall.wrapT = THREE.RepeatWrapping;
textures.room1.wall.repeat.set(2, 2);
textures.room2.floor.wrapS = textures.room2.floor.wrapT = THREE.RepeatWrapping;
textures.room2.floor.repeat.set(4, 4);

function createRoom1() {
    const roomSize = 15;
    const wallHeight = 5;

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(roomSize, roomSize),
        new THREE.MeshStandardMaterial({ map: textures.room1.floor })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);
    worldObjects.push(floor);

    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(roomSize, roomSize),
        new THREE.MeshStandardMaterial({ map: textures.room1.wall })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = wallHeight;
    scene.add(ceiling);

    const wallGeometry = new THREE.PlaneGeometry(roomSize, wallHeight);

    const wallNorth = new THREE.Mesh(wallGeometry, new THREE.MeshStandardMaterial({ map: textures.room1.wall }));
    wallNorth.position.set(0, wallHeight / 2, -roomSize / 2);
    scene.add(wallNorth);
    worldObjects.push(wallNorth);

    const wallSouth = new THREE.Mesh(wallGeometry, new THREE.MeshStandardMaterial({ map: textures.room1.wall }));
    wallSouth.position.set(0, wallHeight / 2, roomSize / 2);
    wallSouth.rotation.y = Math.PI;
    scene.add(wallSouth);
    worldObjects.push(wallSouth);

    const wallWest = new THREE.Mesh(wallGeometry, new THREE.MeshStandardMaterial({ map: textures.room1.wall }));
    wallWest.position.set(-roomSize / 2, wallHeight / 2, 0);
    wallWest.rotation.y = Math.PI / 2;
    scene.add(wallWest);
    worldObjects.push(wallWest);

    const wallEast = new THREE.Mesh(wallGeometry, new THREE.MeshStandardMaterial({ map: textures.room1.wall }));
    wallEast.position.set(roomSize / 2, wallHeight / 2, 0);
    wallEast.rotation.y = -Math.PI / 2;
    scene.add(wallEast);
    worldObjects.push(wallEast);

    const redLight1 = new THREE.PointLight(0xff0000, 2, 15);
    redLight1.position.set(-3, wallHeight - 0.5, -3);
    scene.add(redLight1);
    redLight1.userData.pulseLight = true;
    redLight1.userData.baseIntensity = 2;

    const redLight2 = new THREE.PointLight(0xff0000, 2, 15);
    redLight2.position.set(3, wallHeight - 0.5, 3);
    scene.add(redLight2);
    redLight2.userData.pulseLight = true;
    redLight2.userData.baseIntensity = 2;

    const keyBoardSpotlight = new THREE.SpotLight(0xffaa77, 3, 10, Math.PI / 6);
    keyBoardSpotlight.position.set(-6, 3, 0);
    keyBoardSpotlight.target.position.set(-roomSize / 2 + 0.1, 2, 0);
    scene.add(keyBoardSpotlight);
    scene.add(keyBoardSpotlight.target);

    const keyBoard = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 1.5),
        new THREE.MeshStandardMaterial({ map: textures.room1.keyBoard })
    );
    keyBoard.position.set(-roomSize / 2 + 0.05, 2, 0);
    keyBoard.rotation.y = Math.PI / 2;
    scene.add(keyBoard);

    for (let i = 0; i < 5; i++) {
        const decorKey = new THREE.Mesh(
            new THREE.PlaneGeometry(0.15, 0.15),
            new THREE.MeshStandardMaterial({ map: textures.room1.decorativeKey, transparent: true })
        );
        decorKey.position.set(-roomSize / 2 + 0.06, 2 + (i - 2) * 0.2, (i - 2) * 0.3);
        decorKey.rotation.y = Math.PI / 2;
        scene.add(decorKey);
    }

    const collectibleCard = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.4),
        new THREE.MeshStandardMaterial({ map: textures.room1.card, transparent: true })
    );
    collectibleCard.position.set(-roomSize / 2 + 0.07, 2, 0.8);
    collectibleCard.rotation.y = Math.PI / 2;
    scene.add(collectibleCard);
    collectibleCard.userData.isCollectible = true;
    collectibleCard.userData.itemType = 'card';
    collectibleCard.userData.texture = textures.room1.card;
    interactiveObjects.push(collectibleCard);

    const cardReader = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.7),
        new THREE.MeshStandardMaterial({ map: textures.room1.cardReader, transparent: true })
    );
    cardReader.position.set(roomSize / 2 - 0.05, 1.5, 2);
    cardReader.rotation.y = -Math.PI / 2;
    scene.add(cardReader);
    cardReader.userData.isCardReader = true;
    interactiveObjects.push(cardReader);

    const exitDoor = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 4),
        new THREE.MeshStandardMaterial({ map: textures.room1.door })
    );
    exitDoor.position.set(roomSize / 2 - 0.05, 2, 0);
    exitDoor.rotation.y = -Math.PI / 2;
    scene.add(exitDoor);
    exitDoor.userData.isExitDoor = true;
    exitDoor.userData.closed = true;
    worldObjects.push(exitDoor);

    const doorCollider = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 4, 2),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    doorCollider.position.set(roomSize / 2 - 0.15, 2, 0);
    scene.add(doorCollider);
    doorCollider.userData.doorCollider = true;
    doorCollider.userData.door = exitDoor;
    worldObjects.push(doorCollider);

    const mailbox = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.8, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.3 })
    );
    mailbox.position.set(3, 0.4, -5);
    scene.add(mailbox);
    mailbox.userData.isMailbox = true;
    interactiveObjects.push(mailbox);
    worldObjects.push(mailbox);
}

function createRoom2() {
    const roomSize = 15;
    const wallHeight = 5;
    const roomOffset = 15;

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(roomSize, roomSize),
        new THREE.MeshStandardMaterial({ map: textures.room2.floor })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(roomOffset, 0, 0);
    scene.add(floor);
    worldObjects.push(floor);

    const wallGeometry = new THREE.PlaneGeometry(roomSize, wallHeight);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x334455 });

    const wallNorth = new THREE.Mesh(wallGeometry, wallMaterial.clone());
    wallNorth.position.set(roomOffset, wallHeight / 2, -roomSize / 2);
    scene.add(wallNorth);
    worldObjects.push(wallNorth);

    const wallSouth = new THREE.Mesh(wallGeometry, wallMaterial.clone());
    wallSouth.position.set(roomOffset, wallHeight / 2, roomSize / 2);
    wallSouth.rotation.y = Math.PI;
    scene.add(wallSouth);
    worldObjects.push(wallSouth);

    const wallWest = new THREE.Mesh(wallGeometry, wallMaterial.clone());
    wallWest.position.set(roomOffset - roomSize / 2, wallHeight / 2, 0);
    wallWest.rotation.y = Math.PI / 2;
    scene.add(wallWest);
    worldObjects.push(wallWest);

    const wallEast = new THREE.Mesh(wallGeometry, wallMaterial.clone());
    wallEast.position.set(roomOffset + roomSize / 2, wallHeight / 2, 0);
    wallEast.rotation.y = -Math.PI / 2;
    scene.add(wallEast);
    worldObjects.push(wallEast);

    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(roomSize, roomSize),
        wallMaterial.clone()
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(roomOffset, wallHeight, 0);
    scene.add(ceiling);

    const blueLight = new THREE.PointLight(0x0088ff, 2, 20);
    blueLight.position.set(roomOffset - 3, wallHeight - 0.5, -3);
    scene.add(blueLight);

    const greenLight = new THREE.PointLight(0x00ff88, 2, 20);
    greenLight.position.set(roomOffset + 3, wallHeight - 0.5, 3);
    scene.add(greenLight);

    const ambientLight = new THREE.AmbientLight(0x446688, 0.5);
    scene.add(ambientLight);

    for (let i = 0; i < 12; i++) {
        const desk = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.8, 0.6),
            new THREE.MeshStandardMaterial({ map: textures.room2.deskChair })
        );
        const row = Math.floor(i / 3);
        const col = i % 3;
        desk.position.set(roomOffset - 4 + col * 2.5, 0.4, -4 + row * 2.5);
        scene.add(desk);
        worldObjects.push(desk);
    }

    for (let i = 0; i < 15; i++) {
        const chair = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.8, 0.4),
            new THREE.MeshStandardMaterial({ map: textures.room2.deskChair })
        );
        const row = Math.floor(i / 3);
        const col = i % 3;
        chair.position.set(roomOffset - 4 + col * 2.5, 0.4, -3 + row * 2.5);
        scene.add(chair);
        worldObjects.push(chair);
    }

    const sketch = new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, 0.4),
        new THREE.MeshStandardMaterial({ map: textures.room2.sketch })
    );
    sketch.position.set(roomOffset - 4, 0.85, -4);
    sketch.rotation.x = -Math.PI / 2;
    scene.add(sketch);
    sketch.userData.isCollectible = true;
    sketch.userData.itemType = 'sketch';
    sketch.userData.texture = textures.room2.sketch;
    interactiveObjects.push(sketch);

    const profile = new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, 0.4),
        new THREE.MeshStandardMaterial({ map: textures.room2.profile })
    );
    profile.position.set(roomOffset + 1.5, 0.85, -1.5);
    profile.rotation.x = -Math.PI / 2;
    scene.add(profile);
    profile.userData.isCollectible = true;
    profile.userData.itemType = 'profile';
    profile.userData.texture = textures.room2.profile;
    interactiveObjects.push(profile);

    const drawer = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.4, 0.5),
        new THREE.MeshStandardMaterial({ map: textures.room2.drawer })
    );
    drawer.position.set(roomOffset + 3, 0.6, 3);
    scene.add(drawer);
    drawer.userData.isDrawer = true;
    drawer.userData.closed = true;
    interactiveObjects.push(drawer);
    worldObjects.push(drawer);

    const map = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.3),
        new THREE.MeshStandardMaterial({ map: textures.room2.map })
    );
    map.position.set(roomOffset + 3.3, 0.6, 3);
    map.rotation.y = -Math.PI / 2;
    map.visible = false;
    scene.add(map);
    map.userData.isCollectible = true;
    map.userData.itemType = 'map';
    map.userData.texture = textures.room2.map;
    map.userData.inDrawer = true;
    drawer.userData.item = map;
    interactiveObjects.push(map);

    const keyBoard2 = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 1),
        new THREE.MeshStandardMaterial({ map: textures.room2.keyBoard2 })
    );
    keyBoard2.position.set(roomOffset - roomSize / 2 + 0.05, 2, -3);
    keyBoard2.rotation.y = Math.PI / 2;
    scene.add(keyBoard2);

    const goldenKey = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.2),
        new THREE.MeshStandardMaterial({ map: textures.room2.goldenKey, transparent: true })
    );
    goldenKey.position.set(roomOffset - roomSize / 2 + 0.06, 2, -3);
    goldenKey.rotation.y = Math.PI / 2;
    scene.add(goldenKey);
    goldenKey.userData.isCollectible = true;
    goldenKey.userData.itemType = 'goldenKey';
    goldenKey.userData.texture = textures.room2.goldenKey;
    goldenKey.userData.requiresEvidence = true;
    interactiveObjects.push(goldenKey);

    const woodenDoor = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 3.5),
        new THREE.MeshStandardMaterial({ map: textures.room2.woodenDoor, transparent: true })
    );
    woodenDoor.position.set(roomOffset + roomSize / 2 - 0.05, 1.75, 2);
    woodenDoor.rotation.y = -Math.PI / 2;
    scene.add(woodenDoor);
    woodenDoor.userData.isWoodenDoor = true;
    woodenDoor.userData.closed = true;
    interactiveObjects.push(woodenDoor);

    const doorCollider2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 3.5, 1.5),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    doorCollider2.position.set(roomOffset + roomSize / 2 - 0.15, 1.75, 2);
    scene.add(doorCollider2);
    doorCollider2.userData.doorCollider = true;
    doorCollider2.userData.door = woodenDoor;
    worldObjects.push(doorCollider2);
}

function createGarden() {
    const gardenSize = 20;
    const gardenOffset = 30;

    const grass = new THREE.Mesh(
        new THREE.PlaneGeometry(gardenSize, gardenSize),
        new THREE.MeshStandardMaterial({ color: 0x88dd88 })
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(gardenOffset, 0, 0);
    scene.add(grass);
    worldObjects.push(grass);

    const skyLight = new THREE.HemisphereLight(0xffffbb, 0x88dd88, 1.5);
    skyLight.position.set(gardenOffset, 10, 0);
    scene.add(skyLight);

    for (let i = 0; i < 20; i++) {
        const flower = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 8),
            new THREE.MeshStandardMaterial({ color: Math.random() > 0.5 ? 0xff88ff : 0xffff88, emissive: 0x444444 })
        );
        flower.position.set(
            gardenOffset + (Math.random() - 0.5) * gardenSize * 0.8,
            0.2,
            (Math.random() - 0.5) * gardenSize * 0.8
        );
        scene.add(flower);
    }

    const bone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xeeeecc })
    );
    bone.position.set(gardenOffset - 5, 0.4, -3);
    bone.rotation.z = Math.PI / 2;
    scene.add(bone);
    bone.userData.isCollectible = true;
    bone.userData.itemType = 'bone';
    bone.userData.color = 0xeeeecc;
    interactiveObjects.push(bone);

    const footprint = new THREE.Mesh(
        new THREE.CircleGeometry(1, 32),
        new THREE.MeshStandardMaterial({ color: 0x775533 })
    );
    footprint.rotation.x = -Math.PI / 2;
    footprint.position.set(gardenOffset + 4, 0.05, 4);
    scene.add(footprint);
    footprint.userData.isFootprint = true;
    footprint.userData.texture = textures.room2.profile;
    interactiveObjects.push(footprint);
}

createRoom1();
createRoom2();
createGarden();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

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

function onClick(event) {
    if (event.target !== renderer.domElement) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects);

    if (intersects.length > 0) {
        const obj = intersects[0].object;

        if (obj.userData.isCollectible && !obj.userData.collected) {
            if (obj.userData.requiresEvidence && collectedEvidence.size < 3) {
                return;
            }
            if (obj.userData.inDrawer && !obj.visible) {
                return;
            }

            obj.userData.collected = true;
            obj.visible = false;

            if (obj.userData.itemType === 'sketch' || obj.userData.itemType === 'profile' || obj.userData.itemType === 'map') {
                collectedEvidence.add(obj.userData.itemType);
            }

            inventory.push({
                type: obj.userData.itemType,
                texture: obj.userData.texture,
                mesh: obj,
                color: obj.userData.color
            });
            updateInventoryUI();
        } else if (obj.userData.isCardReader) {
            const hasCard = inventory.some(item => item.type === 'card');
            if (hasCard) {
                const door = scene.children.find(child => child.userData.isExitDoor);
                if (door && door.userData.closed) {
                    door.userData.closed = false;
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
            }
        } else if (obj.userData.isDrawer && obj.userData.closed) {
            obj.userData.closed = false;
            const item = obj.userData.item;
            if (item) {
                item.visible = true;
            }
            const slideAnim = setInterval(() => {
                obj.position.x += 0.02;
                if (item) item.position.x += 0.02;
                if (obj.position.x > obj.position.x + 0.4) {
                    clearInterval(slideAnim);
                }
            }, 16);
        } else if (obj.userData.isWoodenDoor && obj.userData.closed) {
            const hasGoldenKey = inventory.some(item => item.type === 'goldenKey');
            if (hasGoldenKey) {
                obj.userData.closed = false;
                const openAnim = setInterval(() => {
                    obj.rotation.y -= 0.05;
                    if (obj.rotation.y < -Math.PI) {
                        clearInterval(openAnim);
                        const collider = worldObjects.find(w => w.userData.doorCollider && w.userData.door === obj);
                        if (collider) {
                            worldObjects.splice(worldObjects.indexOf(collider), 1);
                            scene.remove(collider);
                        }
                    }
                }, 16);
            }
        } else if (obj.userData.isFootprint) {
            const viewer = document.getElementById('photo-viewer');
            viewer.style.backgroundImage = `url(${obj.userData.texture.image.src})`;
            viewer.classList.add('show');

            if (!inventory.some(item => item.type === 'footprint')) {
                inventory.push({
                    type: 'footprint',
                    texture: obj.userData.texture,
                    mesh: obj
                });
                updateInventoryUI();
            }
        } else if (obj.userData.isMailbox) {
            checkMailboxEnding();
        }
    }
}

function checkMailboxEnding() {
    const requiredItems = ['card', 'sketch', 'profile', 'map', 'goldenKey', 'bone', 'footprint'];
    const droppedItems = scene.children.filter(child => child.userData.droppedItem);

    let allItemsInMailbox = true;
    for (const itemType of requiredItems) {
        const found = droppedItems.some(child => {
            const mailbox = scene.children.find(c => c.userData.isMailbox);
            if (!mailbox) return false;
            const distance = child.position.distanceTo(mailbox.position);
            return child.userData.itemType === itemType && distance < 2;
        });
        if (!found) {
            allItemsInMailbox = false;
            break;
        }
    }

    if (allItemsInMailbox) {
        const endMsg = document.getElementById('end-message');
        endMsg.textContent = 'Thank you for sending the evidence.';
        endMsg.classList.add('show');
        setTimeout(() => {
            renderer.domElement.style.opacity = '0';
            renderer.domElement.style.transition = 'opacity 2s';
        }, 2000);
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
        } else if (item.color) {
            div.style.backgroundColor = `#${item.color.toString(16).padStart(6, '0')}`;
        }

        div.addEventListener('dblclick', () => {
            dropItem(index);
        });

        panel.appendChild(div);
    });
}

function dropItem(index) {
    const item = inventory[index];
    inventory.splice(index, 1);
    updateInventoryUI();

    const dropPos = camera.position.clone();
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    dropPos.add(forward.multiplyScalar(2));
    dropPos.y = 0.5;

    let droppedMesh;
    if (item.mesh) {
        droppedMesh = item.mesh;
        droppedMesh.position.copy(dropPos);
        droppedMesh.visible = true;
        droppedMesh.userData.collected = false;
        droppedMesh.userData.droppedItem = true;
        droppedMesh.userData.itemType = item.type;
    } else {
        droppedMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.3, 0.3),
            new THREE.MeshStandardMaterial({ color: item.color || 0xffffff })
        );
        droppedMesh.position.copy(dropPos);
        droppedMesh.userData.droppedItem = true;
        droppedMesh.userData.itemType = item.type;
        scene.add(droppedMesh);
        interactiveObjects.push(droppedMesh);
    }
}

document.getElementById('backpack').addEventListener('click', () => {
    const panel = document.getElementById('inventory-panel');
    panel.classList.toggle('open');
});

document.getElementById('photo-viewer').addEventListener('click', () => {
    document.getElementById('photo-viewer').classList.remove('show');
});

document.addEventListener('mousedown', onMouseDown);
document.addEventListener('mouseup', onMouseUp);
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('click', onClick);

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

    scene.children.forEach(child => {
        if (child.userData.pulseLight) {
            child.intensity = child.userData.baseIntensity + Math.sin(Date.now() * 0.003) * 0.5;
        }
    });

    renderer.render(scene, camera);
}

animate();
