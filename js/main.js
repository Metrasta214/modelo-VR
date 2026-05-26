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

const debugControl = document.getElementById("debugControl");
const debugTexto = document.getElementById("debugTexto");

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

const raycaster = new THREE.Raycaster();
const centroPantalla = new THREE.Vector2(0, 0);

let puntosTeleport = [];
let puntoMirado = null;
let tiempoMirando = 0;
const TIEMPO_TELEPORT = 1.5;

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
player.position.set(0, ALTURA_CAMARA, 0);
scene.add(player);
player.add(camera);

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

window.addEventListener("keydown", (e) => {
  e.preventDefault();

  if (debugTexto) {
    debugTexto.innerHTML = `
      KEYDOWN<br>
      key: ${e.key}<br>
      code: ${e.code}<br>
      keyCode: ${e.keyCode}
    `;
  }

  if (e.key === "w" || e.key === "ArrowUp") keys.forward = true;
  if (e.key === "s" || e.key === "ArrowDown") keys.backward = true;
  if (e.key === "a" || e.key === "ArrowLeft") keys.left = true;
  if (e.key === "d" || e.key === "ArrowRight") keys.right = true;
});

window.addEventListener("keyup", (e) => {
  e.preventDefault();

  if (debugTexto) {
    debugTexto.innerHTML = `
      KEYUP<br>
      key: ${e.key}<br>
      code: ${e.code}<br>
      keyCode: ${e.keyCode}
    `;
  }

  if (e.key === "w" || e.key === "ArrowUp") keys.forward = false;
  if (e.key === "s" || e.key === "ArrowDown") keys.backward = false;
  if (
    e.key === "a" ||
    e.key === "ArrowLeft" ||
    e.key === "MediaTrackPrevious" ||
    e.keyCode === 177
  ) {
    keys.left = false;
  }

  if (
    e.key === "d" ||
    e.key === "ArrowRight" ||
    e.key === "MediaTrackNext" ||
    e.keyCode === 176
  ) {
    keys.right = false;
  }
});

window.addEventListener("gamepadconnected", (e) => {
  if (debugTexto) {
    debugTexto.innerHTML = `
      GAMEPAD CONECTADO<br>
      ${e.gamepad.id}
    `;
  }

  alert("Control conectado: " + e.gamepad.id);
});

window.addEventListener("gamepaddisconnected", () => {
  if (debugTexto) {
    debugTexto.innerHTML = "GAMEPAD DESCONECTADO";
  }
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

  if (debugControl) {
    debugControl.style.display = "none";
  }

  viewer.classList.add("fullscreen-viewer");

  btnVR.textContent = "Salir de VR";
  btnVR.classList.add("btn-danger");
  btnVR.classList.remove("btn-primary");

  await document.documentElement.requestFullscreen?.();

  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock("landscape-primary").catch(() => {});
  }
}

function salirPantallaCompleta() {
  navbar.style.display = "block";
  footer.style.display = "block";
  panelConfig.style.display = "block";

  if (debugControl) {
    debugControl.style.display = "block";
  }

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

    model.position.set(0, 0, 0);
    model.scale.set(1, 1, 1);

    controls.target.set(0, 1, 0);
    controls.update();

    player.position.set(0, ALTURA_CAMARA, 0);

    crearPuntosTeleport();
  },
  function (xhr) {
    console.log(`Cargando: ${(xhr.loaded / xhr.total) * 100}%`);
  },
  function (error) {
    console.error("Error al cargar el modelo:", error);
  },
);

function crearPuntosTeleport() {
  const posiciones = [
    { nombre: "Inicio", x: 0, y: 1.2, z: 0 },
    { nombre: "Esquina 1", x: -3, y: 1.2, z: -3 },
    { nombre: "Esquina 2", x: 3, y: 1.2, z: -3 },
    { nombre: "Esquina 3", x: -3, y: 1.2, z: 3 },
    { nombre: "Esquina 4", x: 3, y: 1.2, z: 3 },
  ];

  posiciones.forEach((pos) => {
    const grupo = new THREE.Group();
    grupo.position.set(pos.x, pos.y, pos.z);
    grupo.name = pos.nombre;

    const marcador = new THREE.Group();

    const cabeza = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 64),
      new THREE.MeshBasicMaterial({
        color: 0xff4b3e,
        side: THREE.DoubleSide,
      }),
    );

    cabeza.position.y = 0.18;
    marcador.add(cabeza);

    const puntaShape = new THREE.Shape();
    puntaShape.moveTo(0, -0.35);
    puntaShape.lineTo(-0.16, 0.02);
    puntaShape.lineTo(0.16, 0.02);
    puntaShape.lineTo(0, -0.35);

    const punta = new THREE.Mesh(
      new THREE.ShapeGeometry(puntaShape),
      new THREE.MeshBasicMaterial({
        color: 0xff4b3e,
        side: THREE.DoubleSide,
      }),
    );

    marcador.add(punta);

    const centro = new THREE.Mesh(
      new THREE.CircleGeometry(0.11, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
      }),
    );

    centro.position.y = 0.18;
    centro.position.z = 0.01;
    marcador.add(centro);

    grupo.add(marcador);

    const progreso = crearCirculoProgreso(0.01);
    progreso.position.y = 0.18;
    progreso.position.z = 0.02;
    grupo.add(progreso);

    grupo.userData.destino = new THREE.Vector3(pos.x, ALTURA_CAMARA, pos.z);
    grupo.userData.progreso = progreso;
    grupo.userData.marcador = marcador;

    scene.add(grupo);
    puntosTeleport.push(grupo);
  });
}

