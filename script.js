import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

camera.position.set(0, 1.7, 0);

const controls = new PointerLockControls(camera, document.body);
let isMouseDown = false;

document.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        isMouseDown = true;
        controls.lock();
    }
});

document.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        isMouseDown = false;
        controls.unlock();
    }
});

const moveState = { w: false, s: false, a: false, d: false };
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

document.addEventListener('keydown', (e) => {
    if (e.key === 'w') moveState.w = true;
    if (e.key === 's') moveState.s = true;
    if (e.key === 'a') moveState.a = true;
    if (e.key === 'd') moveState.d = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'w') moveState.w = false;
    if (e.key === 's') moveState.s = false;
    if (e.key === 'a') moveState.a = false;
    if (e.key === 'd') moveState.d = false;
});

const textureLoader = new THREE.TextureLoader();

const wallTexture = textureLoader.load('https://raw.githubusercontent.com/zymselina1116-bit/explore1/bc6cc02efce2574779b5c11bbd7d45fd5c88c0f7/Screenshot%202025-11-16%20at%2022.53.11.png');
const floorTexture = textureLoader.load('https://raw.githubusercontent.com/zymselina1116-bit/explore1/dff059a88212ae711ad111cd1c7e122d5960b4c6/Screenshot%202025-11-16%20at%2022.51.42.png');
const exitSignTexture = textureLoader.load('https://raw.githubusercontent.com/zymselina1116-bit/explore1/5d3e31b7b410add1d2eb0c84ad5b7b226538c480/Screenshot%202025-11-16%20at%2022.55.14.png');
const metalDoorTexture = textureLoader.load('https://raw.githubusercontent.com/zymselina1116-bit/explore1/5d3e31b7b410add1d2eb0c84ad5b7b226538c480/Screenshot%202025-11-16%20at%2022.54.35.png');
const woodenDoorTexture = textureLoader.load('https://raw.githubusercontent.com/zymselina1116-bit/explore1/abde0ebda68734a1b01823d64e4866f7de0576ac/870c5435ceffda4aa972afb3244c2eca-removebg-preview.png');
const keyBoardTexture = textureLoader.load('https://raw.githubusercontent.com/zymselina1116-bit/explore1/9ab3c168a10a41d2fe3597c3822f637864d4cd87/Screenshot%202025-11-17%20at%2011.10.47.png');
const keysTexture = textureLoader.load('https://raw.githubusercontent.com/zymselina1116-bit/explore1/dd860cf4ac71beb691b5df190ce91ca23b69f4d6/Screenshot_2025-11-17_at_12.33.23-removebg-preview.png');
const cardTexture = textureLoader.load('https://raw.githubusercontent.com/zymselina1116-bit/explore1/c047a4d3a7c936d4139a67e599e3b2e9bf8d72e0/Screenshot_2025-11-17_at_12.30.02-removebg-preview%20(1).png');
const cardReaderTexture = textureLoader.load('https://raw.githubusercontent.com/zymselina1116-bit/explore1/ab2a7a7ae2c696ba19c868a450f29b93a7cf741a/64a4a7a4f17dd4b4087b2c9feb3245e0-removebg-preview.png');

wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(2, 2);

const roomWidth = 8;
const roomHeight = 4;
const roomDepth = 8;

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomDepth),
    new THREE.MeshStandardMaterial({ map: floorTexture })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomDepth),
    new THREE.MeshStandardMaterial({ map: floorTexture })
);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = roomHeight;
scene.add(ceiling);

const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomHeight),
    new THREE.MeshStandardMaterial({ map: wallTexture })
);
backWall.position.set(0, roomHeight / 2, -roomDepth / 2);
scene.add(backWall);

const frontWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomHeight),
    new THREE.MeshStandardMaterial({ map: wallTexture })
);
frontWall.rotation.y = Math.PI;
frontWall.position.set(0, roomHeight / 2, roomDepth / 2);
scene.add(frontWall);

const leftWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomDepth, roomHeight),
    new THREE.MeshStandardMaterial({ map: wallTexture })
);
leftWall.rotation.y = Math.PI / 2;
leftWall.position.set(-roomWidth / 2, roomHeight / 2, 0);
scene.add(leftWall);

const rightWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomDepth, roomHeight),
    new THREE.MeshStandardMaterial({ map: wallTexture })
);
rightWall.rotation.y = -Math.PI / 2;
rightWall.position.set(roomWidth / 2, roomHeight / 2, 0);
scene.add(rightWall);

const metalDoor = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 2.5),
    new THREE.MeshStandardMaterial({ map: metalDoorTexture, transparent: true })
);
metalDoor.position.set(0, 1.25, roomDepth / 2 - 0.01);
metalDoor.rotation.y = Math.PI;
metalDoor.userData.isInteractive = true;
metalDoor.userData.type = 'metalDoor';
scene.add(metalDoor);

const exitSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.3),
    new THREE.MeshStandardMaterial({ map: exitSignTexture, transparent: true, emissive: new THREE.Color(0x00ff00), emissiveIntensity: 0.5 })
);
exitSign.position.set(0, 3.2, roomDepth / 2 - 0.01);
exitSign.rotation.y = Math.PI;
scene.add(exitSign);

const woodenDoor = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 2.5),
    new THREE.MeshStandardMaterial({ map: woodenDoorTexture, transparent: true })
);
woodenDoor.position.set(roomWidth / 2 - 0.01, 1.25, 0);
woodenDoor.rotation.y = -Math.PI / 2;
woodenDoor.userData.isInteractive = false;
scene.add(woodenDoor);

const keyBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.8),
    new THREE.MeshStandardMaterial({ map: keyBoardTexture })
);
keyBoard.position.set(-roomWidth / 2 + 0.01, 2, 0);
keyBoard.rotation.y = Math.PI / 2;
keyBoard.userData.isInteractive = true;
keyBoard.userData.type = 'keyBoard';
scene.add(keyBoard);

const decorativeKeys = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.2),
    new THREE.MeshStandardMaterial({ map: keysTexture, transparent: true })
);
decorativeKeys.position.set(-roomWidth / 2 + 0.02, 2.2, -0.3);
decorativeKeys.rotation.y = Math.PI / 2;
scene.add(decorativeKeys);

const accessCard = new THREE.Mesh(
    new THREE.PlaneGeometry(0.15, 0.1),
    new THREE.MeshStandardMaterial({ map: cardTexture, transparent: true })
);
accessCard.position.set(-roomWidth / 2 + 0.02, 1.8, 0.2);
accessCard.rotation.y = Math.PI / 2;
accessCard.userData.isInteractive = true;
accessCard.userData.type = 'accessCard';
scene.add(accessCard);

const cardReader = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.4),
    new THREE.MeshStandardMaterial({ map: cardReaderTexture, transparent: true })
);
cardReader.position.set(-0.8, 1.5, roomDepth / 2 - 0.01);
cardReader.rotation.y = Math.PI;
cardReader.userData.isInteractive = true;
cardReader.userData.type = 'cardReader';
scene.add(cardReader);

const mailbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.3, 0.2),
    new THREE.MeshStandardMaterial({ map: wallTexture })
);
mailbox.position.set(2, 1.5, -roomDepth / 2 + 0.15);
mailbox.userData.isInteractive = true;
mailbox.userData.type = 'mailbox';
scene.add(mailbox);

const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
scene.add(ambientLight);

const redLight1 = new THREE.PointLight(0xff0000, 2, 15);
redLight1.position.set(-2, roomHeight - 0.3, 0);
scene.add(redLight1);

const redLight2 = new THREE.PointLight(0xff0000, 2, 15);
redLight2.position.set(2, roomHeight - 0.3, 0);
scene.add(redLight2);

const spotlight = new THREE.SpotLight(0xffaa88, 3, 5, Math.PI / 6, 0.5);
spotlight.position.set(-roomWidth / 2 + 0.5, roomHeight - 0.5, 0);
spotlight.target.position.set(-roomWidth / 2 + 0.01, 2, 0);
scene.add(spotlight);
scene.add(spotlight.target);

