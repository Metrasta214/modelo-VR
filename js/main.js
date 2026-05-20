import * as THREE from "https://esm.sh/three@0.164.1";
import { GLTFLoader } from "https://esm.sh/three@0.164.1/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://esm.sh/three@0.164.1/examples/jsm/controls/OrbitControls.js";
import { StereoEffect } from "https://esm.sh/three@0.164.1/examples/jsm/effects/StereoEffect.js";

const viewer = document.getElementById("viewer");
const btnVR = document.getElementById("btnVR");

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
});

renderer.setSize(viewer.clientWidth, viewer.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

viewer.appendChild(renderer.domElement);

const effect = new StereoEffect(renderer);
effect.setSize(viewer.clientWidth, viewer.clientHeight);

let modoVR = false;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
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

if (btnVR) {
  btnVR.addEventListener("click", async () => {
    modoVR = !modoVR;

    if (modoVR) {
      await document.documentElement.requestFullscreen?.();

      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(() => {});
      }

      btnVR.textContent = "Salir de VR";
    } else {
      document.exitFullscreen?.();
      btnVR.textContent = "Activar modo VR";
    }

    resizeRenderer();
  });
}

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

function resizeRenderer() {
  const width = viewer.clientWidth;
  const height = viewer.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  effect.setSize(width, height);
}

window.addEventListener("resize", resizeRenderer);
window.addEventListener("orientationchange", () => {
  setTimeout(resizeRenderer, 300);
});

renderer.setAnimationLoop(() => {
  movePlayer();
  controls.update();

  if (modoVR) {
    effect.render(scene, camera);
  } else {
    renderer.render(scene, camera);
  }
});
