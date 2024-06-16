import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";

// ** SETUP ** \\

const hero = document.getElementById("hero");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
hero.appendChild(renderer.domElement); // set max width & height

camera.position.z = 5;

window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  bokehPass.width = window.innerWidth;
  bokehPass.height = window.innerHeight;
}

const manager = new THREE.LoadingManager();

manager.onStart = function (url, itemsLoaded, itemsTotal) {
  console.log(
    "Started loading file: " +
      url +
      ".\nLoaded " +
      itemsLoaded +
      " of " +
      itemsTotal +
      " files."
  );
};

manager.onLoad = function () {
  console.log("Loading complete!");
  document.getElementById("loadingScreen").style.display = "none"; // Hide loading screen when loading complete
};

manager.onProgress = function (url, itemsLoaded, itemsTotal) {
  console.log(
    "Loading file: " +
      url +
      ".\nLoaded " +
      itemsLoaded +
      " of " +
      itemsTotal +
      " files."
  );
  let progress = (itemsLoaded / itemsTotal) * 100;
  document.getElementById("loader").style.width = progress * 0.1 + "%"; // Update loading bar width
};

manager.onError = function (url) {
  console.log("There was an error loading " + url);
};

// ** LIGHTING ** \\

const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0x8812ff, 0x881288, 4);
hemisphereLight.position.set(0, 10, 0);
scene.add(hemisphereLight);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows

const loader = new GLTFLoader(manager);
const textureLoader = new THREE.TextureLoader(manager);

// earth
let earth = null;
let earthClouds = null;

loader.load(
  "/models/earth/scene.gltf",
  function (gltf) {
    earth = gltf.scene;
    earth.traverse(function (object) {
      if (object.name.includes("9")) earthClouds = object;
    });
    scene.add(earth);
  },
  function (xhr) {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  },
  function (error) {
    console.log("An error happened: ", error);
  }
);

// moon
const moonOrbitRadius = 6;
const moonOrbitSpeed = moonOrbitRadius * 10e-5;
let moonOrbitAngle = 0;

const moonTexture = textureLoader.load("/img/MoonTexture.jpg");

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.2),
  new THREE.MeshPhongMaterial({
    map: moonTexture,
    shininess: 0.5,
  })
);
moon.name = "Moon";
moon.position.set(moonOrbitRadius, 0, 0);

scene.add(moon);

// sun
const sunPosition = new THREE.Vector3(moonOrbitRadius * 11, 0, 0);

function emissiveUpdate() {
  const distance = camera.position.distanceTo(sunPosition);
  const maxDistance = moonOrbitRadius * 11;
  let intensityFactor = distance / maxDistance + 0.4;
  intensityFactor = Math.min(1, intensityFactor);
  sunMaterial.emissiveIntensity = intensityFactor;
}

const sunTexture = textureLoader.load("/img/SunTexture.jpg");
let sunMaterial = new THREE.MeshPhongMaterial({
  map: sunTexture,
  emissive: 0xffff55,
  emissiveIntensity: 0.8,
  shininess: 0.6,
});

const sun = new THREE.Mesh(new THREE.SphereGeometry(2), sunMaterial);
sun.name = "Sun";
sun.position.set(moonOrbitRadius * 11, 0, 0);
sun.castShadow = true;

scene.add(sun);

// stars
function createStars(count, size) {
  const stars = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    let x = Math.random() - 0.5;
    let y = Math.random() - 0.5;
    let z = Math.random() - 0.5;
    let length = Math.sqrt(x * x + y * y + z * z);
    x /= length;
    y /= length;
    z /= length;

    const distance = 150 + Math.random() * 1900;
    x *= distance;
    y *= distance;
    z *= distance;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  stars.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: size,
    sizeAttenuation: true,
  });

  const starField = new THREE.Points(stars, material);
  return starField;
}

const stars = createStars(5000, 1.5);
scene.add(stars);

// RAYCASTING & SPECIAL FX \\

let heroCard = document.getElementById("hero-card");
let heroCardH = document.getElementById("planet-title");
let heroCardP = document.getElementById("planet-description");

let isZooming = false; // flag
let zoomSpeed = 0.05; // Control the speed of the zoom