const collisionObjects = [
    { box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, roomHeight / 2, -roomDepth / 2), new THREE.Vector3(roomWidth, roomHeight, 0.1)) },
    { box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, roomHeight / 2, roomDepth / 2), new THREE.Vector3(roomWidth, roomHeight, 0.1)), door: metalDoor },
    { box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(-roomWidth / 2, roomHeight / 2, 0), new THREE.Vector3(0.1, roomHeight, roomDepth)) },
    { box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(roomWidth / 2, roomHeight / 2, 0), new THREE.Vector3(0.1, roomHeight, roomDepth)) },
    { box: new THREE.Box3().setFromObject(keyBoard) },
    { box: new THREE.Box3().setFromObject(cardReader) },
    { box: new THREE.Box3().setFromObject(mailbox) }
];

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredObject = null;

const inventory = {
    hasCard: false
};

let doorOpen = false;
let doorAnimation = { progress: 0, opening: false };

document.addEventListener('click', (event) => {
    if (isMouseDown || controls.isLocked) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const object = intersects[0].object;

        if (object.userData.type === 'accessCard') {
            scene.remove(accessCard);
            inventory.hasCard = true;
            updateBackpack();
        }

        if (object.userData.type === 'cardReader' && inventory.hasCard && !doorOpen) {
            doorAnimation.opening = true;
            doorOpen = true;
            collisionObjects[1].disabled = true;
        }
    }
});

document.addEventListener('mousemove', (event) => {
    if (isMouseDown || controls.isLocked) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (hoveredObject) {
        if (hoveredObject.userData.originalEmissive !== undefined) {
            hoveredObject.material.emissive.copy(hoveredObject.userData.originalEmissive);
        }
        hoveredObject = null;
    }

    if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object.userData.isInteractive) {
            hoveredObject = object;
            if (!hoveredObject.userData.originalEmissive) {
                hoveredObject.userData.originalEmissive = hoveredObject.material.emissive.clone();
            }
            hoveredObject.material.emissive.setHex(0x333333);
        }
    }
});

const backpackIcon = document.getElementById('backpack-icon');
const backpackPanel = document.getElementById('backpack-panel');

backpackIcon.addEventListener('click', () => {
    backpackPanel.style.display = backpackPanel.style.display === 'none' ? 'block' : 'none';
});

function updateBackpack() {
    const content = document.getElementById('backpack-content');
    content.innerHTML = '';

    if (inventory.hasCard) {
        const cardItem = document.createElement('div');
        cardItem.className = 'backpack-item';
        cardItem.style.backgroundImage = `url('https://raw.githubusercontent.com/zymselina1116-bit/explore1/c047a4d3a7c936d4139a67e599e3b2e9bf8d72e0/Screenshot_2025-11-17_at_12.30.02-removebg-preview%20(1).png')`;
        content.appendChild(cardItem);
    }
}

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    const time = performance.now() * 0.001;
    redLight1.intensity = 2 + Math.sin(time * 2) * 0.5;
    redLight2.intensity = 2 + Math.sin(time * 2 + Math.PI) * 0.5;

    if (doorAnimation.opening) {
        doorAnimation.progress += delta * 0.8;
        if (doorAnimation.progress >= 1) {
            doorAnimation.progress = 1;
            doorAnimation.opening = false;
        }
        metalDoor.position.x = -doorAnimation.progress * 1.5;
    }

    velocity.x = 0;
    velocity.z = 0;

    direction.z = Number(moveState.s) - Number(moveState.w);
    direction.x = Number(moveState.d) - Number(moveState.a);
    direction.normalize();

    const speed = 3;

    if (moveState.w || moveState.s) velocity.z = direction.z * speed * delta;
    if (moveState.a || moveState.d) velocity.x = direction.x * speed * delta;

    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.setFromQuaternion(camera.quaternion);

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(euler);
    const right = new THREE.Vector3(1, 0, 0).applyEuler(euler);

    const moveVector = new THREE.Vector3();
    moveVector.addScaledVector(forward, velocity.z);
    moveVector.addScaledVector(right, velocity.x);

    const newPosition = camera.position.clone().add(moveVector);
    const playerBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(newPosition.x, camera.position.y, newPosition.z),
        new THREE.Vector3(0.5, 1.7, 0.5)
    );

    let collision = false;
    for (const obj of collisionObjects) {
        if (obj.disabled) continue;
        if (playerBox.intersectsBox(obj.box)) {
            collision = true;
            break;
        }
    }

    if (!collision) {
        camera.position.add(moveVector);
    }

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
