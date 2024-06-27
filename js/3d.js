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

function checkObjectsAndCalculateDistance() {
  if (sun && earth) {
    earthToSunDistance = sun.position.distanceTo(earth.position);
    console.log("Distance between Earth and Sun: ", earthToSunDistance);
  }
}
manager.onLoad = function () {
  console.log("Loading complete!");
  document.getElementById("loadingScreen").style.display = "none"; // Hide loading screen when loading complete
  checkObjectsAndCalculateDistance();
  planetMeshes.push(earth, sun, moon);
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

const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// const hemisphereLight = new THREE.HemisphereLight(0x8812ff, 0x881288, 4);
// hemisphereLight.position.set(0, 10, 0);
// scene.add(hemisphereLight);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows

const loader = new GLTFLoader(manager);
const textureLoader = new THREE.TextureLoader(manager);

// earth
let earth = null;
let earthClouds = null;

let earthToSunDistance = 7;
const earthOrbitSpeed = 0.00005;
let earthOrbitAngle = 0;

loader.load(
  "/models/earth/scene.gltf",
  function (gltf) {
    earth = gltf.scene;
    earth.traverse(function (object) {
      if (object.name.includes("9")) earthClouds = object;
    });
    earth.position.set(35, 0, 0);
    scene.add(earth);
    checkObjectsAndCalculateDistance(); // Check and calculate when earth is added.
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
    shininess: 0.1,
  })
);
moon.name = "Moon";
moon.position.set(moonOrbitRadius, 0, 0);

scene.add(moon);

// sun
function emissiveUpdate() {
  const distance = camera.position.distanceTo(sun.position);
  const maxDistance = moonOrbitRadius * 11;
  let intensityFactor = distance / maxDistance + 0.3;
  intensityFactor = Math.pow(intensityFactor, 2);
  intensityFactor = Math.min(1, intensityFactor);
  sunMaterial.emissiveIntensity = intensityFactor;
}

const sunTexture = textureLoader.load("/img/SunTexture.jpg");
let sunMaterial = new THREE.MeshPhongMaterial({
  map: sunTexture,
  emissive: 0xffffff,
  emissiveIntensity: 1,
  shininess: 1,
  lightMap: sunTexture,
});

const lightStrength = 0.8;

const sunLight1 = new THREE.PointLight(0xffffff, lightStrength, 100000, 0);
const sunLight2 = new THREE.PointLight(0xffffff, lightStrength, 100000, 0);
const sunLight3 = new THREE.PointLight(0xffffff, lightStrength, 100000, 0);
const sunLight4 = new THREE.PointLight(0xffffff, lightStrength, 100000, 0);
const sunLight5 = new THREE.PointLight(0xffffff, lightStrength, 100000, 0);
const sunLight6 = new THREE.PointLight(0xffffff, lightStrength, 100000, 0);
const sun = new THREE.Mesh(new THREE.SphereGeometry(2), sunMaterial);
sun.name = "Sun";
sun.position.set(0, 0, 0);
sun.castShadow = true;

sunLight1.position.set(5, 0, 0);
sunLight2.position.set(-5, 0, 0);
sunLight3.position.set(0, 5, 0);
sunLight4.position.set(0, -5, 0);
sunLight5.position.set(0, 0, 5);
sunLight6.position.set(0, 0, -5);

scene.add(
  sun,
  sunLight1,
  sunLight2,
  sunLight3,
  sunLight4,
  sunLight5,
  sunLight6
);

// the rest of the planets

let planetMeshes = [];
const planets = [
  {
    name: "Mercury",
    texture: "/img/mercury.jpg",
    size: 0.25,
    distance: 7,
    speed: -1.2 * 10e-4,
    rotationSpeed: 0.00612216,
  },
  {
    name: "Venus",
    texture: "/img/venus.jpg",
    size: 0.87,
    distance: 18,
    speed: 4 * 10e-6,
    rotationSpeed: 0.0016,
  },
  {
    name: "Mars",
    texture: "/img/mars.jpg",
    size: 0.47,
    distance: 28,
    speed: 6 * 10e-5,
    rotationSpeed: 0.0026,
  },
  {
    name: "Jupiter",
    texture: "/img/jupiter.jpg",
    size: 1.2,
    distance: 55,
    speed: -11 * 10e-6,
    rotationSpeed: 3 * 10e-3,
  },
  {
    name: "Saturn",
    texture: "/img/saturn.jpg",
    size: 1.1,
    distance: 85,
    speed: 2 * 10e-6,
    rotationSpeed: 0.0002,
  },
  {
    name: "Uranus",
    texture: "/img/uranus.jpg",
    size: 0.9,
    distance: 126,
    speed: 10e-6,
    rotationSpeed: 0.006,
  },
  {
    name: "Neptune",
    texture: "/img/neptune.jpg",
    size: 0.8,
    distance: 157,
    speed: -1.3 * 10e-5,
    rotationSpeed: 0.00098,
  },
];

