import Lenis from "lenis";
import { gsap } from "gsap";
import Stats from "three/examples/jsm/libs/stats.module.js";

import { ScrollTrigger } from "gsap/ScrollTrigger";
// ScrollSmoother requires ScrollTrigger
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
gsap.registerPlugin(ScrollTrigger, ScrollSmoother, ScrollToPlugin);
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { GUI } from "lil-gui";
import { MeshTransmissionMaterial, MeshDiscardMaterial } from "@pmndrs/vanilla";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import { SimplexNoise } from "three-stdlib";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer"
import Splide from "@splidejs/splide";

import Mountains from "../assets/glasshex.jpg"
import transparent from "../public/transparent.hdr"
import glassBottle from "../public/finalbottle1.glb"


const imageAspect = 1.7775510
const modelAspect = 0.01
const stats = new Stats();
// 0: fps (frames per second), 1: ms (milliseconds per frame), 2: mb (memory)
stats.showPanel(0);
document.body.appendChild(stats.dom)


const lenis = new Lenis();

// Synchronize Lenis scrolling with GSAP's ScrollTrigger plugin
lenis.on('scroll', ScrollTrigger.update);

// Add Lenis's requestAnimationFrame (raf) method to GSAP's ticker
// This ensures Lenis's smooth scroll animation updates on each GSAP tick
gsap.ticker.add((time) => {
  lenis.raf(time * 1000); // Convert time from seconds to milliseconds
});

// Disable lag smoothing in GSAP to prevent any delay in scroll animations
gsap.ticker.lagSmoothing(0);




const rgbeLoader = new RGBELoader();
const gltfLoader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
gltfLoader.setDRACOLoader(draco);

// const gui = new GUI();

let meshTransmissionMaterialUpdate = () => { };
let resize = () => { }

let canvas = document.querySelector("canvas")
const renderer = new THREE.WebGLRenderer({ alpha: true, canvas });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);


let camera = new THREE.OrthographicCamera(
  window.innerWidth / -60, // left
  window.innerWidth / 60, // right
  window.innerHeight / 60, // top
  window.innerHeight / -60, // bottom
  -1000, // near plane
  1000 // far plane
);
camera.position.set(0, 0, 10);

const scene = new THREE.Scene();
const clock = new THREE.Clock();


const amlight = new THREE.AmbientLight(0xFFFFFF, 3)
amlight.position.set(0, -12, 0)
scene.add(amlight)
let addDirLights = (x, y, z, target, intensity) => {
  const light = new THREE.DirectionalLight("#ffffff", intensity);
  light.castShadow = true;
  light.position.set(x, y, z)
  light.target = target
  scene.add(light);
  // const helper = new THREE.DirectionalLightHelper(light);
  // scene.add(helper)
}



// request animation frame


async function setupEnv() {
  const tex = await rgbeLoader.loadAsync(transparent);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = tex;
  scene.environment = tex;
}

global.mixer = null
global.pivotModel = new THREE.Group();
global.firstScreen = true
addDirLights(0, 10, 0, global.pivotModel, 2)
addDirLights(-20, 10, 0, global.pivotModel, 2)
addDirLights(20, 10, 0, global.pivotModel, 2)