function crearCirculoProgreso(progreso) {
  const circulo = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.32, 64, 1, 0, Math.PI * 2 * progreso),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    }),
  );

  return circulo;
}

function actualizarMarcadores() {
  puntosTeleport.forEach((punto) => {
    punto.lookAt(camera.getWorldPosition(new THREE.Vector3()));
  });
}

function actualizarTeleport(delta) {
  raycaster.setFromCamera(centroPantalla, camera);

  const objetos = puntosTeleport.flatMap((punto) => punto.children);
  const intersects = raycaster.intersectObjects(objetos, true);

  if (intersects.length > 0) {
    const objeto = intersects[0].object;
    const grupo = objeto.parent;

    if (!grupo || !grupo.userData.destino) return;

    if (puntoMirado === grupo) {
      tiempoMirando += delta;
    } else {
      resetearProgresoTeleport();
      puntoMirado = grupo;
      tiempoMirando = 0;
    }

    const progreso = Math.min(tiempoMirando / TIEMPO_TELEPORT, 1);

    grupo.remove(grupo.userData.progreso);

    const nuevoProgreso = crearCirculoProgreso(progreso);
    nuevoProgreso.position.y = 0.18;
    nuevoProgreso.position.z = 0.02;

    grupo.userData.progreso = nuevoProgreso;
    grupo.add(nuevoProgreso);

    if (progreso >= 1) {
      const destino = grupo.userData.destino;
      player.position.set(destino.x, ALTURA_CAMARA, destino.z);

      resetearProgresoTeleport();
    }
  } else {
    resetearProgresoTeleport();
  }
}

function resetearProgresoTeleport() {
  if (puntoMirado && puntoMirado.userData.progreso) {
    puntoMirado.remove(puntoMirado.userData.progreso);

    const progresoVacio = crearCirculoProgreso(0.01);
    progresoVacio.position.y = 0.18;
    progresoVacio.position.z = 0.02;

    puntoMirado.userData.progreso = progresoVacio;
    puntoMirado.add(progresoVacio);
  }

  puntoMirado = null;
  tiempoMirando = 0;
}

function leerGamepad() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

  for (const gamepad of gamepads) {
    if (!gamepad) continue;

    const ejeX = gamepad.axes[0] || 0;
    const ejeY = gamepad.axes[1] || 0;

    const botones = gamepad.buttons
      .map((b, i) => (b.pressed ? i : null))
      .filter((i) => i !== null);

    if (debugTexto) {
      debugTexto.innerHTML = `
        GAMEPAD<br>
        id: ${gamepad.id}<br>
        ejeX: ${ejeX.toFixed(2)}<br>
        ejeY: ${ejeY.toFixed(2)}<br>
        botones: ${botones.join(", ")}
      `;
    }

    keys.forward = ejeY < -0.3 || gamepad.buttons[0]?.pressed;
    keys.backward = ejeY > 0.3 || gamepad.buttons[1]?.pressed;
    keys.left = ejeX < -0.3;
    keys.right = ejeX > 0.3;
  }
}

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
  const orientacionPantalla =
    screen.orientation?.angle || window.orientation || 0;

  const alphaRad = THREE.MathUtils.degToRad(alpha);
  const betaRad = THREE.MathUtils.degToRad(beta);
  const gammaRad = THREE.MathUtils.degToRad(gamma);
  const orientacionRad = THREE.MathUtils.degToRad(orientacionPantalla);

  const euler = new THREE.Euler(betaRad, alphaRad, -gammaRad, "YXZ");

  const quaternion = new THREE.Quaternion();
  quaternion.setFromEuler(euler);

  const correccionCamara = new THREE.Quaternion();
  correccionCamara.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

  const correccionPantalla = new THREE.Quaternion();
  correccionPantalla.setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    -orientacionRad,
  );

  quaternion.multiply(correccionCamara);
  quaternion.multiply(correccionPantalla);

  camera.quaternion.copy(quaternion);
}

function aplicarVistaVR() {
  if (vistaSeleccionada === "cardboard1") {
    camera.fov = 65;
  } else if (vistaSeleccionada === "cardboard2") {
    camera.fov = 80;
  } else {
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

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  leerGamepad();
  movePlayer();

  if (usarGiroscopio) {
    aplicarGiroscopio();
  } else {
    controls.update();
  }

  actualizarMarcadores();
  actualizarTeleport(delta);
  aplicarVistaVR();

  if (modoVR && vistaSeleccionada !== "normal") {
    effect.render(scene, camera);
  } else {
    renderer.render(scene, camera);
  }
});