planets.forEach((planet) => {
  const planetTexture = textureLoader.load(planet.texture);
  const planetMesh = new THREE.Mesh(
    new THREE.SphereGeometry(planet.size),
    new THREE.MeshPhongMaterial({ map: planetTexture })
  );
  planetMesh.name = planet.name;
  planetMesh.position.set(planet.distance, 0, 0);

  planetMeshes.push(planetMesh);
  scene.add(planetMesh);

  // Set orbital parameters
  const planetOrbitRadius = planetMesh.position.distanceTo(sun.position);
  const planetOrbitSpeed = planet.speed;
  let planetOrbitAngle = 0;

  // Attach orbital parameters to the planet's mesh object
  planetMesh.userData = {
    orbitRadius: planetOrbitRadius,
    orbitSpeed: planetOrbitSpeed,
    orbitAngle: planetOrbitAngle,
    rotationSpeed: planet.rotationSpeed,
  };
});

// Function to update planets' positions in the animation loop
function updatePlanets() {
  planets.forEach((planet, index) => {
    const planetMesh = scene.children.find((obj) => obj.name === planet.name);
    if (planetMesh) {
      // Update orbit angle
      planetMesh.userData.orbitAngle += planetMesh.userData.orbitSpeed;

      // new position
      planetMesh.position.x =
        sun.position.x +
        planetMesh.userData.orbitRadius *
          Math.cos(planetMesh.userData.orbitAngle);
      planetMesh.position.z =
        sun.position.z +
        planetMesh.userData.orbitRadius *
          Math.sin(planetMesh.userData.orbitAngle);

      planetMesh.rotateOnAxis(
        new THREE.Vector3(0, 1, 0),
        planetMesh.userData.rotationSpeed
      );
    }
  });
}

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

let earthCoords = { latitude: 0, longitude: 0 };

// VARIABLES

// EVENT

window.addEventListener(
  "click",
  function (event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(
      planetMeshes.filter((obj) => obj !== null),
      true
    );

    if (intersects.length > 0 && targetObject != intersects[0].object) {
      let intersectionPoint = intersects[0].point;
      let direction = intersectionPoint
        .clone()
        .sub(camera.position)
        .normalize();
      targetObject = intersects[0].object;

      let radius = targetObject.geometry.boundingSphere.radius;
      targetZoomPosition = intersectionPoint.sub(
        direction.multiplyScalar(radius + 1)
      ); // Move back by radius + 1 unit from the intersection point

      isZooming = true;
      switchCardText(targetObject);
      heroCard.classList.add("active-card");

      // Specific handling for Earth and Moon based on their geometry
      if (targetObject) {
        let radius = targetObject.geometry.boundingSphere.radius;
        targetZoomPosition = intersectionPoint.add(
          direction.multiplyScalar(radius + 1)
        ); // Adjust slightly out from the surface
        let normalizedY = intersectionPoint.y / radius;
        normalizedY = Math.max(-1, Math.min(1, normalizedY)); // Ensure it stays within [-1, 1]

        let latitude = 90 - (Math.acos(normalizedY) * 180) / Math.PI; // φ
        let longitude =
          (Math.atan2(intersectionPoint.z, intersectionPoint.x) * 180) /
          Math.PI; // λ
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
  0.235,
  0.2,
  0.2
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
  if (earth) {
    earthClouds.rotateOnAxis(new THREE.Vector3(0, 1), 0.001);
    earth.rotateOnAxis(new THREE.Vector3(0, -1), 0.0005);

    // EARTH ORBIT
    earthOrbitAngle += earthOrbitSpeed;
    earth.position.x =
      earthToSunDistance * Math.cos(earthOrbitAngle) + sun.position.x;
    earth.position.z =
      earthToSunDistance * Math.sin(earthOrbitAngle) + sun.position.z;

    // MOON ORBIT
    moonOrbitAngle += moonOrbitSpeed;
    moon.position.x =
      earth.position.x + moonOrbitRadius * Math.cos(moonOrbitAngle);
    moon.position.z =
      earth.position.z + moonOrbitRadius * Math.sin(moonOrbitAngle);
  }
  if (moon) {
    moon.rotateOnAxis(new THREE.Vector3(0.7, 0.25, -1), 0.0026);
  }
  if (sun) {
    sun.rotateOnAxis(new THREE.Vector3(0, 1, 0), 0.005);
  }

  // PLANET ORBIT
  updatePlanets();

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

  // SUN EMISSIVITY
  emissiveUpdate();

  composer.render();
}

animate();