async function setupMeshTransmissionMaterial() {
  const mtmParams = {
    customBackground: scene.background,
    backside: false,
    thickness: 2,
    backsideThickness: 0.5,
  };

  const gltf = await gltfLoader.loadAsync(glassBottle);
  const model = gltf.scene;
  global.mixer = new THREE.AnimationMixer(model);
  const clips = gltf.animations;
  if (clips.length > 0) {
    const action = global.mixer.clipAction(clips[0]);
    action.play();
  }


  model.scale.set(1.4, 1.4, 1.4)
  model.position.set(0, -12, 0)


  // const axis = new THREE.Vector3(-1, 0, 0); // Y-axis
  // const angle = Math.PI / 4; // 90 degrees in radians
  // const quaternion = new THREE.Quaternion();
  // quaternion.setFromAxisAngle(axis.normalize(), angle);

  // model.quaternion.copy(quaternion)


  // addDirLights(20, 15, 5, model, 2)
  // addDirLights(0, 10, 0, model, 2)
  // addDirLights(0, 10, 10, model, 5)





  const discardMaterial = new MeshDiscardMaterial();

  const meshTransmissionMaterial = new MeshTransmissionMaterial({
    anisotropy: 0.5,

  });

  meshTransmissionMaterial.reflectivity = 0.0;
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
        // gui.add(child, "visible").name("Glass visible");
        // child.position.set(12, -11, 0)

      }
      if (child.name === "Cylinder") {

        child.material = meshTransmissionMaterial;
        meshes.push(child);
        // gui.add(child, "visible").name("Glass visible");
      }
      if (child.name === "liquid") {
        child.material.color.set("#0000ff");
        child.scale.setScalar(15); //default is 20
        // gui
        //   .add(child.scale, "x", 1, 20)
        //   .name("Liquid scale")
        //   .onChange((v) => {
        //     child.scale.setScalar(v); // set same value for x y and z
        //   });
      }
    }
  });

  global.pivotModel.add(model)
  global.pivotModel.scale.set(0, 0, 0)
  scene.add(global.pivotModel)

  // global.pivotModel.rotation.z += Math.PI/4
  // global.pivotModel.rotation.x += -2*(Math.PI/6)



  // addTransmissionGui(gui, meshTransmissionMaterial, mtmParams);

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
  resize = () => {
    let scale = [100/window.innerWidth, 100/window.innerHeight]
    // if (modelAspect > aspectRatio) {
    //   scale = [modelAspect / aspectRatio, 1]
    // }
    // else {
    //   scale = [modelAspect / aspectRatio, 1]
    // }

    // global.pivotModel.matrixAutoUpdate = true
    // global.pivotModel.updateMatrix()
    global.pivotModel.scale.set(scale[0], scale[1])
    console.log(scale, global.pivotModel.scale)

    // gsap.to(global.pivotModel.scale, {
    //   x: scale[0],
    //   y: scale[1],
    //   duration: 0.01,
    // })
    // global.pivotModel.scale.set(scale[0] + 2, scale[1] + 2, 1)
    // global.pivotModel.updateMatrix()

  }
  // run on every frame
  meshTransmissionMaterialUpdate = (elapsed, delta) => {
    mtm.time = elapsed
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

const loadTexture = async (url) => {
  let textureLoader = new THREE.TextureLoader()
  return new Promise(resolve => {
    textureLoader.load(url, texture => {
      resolve(texture)
    })
  })
}


function createColorTexture(color) {
  // Define the color in RGBA format (0-255 range)
  const colorInt = new THREE.Color(color);
  const r = Math.floor(colorInt.r * 255);
  const g = Math.floor(colorInt.g * 255);
  const b = Math.floor(colorInt.b * 255);
  const a = 255; // Fully opaque

  // Create a Uint8Array for a 1x1 pixel
  const data = new Uint8Array([r, g, b, a]);

  // Create the DataTexture
  const texture = new THREE.DataTexture(
    data,
    1, // width
    1, // height
    THREE.RGBAFormat,
    THREE.UnsignedByteType
  );

  texture.needsUpdate = true; // Important to mark as updated

  return texture;
}



const params = {
  // general scene params
  mouseSize: 0.5,
  viscosity: 0.97,
  waveHeight: 0.04
}

// Texture width for simulation
const FBO_WIDTH = 512
const FBO_HEIGHT = 256
// Water size in system units
let GEOM_WIDTH = window.innerWidth / 30
let GEOM_HEIGHT = window.innerHeight / 30

const simplex = new SimplexNoise()
let app = {
  async initScene() {

    const color = new THREE.Color(0x000000);
    const width = 1;
    const height = 1;

    // Create an array of pixel data (R, G, B, A values from 0 to 255)
    const data = new Uint8Array(width * height * 4);
    data[0] = Math.floor(color.r * 255); // Red
    data[1] = Math.floor(color.g * 255); // Green
    data[2] = Math.floor(color.b * 255); // Blue
    data[3] = 255; // Alpha (fully opaque)

    // Create the DataTexture
    this.colorTexture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    this.colorTexture.needsUpdate = true;


    // let Texture = colorTexture
    let Texture = await loadTexture(Mountains)
    // assigning image textures with SRGBColorSpace is essential in getting the rendered colors correct
    Texture.colorSpace = THREE.SRGBColorSpace


    this.container = renderer.domElement

    this.mouseMoved = false
    this.mouseCoords = new THREE.Vector2()
    this.raycaster = new THREE.Raycaster()



    // this.container.style.touchAction = 'none'
    document.body.addEventListener('pointermove', this.onPointerMove.bind(this))

    const sun = new THREE.DirectionalLight(0xFFFFFF, 0.6)
    sun.position.set(300, 400, 175)
    scene.add(sun)

    const sun2 = new THREE.DirectionalLight(0xFFFFFF, 0.6)
    sun2.position.set(- 100, 350, - 200)
    scene.add(sun2)

    const materialColor = 0xFFFFFF

    const geometry = new THREE.PlaneGeometry(GEOM_WIDTH, GEOM_HEIGHT, FBO_WIDTH, FBO_HEIGHT)

    const waterVertex = `
            uniform sampler2D heightmap;

#define PHONG

varying vec3 vViewPosition;

#ifndef FLAT_SHADED

    varying vec3 vNormal;

#endif

#include <common>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying float heightValue;

void main() {

    vec2 cellSize = vec2( 1.0 / (FBO_WIDTH), 1.0 / FBO_HEIGHT );

    #include <uv_vertex>
    #include <color_vertex>

    // # include <beginnormal_vertex>
    // Compute normal from heightmap
    vec3 objectNormal = vec3(
        ( texture2D( heightmap, uv + vec2( - cellSize.x, 0 ) ).x - texture2D( heightmap, uv + vec2( cellSize.x, 0 ) ).x ) * FBO_WIDTH / GEOM_WIDTH,
        ( texture2D( heightmap, uv + vec2( 0, - cellSize.y ) ).x - texture2D( heightmap, uv + vec2( 0, cellSize.y ) ).x ) * FBO_HEIGHT / GEOM_HEIGHT,
        1.0 );
    //<beginnormal_vertex>

    #include <morphnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>

#ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED

    vNormal = normalize( transformedNormal );

#endif

    //# include <begin_vertex>
    heightValue = texture2D( heightmap, uv ).x;
    vec3 transformed = vec3( position.x, position.y, heightValue );
    //<begin_vertex>

    #include <morphtarget_vertex>
    #include <skinning_vertex>
    #include <displacementmap_vertex>
    #include <project_vertex>
    #include <logdepthbuf_vertex>
    #include <clipping_planes_vertex>

    vViewPosition = - mvPosition.xyz;

    #include <worldpos_vertex>
    #include <envmap_vertex>
    #include <shadowmap_vertex>

}
        `

    const waterFragment = `
        #define PHONG

uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;

#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() {

	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>

	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;

	#include <logdepthbuf_fragment>
	
    // IMPORTANT: we're only changing the #include <map_fragment> part out of the whole phong fragment
    #ifdef USE_MAP

        vec3 vnormal = normalize( vNormal );
        // adding normal.xy to the map uv is to add the rippling effect to the image as well
        // if this isn't done, the image itself wouldn't be rippled upon,
        // and you'd only see the waves' shades added upon the unmoved image
        vec4 sampledDiffuseColor = texture2D( map, vMapUv + vnormal.xy );

        #ifdef DECODE_VIDEO_TEXTURE

            // use inline sRGB decode until browsers properly support SRGB8_APLHA8 with video textures

            sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
        
        #endif

        diffuseColor *= sampledDiffuseColor;

    #endif

	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>

	// accumulation
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>

	// modulation
	#include <aomap_fragment>

	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>

}
        `

    // material: make a THREE.ShaderMaterial clone of THREE.MeshPhongMaterial, with customized vertex shader
    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.ShaderLib['phong'].uniforms,
        {
          'heightmap': { value: null },
        }
      ]),
      vertexShader: waterVertex,
      fragmentShader: waterFragment,
    });

    this.material.lights = true

    // Material attributes from THREE.MeshPhongMaterial
    // for the color map to work, we need all 3 lines (define material.color, material.map and material.uniforms[ 'map' ].value)
    this.material.color = new THREE.Color(materialColor)
    this.material.specular = new THREE.Color(0x111111)
    this.material.shininess = 100
    this.material.map = Texture

    // Sets the uniforms with the material values
    this.material.uniforms['diffuse'].value = this.material.color
    this.material.uniforms['specular'].value = this.material.specular
    this.material.uniforms['shininess'].value = Math.max(this.material.shininess, 1e-4)
    this.material.uniforms['opacity'].value = this.material.opacity
    this.material.uniforms['map'].value = Texture

    // Defines
    this.material.defines.FBO_WIDTH = FBO_WIDTH.toFixed(1)
    this.material.defines.FBO_HEIGHT = FBO_HEIGHT.toFixed(1)
    this.material.defines.GEOM_WIDTH = GEOM_WIDTH.toFixed(1)
    this.material.defines.GEOM_HEIGHT = GEOM_HEIGHT.toFixed(1)

    this.waterUniforms = this.material.uniforms

    this.waterMesh = new THREE.Mesh(geometry, this.material)
    let aspectRatio = window.innerWidth / window.innerHeight
    if (imageAspect > aspectRatio) {
      scale = [imageAspect / aspectRatio, 1]
    }
    else {
      scale = [1, aspectRatio / imageAspect]
    }
    this.waterMesh.scale.set(scale[0], scale[1], 1)
    this.waterMesh.matrixAutoUpdate = false
    this.waterMesh.position.set(0, 0, -5)
    // this.waterMesh.scale.set(2,2,1)

    this.waterMesh.updateMatrix()

    scene.add(this.waterMesh)
    // addDirLights(0,0,-1, this.waterMesh, 2)

    // Creates the gpu computation class and sets it up
    this.gpuCompute = new GPUComputationRenderer(FBO_WIDTH, FBO_HEIGHT, renderer)

    if (renderer.capabilities.isWebGL2 === false) {
      this.gpuCompute.setDataType(THREE.HalfFloatType)
    }

    const heightmap0 = this.gpuCompute.createTexture()

    this.fillTexture(heightmap0)

    const heightMapShader = `
            #define PI 3.1415926538

uniform vec2 mousePos;
uniform float mouseSize;
uniform float viscosityConstant;
uniform float waveheightMultiplier;

void main()	{
    // The size of the computation (sizeX * sizeY) is defined as 'resolution' automatically in the shader.
    // sizeX and sizeY are passed as params when you make a new GPUComputationRenderer instance.
    vec2 cellSize = 1.0 / resolution.xy;

    // gl_FragCoord is in pixels (coordinates range from 0.0 to the width/height of the window,
    // note that the window isn't the visible one on your browser here, since the gpgpu renders to its virtual screen
    // thus the uv still is 0..1
    vec2 uv = gl_FragCoord.xy * cellSize;

    // heightmapValue.x == height from previous frame
    // heightmapValue.y == height from penultimate frame
    // heightmapValue.z, heightmapValue.w not used
    vec4 heightmapValue = texture2D( heightmap, uv );

    // Get neighbours
    vec4 north = texture2D( heightmap, uv + vec2( 0.0, cellSize.y ) );
    vec4 south = texture2D( heightmap, uv + vec2( 0.0, - cellSize.y ) );
    vec4 east = texture2D( heightmap, uv + vec2( cellSize.x, 0.0 ) );
    vec4 west = texture2D( heightmap, uv + vec2( - cellSize.x, 0.0 ) );

    // https://web.archive.org/web/20080618181901/http://freespace.virgin.net/hugo.elias/graphics/x_water.htm
    // change in height is proportional to the height of the wave 2 frames older
    // so new height is equaled to the smoothed height plus the change in height
    float newHeight = ( ( north.x + south.x + east.x + west.x ) * 0.5 - heightmapValue.y ) * viscosityConstant;

    // Mouse influence
    float mousePhase = clamp( length( ( uv - vec2( 0.5 ) ) * vec2(GEOM_WIDTH, GEOM_HEIGHT) - vec2( mousePos.x, - mousePos.y ) ) * PI / mouseSize, 0.0, PI );
    newHeight += ( cos( mousePhase ) + 1.0 ) * waveheightMultiplier;

    heightmapValue.y = heightmapValue.x;
    heightmapValue.x = newHeight;

    gl_FragColor = heightmapValue;

}
        `

    this.heightmapVariable = this.gpuCompute.addVariable('heightmap', heightMapShader, heightmap0)

    this.gpuCompute.setVariableDependencies(this.heightmapVariable, [this.heightmapVariable])

    this.heightmapVariable.material.uniforms['mousePos'] = { value: new THREE.Vector2(10000, 10000) }
    this.heightmapVariable.material.uniforms['mouseSize'] = { value: params.mouseSize }
    this.heightmapVariable.material.uniforms['viscosityConstant'] = { value: params.viscosity }
    this.heightmapVariable.material.uniforms['waveheightMultiplier'] = { value: params.waveHeight }
    this.heightmapVariable.material.defines.GEOM_WIDTH = GEOM_WIDTH.toFixed(1)
    this.heightmapVariable.material.defines.GEOM_HEIGHT = GEOM_HEIGHT.toFixed(1)

    const error = this.gpuCompute.init()
    if (error !== null) {
      console.error(error)
    }

    // Create compute shader to smooth the water surface and velocity
    const smoothSh = `
            uniform sampler2D smoothTexture;

void main()	{

    vec2 cellSize = 1.0 / resolution.xy;

    vec2 uv = gl_FragCoord.xy * cellSize;

    // Computes the mean of texel and 4 neighbours
    vec4 textureValue = texture2D( smoothTexture, uv );
    textureValue += texture2D( smoothTexture, uv + vec2( 0.0, cellSize.y ) );
    textureValue += texture2D( smoothTexture, uv + vec2( 0.0, - cellSize.y ) );
    textureValue += texture2D( smoothTexture, uv + vec2( cellSize.x, 0.0 ) );
    textureValue += texture2D( smoothTexture, uv + vec2( - cellSize.x, 0.0 ) );

    textureValue /= 5.0;

    gl_FragColor = textureValue;

}
        `

    this.smoothShader = this.gpuCompute.createShaderMaterial(smoothSh, { smoothTexture: { value: null } })

  },
  resize(scale) {
    this.waterMesh.geometry.dispose()
    this.waterMesh.geometry = new THREE.PlaneGeometry(window.innerWidth / 30, window.innerHeight / 30, FBO_WIDTH, FBO_HEIGHT)
    this.waterMesh.scale.set(scale[0], scale[1], 1)
    this.waterMesh.updateMatrix()
  },
  fillTexture(texture) {
    const waterMaxHeight = 0.009;

    function noise(x, y) {
      let multR = waterMaxHeight;
      let mult = 0.025;
      let r = 0;
      for (let i = 0; i < 15; i++) {
        r += multR * simplex.noise(x * mult, y * mult);
        multR *= 0.53 + 0.025 * i;
        mult *= 1.25;
      }

      return r;
    }

    const pixels = texture.image.data;

    let p = 0;
    for (let j = 0; j < FBO_HEIGHT; j++) {
      for (let i = 0; i < FBO_WIDTH; i++) {
        const x = i * 128 / FBO_WIDTH;
        const y = j * 128 / FBO_HEIGHT;

        pixels[p + 0] = noise(x, y);
        pixels[p + 1] = 0;
        pixels[p + 2] = 0;
        pixels[p + 3] = 1;

        p += 4;
      }
    }
  },
  smoothWater() {
    const currentRenderTarget = this.gpuCompute.getCurrentRenderTarget(this.heightmapVariable)
    const alternateRenderTarget = this.gpuCompute.getAlternateRenderTarget(this.heightmapVariable)

    for (let i = 0; i < 10; i++) {
      this.smoothShader.uniforms['smoothTexture'].value = currentRenderTarget.texture
      this.gpuCompute.doRenderTarget(this.smoothShader, alternateRenderTarget)

      this.smoothShader.uniforms['smoothTexture'].value = alternateRenderTarget.texture
      this.gpuCompute.doRenderTarget(this.smoothShader, currentRenderTarget)
    }
  },
  setMouseCoords(x, y) {
    this.mouseCoords.set((x / renderer.domElement.clientWidth) * 2 - 1, (y / renderer.domElement.clientHeight) * 2 - 1)
    this.mouseMoved = true
  },
  onPointerMove(event) {
    if (event.isPrimary === false) return
    this.setMouseCoords(event.clientX, event.clientY)
  },
  // @param {number} interval - time elapsed between 2 frames
  // @param {number} elapsed - total time elapsed since app start
  updateScene(interval, elapsed) {

    // Set uniforms: mouse interaction

    if (global.firstScreen) {
      gsap.to(global.pivotModel.rotation, {
        z: -this.mouseCoords.x * (Math.PI / 6),
        y: this.mouseCoords.x * (Math.PI / 6),
        x: this.mouseCoords.y * (Math.PI / 8),
        duration: 0,
        ease: "none"
      })
    }
    else {
      // this.material.map = this.colorTexture
      // this.material.uniforms['map'].value = this.colorTexture
    }
    const hmUniforms = this.heightmapVariable.material.uniforms
    if (this.mouseMoved) {

      this.raycaster.setFromCamera(this.mouseCoords, camera)

      const intersects = this.raycaster.intersectObject(this.waterMesh)




      if (intersects.length > 0) {
        const point = intersects[0].point
        hmUniforms['mousePos'].value.set(point.x, point.y)
      } else {
        hmUniforms['mousePos'].value.set(10000, 10000)
      }

      this.mouseMoved = false
    } else {
      hmUniforms['mousePos'].value.set(10000, 10000)
    }

    // Do the gpu computation
    this.gpuCompute.compute()

    // Get compute output in custom uniform
    this.waterUniforms['heightmap'].value = this.gpuCompute.getCurrentRenderTarget(this.heightmapVariable).texture
  }
}