let targetZoomPosition = null; // can be modded
let targetObject = null;
let zoomTarget = new THREE.Vector3();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function switchCardText(currentPlanet) {
  switch (currentPlanet.name) {
    case "Object_9":
      heroCardH.textContent = "Earth";
      heroCardP.textContent = "Lorem ipsum dolor sit amet consectetur it";
      break;
    case moon.name:
      heroCardH.textContent = "Moon";
      heroCardP.textContent = "Lorem ipsum dolor sit amet consectetur it";
      break;
    case sun.name:
      heroCardH.textContent = "Sun";
      heroCardP.textContent = "Lorem ipsum dolor sit amet consectetur it";
      break;
    default:
      heroCardH.textContent = "Lorem ipsum";
      heroCardP.textContent = "Lorem ipsum dolor sit amet consectetur it";
      break;
  }
}

let earthCoords = {latitude: 0, longitude: 0};

window.addEventListener(
  "click",
  function (event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(
      [earth, moon, sun].filter(obj => obj !== null),
      true
    );

    if (intersects.length > 0 && targetObject != intersects[0].object) {
      let intersectionPoint = intersects[0].point;
      let direction = intersectionPoint.clone().sub(camera.position).normalize();
      targetObject = intersects[0].object;

      let radius = targetObject.geometry.boundingSphere.radius;
      targetZoomPosition = intersectionPoint.sub(direction.multiplyScalar(radius + 1)); // Move back by radius + 1 unit from the intersection point

      isZooming = true;
      switchCardText(targetObject);
      heroCard.classList.add("active-card");

      if (targetObject.name === "Object_9") {
        let normalizedY = intersectionPoint.y / radius;
        normalizedY = Math.max(-1, Math.min(1, normalizedY)); // Ensure it stays within [-1, 1]

        let latitude = 90 - (Math.acos(normalizedY) * 180 / Math.PI);  // φ
        let longitude = (Math.atan2(intersectionPoint.z, intersectionPoint.x) * 180 / Math.PI); // λ
        console.log("Latitude:", latitude, "Longitude:", longitude);
      }
      console.log("Intersection Point:", intersectionPoint);

    } else if (intersects.length == 0 && targetObject != null) {
      targetObject = null;
      isZooming = false;
      heroCard.classList.remove("active-card");
    }
  },
  false
);


// fx
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.25,
  1,
  0.76
);
composer.addPass(bloomPass);

const bokehPass = new BokehPass(scene, camera, {
  focus: 1.0,
  aperture: 0.0005,
  maxblur: 0.01,
  width: window.innerWidth,
  height: window.innerHeight,
});
composer.addPass(bokehPass);

// ANIMATE \\

function animate() {
  requestAnimationFrame(animate);

  // ORBIT CONTROLS
  controls.update();

  // ROTATIONS
  if (earthClouds) {
    earthClouds.rotateOnAxis(new THREE.Vector3(0, 1), 0.001);
    earth.rotateOnAxis(new THREE.Vector3(0, -1), 0.0005);
  }
  if (moon) {
    moon.rotateOnAxis(new THREE.Vector3(0.7, 0.25, -1), 0.0026);
  }
  if (sun) {
    sun.rotateOnAxis(new THREE.Vector3(0, 1, 0), 0.005);
  }

  // MOON ORBIT
  moonOrbitAngle += moonOrbitSpeed;
  moon.position.x = moonOrbitRadius * Math.cos(moonOrbitAngle);
  moon.position.z = moonOrbitRadius * Math.sin(moonOrbitAngle);

  // ZOOMS
  if (isZooming) {
    if (targetObject) {
      let objectPosition = new THREE.Vector3();
      targetObject.getWorldPosition(objectPosition);
      let direction = objectPosition.clone().sub(camera.position).normalize();
      zoomTarget.copy(objectPosition).sub(direction);

      camera.position.lerp(zoomTarget, zoomSpeed);
      controls.target.lerp(objectPosition, 0.1);
    }
    if (
      camera.position.distanceTo(zoomTarget) <
      1.6 ** targetObject.geometry.boundingSphere.radius
    ) {
      isZooming = false;
    }
    controls.update();
  } else if (targetObject) {
    let objectPosition = new THREE.Vector3();
    targetObject.getWorldPosition(objectPosition);
    controls.target.lerp(objectPosition, 0.1);
    controls.update();
  }

  if (targetObject) {
    controls.target.lerp(targetObject.position, 0.1);
  }

  // SUN EMISSIVITY
  emissiveUpdate();

  composer.render();
}

animate();
