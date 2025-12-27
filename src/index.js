import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { GUI } from "lil-gui";
import { MeshTransmissionMaterial, MeshDiscardMaterial } from "@pmndrs/vanilla";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";

const rgbeLoader = new RGBELoader();
const gltfLoader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
gltfLoader.setDRACOLoader(draco);

const gui = new GUI();

let meshTransmissionMaterialUpdate = () => {};

const params = {
  transparentBG: true,
  bgColor: new THREE.Color(),
};

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// const camera = new THREE.PerspectiveCamera(
//   45,
//   window.innerWidth / window.innerHeight
// );
let camera = new THREE.OrthographicCamera(
  window.innerWidth / -2, // left
  window.innerWidth / 2, // right
  window.innerHeight / 2, // top
  window.innerHeight / -2, // bottom
  -1000, // near plane
  1000 // far plane
);
camera.position.set(-5, 5, 5);

const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;

const scene = new THREE.Scene();
const light = new THREE.DirectionalLight("#ffffff", 1);
light.castShadow = true;
light.position.y = 15;

scene.add(light);
const helper = new THREE.DirectionalLightHelper(light);
scene.add(helper);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ roughness: 0.5, color: "red" })
);
floor.receiveShadow = true;
scene.add(floor);

const clock = new THREE.Clock();
const radius = 10;

// request animation frame
renderer.setAnimationLoop(() => {
  const time = clock.getElapsedTime();
  const x = radius * Math.sin(time);
  const z = radius * Math.cos(time);

  // Update the object's position
  // light.position.set(x, 5, z);
  helper.update();
  meshTransmissionMaterialUpdate();
  controls.update();
  renderer.render(scene, camera);
});

gui.add(params, "transparentBG").onChange((v) => {
  console.log(scene.background, scene.environment);
  scene.background = v ? null : new THREE.Color(255, 255, 255);
  scene.environment = new THREE.Color();
});
gui.addColor(params, "bgColor");

async function setupEnv() {
  const tex = await rgbeLoader.loadAsync("./assets/transparent.hdr");
  tex.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = tex;
  scene.environment = tex;
  // scene.background = new THREE.Color(255, 255, 255);
  // scene.environment = tex;
}

async function setupMeshTransmissionMaterial() {
  const mtmParams = {
    customBackground: scene.background,
    backside: false,
    thickness: 2,
    backsideThickness: 0.5,
  };

  const gltf = await gltfLoader.loadAsync("./public/glassBottle4.glb");
  const model = gltf.scene;
  const mixer = new THREE.AnimationMixer(model);
  const clips = gltf.animations;
  console.log(clips);
  if (clips.length > 0) {
    const action = mixer.clipAction(clips[0]);
    action.play();
  }

  model.position.y = 0.9;
  const discardMaterial = new MeshDiscardMaterial();
  const meshTransmissionMaterial = new MeshTransmissionMaterial({
    anisotropy: 0.5,
  });

  const meshes = [];
  model.traverse((child) => {
    if (child.isMesh) {
      console.log(child.name);
      child.castShadow = true;
      child.receiveShadow = true;
      child.selectOnRaycast = model;

      if (child.name === "Circle") {
        child.material = meshTransmissionMaterial;
        meshes.push(child);
        gui.add(child, "visible").name("Glass visible");
      }
      if (child.name === "liquid") {
        child.material.color.set("#0000ff");
        child.scale.setScalar(15); //default is 20
        gui
          .add(child.scale, "x", 1, 20)
          .name("Liquid scale")
          .onChange((v) => {
            child.scale.setScalar(v); // set same value for x y and z
          });
      }
    }
  });
  scene.add(model);

  meshTransmissionMaterial.reflectivity = 0.04;

  addTransmissionGui(gui, meshTransmissionMaterial, mtmParams);

  const fboBack = new THREE.WebGLRenderTarget(256, 256, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    colorSpace: renderer.outputColorSpace,
    type: THREE.HalfFloatType,
  });
  const fboMain = new THREE.WebGLRenderTarget(256, 256, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    colorSpace: renderer.outputColorSpace,
    type: THREE.HalfFloatType,
  });

  const mtm = meshTransmissionMaterial;
  mtm.buffer = fboMain.texture;
  let oldBg;
  let oldTone;
  let oldSide;
  const state = {
    gl: renderer,
    scene,
    camera,
  };

  const clock = new THREE.Clock(true);

  // run on every frame
  meshTransmissionMaterialUpdate = () => {
    mtm.time = clock.getElapsedTime();
    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();
    if (mixer) {
      mixer.update(delta);
      console.log(delta);
    }
    for (const mesh of meshes) {
      const parent = mesh;

      if (mtm.buffer === fboMain.texture) {
        // Save defaults
        oldTone = state.gl.toneMapping;
        oldBg = state.scene.background;
        oldSide = parent.material.side;

        // Switch off tonemapping lest it double tone maps
        // Save the current background and set the HDR as the new BG
        // Use discardMaterial, the parent will be invisible, but it's shadows will still be cast
        state.gl.toneMapping = THREE.NoToneMapping;
        if (mtmParams.customBackground)
          state.scene.customBackground = mtmParams.background;
        parent.material = discardMaterial;

        if (mtmParams.backside) {
          // Render into the backside buffer
          state.gl.setRenderTarget(fboBack);
          state.gl.render(state.scene, state.camera);
          // And now prepare the material for the main render using the backside buffer
          parent.material = mtm;
          parent.material.buffer = fboBack.texture;
          parent.material.thickness = mtmParams.backsideThickness;
          parent.material.side = THREE.BackSide;
        }

        // Render into the main buffer
        state.gl.setRenderTarget(fboMain);
        state.gl.render(state.scene, state.camera);

        parent.material = mtm;
        parent.material.thickness = mtmParams.thickness;
        parent.material.side = oldSide;
        parent.material.buffer = fboMain.texture;

        // Set old state back
        state.scene.background = oldBg;
        state.gl.setRenderTarget(null);
        parent.material = mtm;
        state.gl.toneMapping = oldTone;
      }
    }
  };
}

function addTransmissionGui(gui, mat, mtmParams) {
  const fol = gui.addFolder("Transmission Material");
  fol.open();
  fol.add(mtmParams, "backside");
  fol.add(mtmParams, "thickness", 0, 2);
  fol.add(mtmParams, "backsideThickness", 0, 2);

  fol.addColor(mat, "color");

  fol.add(mat, "roughness", 0, 1);
  fol.add(mat, "chromaticAberration", 0, 2);
  fol.add(mat, "distortion", 0, 10);
  fol.add(mat, "temporalDistortion", 0, 1);
  fol.add(mat, "anisotropicBlur", 0, 10);
  fol.add(mat, "reflectivity", 0, 1);

  fol.addColor(mat, "attenuationColor");
  fol.add(mat, "attenuationDistance", 0, 2);
}

setupEnv();
setupMeshTransmissionMaterial();

console.log(scene.background, scene.environment);