let playAnimations = () => {

  let t1 = gsap.timeline()

  t1.to(global.pivotModel.position, {
    x: 0,
    y: 0,
    z: 0,
    duration: 1,
    ease: "power2.out",
  })
    .fromTo(global.pivotModel.scale, {
      x: 0,
      y: 0,
      z: 0,
      ease: "power2.out",
    }, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1.5,
      ease: "power2.out",
    })
    .to(global.pivotModel.scale,
      {
        z: 1.05,
        y: 1.05,
        x: 1.05,
        duration: 1.5,
        yoyo: true,
        repeat: -1
      })
    .to(global.pivotModel.position, {
      scrollTrigger: {
        trigger: ".section2",
        start: "start bottom",
        end: "center bottom",
        invalidateOnRefresh: true,
        scrub: 1,
        // markers: true,
      },
      x: -20,
      y: 2,
      z: 0,
      duration: 2,
      ease: "power2.out",
      onStart: () => {
        console.log('started')
        global.firstScreen = false
        gsap.to(global.pivotModel.rotation, {
          x: 0,
          z: 0,
          duration: 0.1,
          ease: "power2.out"
        })
      },
      onReverseComplete: () => {
        global.firstScreen = true
      }
    })
    .to(global.pivotModel.rotation, {
      scrollTrigger: {
        trigger: ".section2",
        start: "start bottom",
        end: "center bottom",
        invalidateOnRefresh: true,
        scrub: true,
        // markers: true,
      },
      y: 2 * Math.PI,
      duration: 2,
      ease: "power2.out",
    })
    .fromTo(global.pivotModel.position,
      {
        x: -20,
        y: 2,
        z: 0,
      },
      {
        scrollTrigger: {
          trigger: ".section3",
          invalidateOnRefresh: true,
          scrub: 1,
          // markers: true,

          end: "center bottom",
        },
        x: 20,
        y: 2,
        z: 0,
      },
    )
    .to(global.pivotModel.rotation, {
      scrollTrigger: {
        trigger: ".section3",
        end: "center bottom",
        invalidateOnRefresh: true,
        scrub: true,
        // markers: true,
      },
      y: -4 * Math.PI,
      // duration: 2,
      ease: "power2.out",
    })
    .fromTo(global.pivotModel.position,
      {
        x: 20,
        y: 2,
        z: 0,
      },
      {
        scrollTrigger: {
          trigger: ".section4",
          scrub: 1,
          invalidateOnRefresh: true,
          // markers: true,
          end: "center bottom",
        },
        onStart: () => {
          global.firstScreen = true
          console.log('huhu')
        },
        onReverseComplete: () => {
          global.firstScreen = false
          gsap.to(global.pivotModel.rotation, {
            x: 0,
            z: 0,
            duration: 0.1,
            ease: "power2.out"
          })
        },
        x: 0,
        y: 2,
        z: 0,
      },
    )
  gsap.to(".card1",
    {
      scrollTrigger: {
        trigger: ".card1container",
        scrub: 1,
        invalidateOnRefresh: true,
        // markers: true,
        start: "-300px center",
        end: "bottom center",
      },
      keyframes: [
        { scale: 1.1 },
        { scale: 1 }
      ],
      rotateY: "90deg",
      y: -300,
      x: window.innerWidth / 1.5,
      ease: "none"
    }
  )

  gsap.to(".card2",
    {
      scrollTrigger: {
        trigger: ".card2container",
        scrub: 1,
        invalidateOnRefresh: true,
        // markers: true,
        start: "-300px center",
        end: "bottom center",
      },
      keyframes: [
        { scale: 1.1 },
        { scale: 1 }
      ],
      rotateY: "90deg",
      y: -300,
      x: window.innerWidth / 1.5,
      ease: "none"

    }
  )

  gsap.to(".card3",
    {
      scrollTrigger: {
        trigger: ".card3container",
        scrub: 1,
        invalidateOnRefresh: true,
        // markers: true,
        start: "-300px center",
        end: "bottom center",
        onLeave: () => {
          console.log('comp')
          global.pivotModel.visible = false
        },
        onEnterBack: () => {
          console.log('reenter')
          global.pivotModel.visible = true
        }
      },
      keyframes: [
        { scale: 1.1 },
        { scale: 1 }
      ],
      rotateY: "90deg",
      y: -300,
      x: window.innerWidth / 1.5,
      ease: "none",
    }
  )
  new Splide('.splide', {
    type: 'loop',
    perPage: 3,
    focus: 'center'
  }).mount();
}


