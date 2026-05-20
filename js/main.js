import * as THREE from "https://esm.sh/three@0.164.1";
import { GLTFLoader } from "https://esm.sh/three@0.164.1/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://esm.sh/three@0.164.1/examples/jsm/controls/OrbitControls.js";
import { VRButton } from "https://esm.sh/three@0.164.1/examples/jsm/webxr/VRButton.js";

const viewer = document.getElementById("viewer");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

const camera = new THREE.PerspectiveCamera(
  75,
  viewer.clientWidth / viewer.clientHeight,
  0.1,
  1000,
);

camera.position.set(0, 1.7, 6);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
});

renderer.setSize(viewer.clientWidth, viewer.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.xr.enabled = true;

viewer.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

const grid = new THREE.GridHelper(20, 20);
scene.add(grid);

const player = new THREE.Group();
player.position.set(0, 1.7, 6);
scene.add(player);
player.add(camera);

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

window.addEventListener("keydown", (e) => {
  if (e.key === "w" || e.key === "ArrowUp") keys.forward = true;
  if (e.key === "s" || e.key === "ArrowDown") keys.backward = true;
  if (e.key === "a" || e.key === "ArrowLeft") keys.left = true;
  if (e.key === "d" || e.key === "ArrowRight") keys.right = true;
});

window.addEventListener("keyup", (e) => {
  if (e.key === "w" || e.key === "ArrowUp") keys.forward = false;
  if (e.key === "s" || e.key === "ArrowDown") keys.backward = false;
  if (e.key === "a" || e.key === "ArrowLeft") keys.left = false;
  if (e.key === "d" || e.key === "ArrowRight") keys.right = false;
});

const loader = new GLTFLoader();

loader.load(
  "models/modelo.glb",
  function (gltf) {
    const model = gltf.scene;
    scene.add(model);

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    model.position.x -= center.x;
    model.position.y -= center.y;
    model.position.z -= center.z;

    const maxSize = Math.max(size.x, size.y, size.z);
    const scale = 5 / maxSize;
    model.scale.setScalar(scale);

    model.position.y = 0;

    controls.target.set(0, 1, 0);
    controls.update();

    camera.position.set(0, 1.7, 6);
    player.position.set(0, 1.7, 6);
  },
  function (xhr) {
    console.log(`Cargando: ${(xhr.loaded / xhr.total) * 100}%`);
  },
  function (error) {
    console.error("Error al cargar el modelo:", error);
  },
);

function movePlayer() {
  const speed = 0.05;

  const direction = new THREE.Vector3();

  if (keys.forward) direction.z -= speed;
  if (keys.backward) direction.z += speed;
  if (keys.left) direction.x -= speed;
  if (keys.right) direction.x += speed;

  player.position.add(direction);
}

window.addEventListener("resize", () => {
  camera.aspect = viewer.clientWidth / viewer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewer.clientWidth, viewer.clientHeight);
});

renderer.setAnimationLoop(() => {
  movePlayer();
  controls.update();
  renderer.render(scene, camera);
});
