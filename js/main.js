import * as THREE from "https://esm.sh/three@0.164.1";
import { GLTFLoader } from "https://esm.sh/three@0.164.1/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://esm.sh/three@0.164.1/examples/jsm/controls/OrbitControls.js";
import { StereoEffect } from "https://esm.sh/three@0.164.1/examples/jsm/effects/StereoEffect.js";

const viewer = document.getElementById("viewer");
const btnVR = document.getElementById("btnVR");
const tipoVR = document.getElementById("tipoVR");

const navbar = document.getElementById("navbar");
const footer = document.getElementById("footer");
const panelConfig = document.getElementById("panelConfig");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

const ALTURA_CAMARA = 1.7;
const LIMITE_PISO = 1.2;

const camera = new THREE.PerspectiveCamera(
  75,
  viewer.clientWidth / viewer.clientHeight,
  0.1,
  1000,
);

camera.position.set(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
});

renderer.setSize(viewer.clientWidth, viewer.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

viewer.appendChild(renderer.domElement);

const effect = new StereoEffect(renderer);
effect.setSize(viewer.clientWidth, viewer.clientHeight);

let modoVR = false;
let vistaSeleccionada = "normal";

let usarGiroscopio = false;
let alpha = 0;
let beta = 0;
let gamma = 0;

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
player.position.set(0, ALTURA_CAMARA, 6);
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

if (tipoVR) {
  tipoVR.addEventListener("change", () => {
    vistaSeleccionada = tipoVR.value;
  });
}

if (btnVR) {
  btnVR.addEventListener("click", async () => {
    modoVR = !modoVR;

    if (modoVR) {
      await activarPantallaCompleta();
      await activarGiroscopio();
    } else {
      salirPantallaCompleta();
      desactivarGiroscopio();
    }

    resizeRenderer();
  });
}

async function activarPantallaCompleta() {
  navbar.style.display = "none";
  footer.style.display = "none";
  panelConfig.style.display = "none";

  viewer.classList.add("fullscreen-viewer");

  btnVR.textContent = "Salir de VR";
  btnVR.classList.add("btn-danger");
  btnVR.classList.remove("btn-primary");

  await document.documentElement.requestFullscreen?.();

  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock("landscape").catch(() => {});
  }
}

function salirPantallaCompleta() {
  navbar.style.display = "block";
  footer.style.display = "block";
  panelConfig.style.display = "block";

  viewer.classList.remove("fullscreen-viewer");

  btnVR.textContent = "Activar modo VR";
  btnVR.classList.add("btn-primary");
  btnVR.classList.remove("btn-danger");

  document.exitFullscreen?.();
}

async function activarGiroscopio() {
  try {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      const permiso = await DeviceOrientationEvent.requestPermission();

      if (permiso !== "granted") {
        alert("No se concedió permiso para usar el giroscopio.");
        return;
      }
    }

    window.addEventListener("deviceorientation", leerOrientacion, true);

    usarGiroscopio = true;
    controls.enabled = false;
  } catch (error) {
    console.error("Error al activar giroscopio:", error);
    alert("Tu navegador no permitió usar el giroscopio.");
  }
}

function desactivarGiroscopio() {
  usarGiroscopio = false;
  window.removeEventListener("deviceorientation", leerOrientacion, true);
  controls.enabled = true;
}

function leerOrientacion(event) {
  alpha = event.alpha || 0;
  beta = event.beta || 0;
  gamma = event.gamma || 0;
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

    player.position.set(0, ALTURA_CAMARA, 6);
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

  if (player.position.y < LIMITE_PISO) {
    player.position.y = LIMITE_PISO;
  }
}

function aplicarGiroscopio() {
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(beta - 90),
    THREE.MathUtils.degToRad(alpha),
    THREE.MathUtils.degToRad(-gamma),
    "YXZ",
  );

  camera.quaternion.setFromEuler(euler);
}

function aplicarVistaVR() {
  if (vistaSeleccionada === "cardboard1") {
    camera.fov = 70;
    effect.eyeSeparation = 0.055;
  }

  if (vistaSeleccionada === "cardboard2") {
    camera.fov = 80;
    effect.eyeSeparation = 0.064;
  }

  if (vistaSeleccionada === "normal") {
    camera.fov = 75;
  }

  camera.updateProjectionMatrix();
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

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && modoVR) {
    modoVR = false;
    salirPantallaCompleta();
    desactivarGiroscopio();
  }
});

renderer.setAnimationLoop(() => {
  movePlayer();

  if (usarGiroscopio) {
    aplicarGiroscopio();
  } else {
    controls.update();
  }

  aplicarVistaVR();

  if (modoVR && vistaSeleccionada !== "normal") {
    effect.render(scene, camera);
  } else {
    renderer.render(scene, camera);
  }
});