function onWindowResize() {
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;

  // 1. Update the renderer size
  renderer.setSize(newWidth, newHeight);

  // Optional: Adjust the pixel ratio for clarity
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // 2. Calculate the new aspect ratio
  const aspectRatio = newWidth / newHeight;
  let scale = [1, 1]
  if (imageAspect > aspectRatio) {
    scale = [imageAspect / aspectRatio, 1]
  }
  else {
    scale = [1, aspectRatio / imageAspect]
  }

  // 3. Update the camera's frustum boundaries
  // You need a reference value for the view size (e.g., a fixed height or a "camFactor")
  // In this example, 'viewSize' is a constant that defines the vertical extents.
  const viewSize = 30; // Example value, adjust as needed

  // camera.left = -aspectRatio * viewSize / 2;
  // camera.right = aspectRatio * viewSize / 2;
  // camera.top = viewSize / 2;
  // camera.bottom = -viewSize / 2;

  camera.left = window.innerWidth / -60, // left
    camera.right = window.innerWidth / 60, // right
    camera.top = window.innerHeight / 60, // top
    camera.bottom = window.innerHeight / -60, // bottom

  // 4. Update the camera's projection matrix
  camera.updateProjectionMatrix();
  app.resize(scale)
  // resize() 
  console.log('rsize')
  // ScrollTrigger.refresh();
}

window.addEventListener('resize', onWindowResize, false);

function render() {
  stats.begin()
  requestAnimationFrame(render)
  const delta = clock.getDelta()

  // if (global.mixer != null) {
  //   global.mixer.update(delta)
  //   // console.log(delta)
  // }
  // helper.update();
  meshTransmissionMaterialUpdate(clock.elapsedTime);
  app.updateScene()

  renderer.render(scene, camera);
  stats.end()
}

let main = async () => {

  await setupEnv();
  await setupMeshTransmissionMaterial();
  await app.initScene()
  render()
  playAnimations()

}


main()



