let camera;
let scene;
let renderer;
let clock;
let terrainScene; // dat
let lastOptions; // dat
let controls = {}; // dat
let fpsCamera; // dat
let skyDome;
let skyLight; // dat
const skyLightColor = new THREE.Color(0xe8bdb0);
let sand;
let water; // jscs:ignore requireLineBreakAfterVariableAssignment (jscs is deprecated)
let INV_MAX_FPS = 1 / 100;
let frameDelta = 0;
let paused = true;
let mouseX = 0;
let mouseY = 0;
let useFPS = false; // dat
let preloadedTextures;
let stats; // dat
let settings; // dat
let regenOpts;


let heightmapImage = new Image();
heightmapImage.src = "demo/img/heightmap.png";

let settingOptions = {
    easing: "Linear",
    heightmap: "PerlinDiamond",
    smoothing: "Gaussian (1.5, 7)",
    maxHeight: 200,
    segments: 63,
    steps: 1,
    turbulent: false,
    size: 1024,
    sky: true,
    texture: "Blended",
    edgeDirection: "Normal",
    edgeType: "Box",
    edgeDistance: 256,
    edgeCurve: "EaseInOut",
    "width:length ratio": 1.0,
    "Flight mode": useFPS,
    "Light color": "#" + skyLightColor.getHexString(),
    spread: 60,
    scattering: "PerlinAltitude",
    mat: new THREE.MeshBasicMaterial({ color: 0x5566aa, wireframe: true }),
    gray: new THREE.MeshPhongMaterial({ color: 0x88aaaa, specular: 0x444455, shininess: 10 })
};

function animate() {
    stats.update();
    draw();

    frameDelta += clock.getDelta();
    while (frameDelta >= INV_MAX_FPS) {
        update(INV_MAX_FPS);
        frameDelta -= INV_MAX_FPS;
    }

    if (!paused) {
        requestAnimationFrame(animate);
    }
}

function startAnimating() {
    if (paused) {
        paused = false;
        controls.enabled = true;
        clock.start();
        requestAnimationFrame(animate);
    }
}

function stopAnimating() {
    paused = true;
    controls.enabled = false;
    clock.stop();
}

function preloadTextures(textureUrlArray, callback) {
    const textureLoader = new THREE.TextureLoader();
    let loadedCount = 0;
    let loadedTextures = {};
    let hasError = false;

    function checkAllLoaded() {
        loadedCount++;
        if (loadedCount === textureUrlArray.length && !hasError) {
            callback(loadedTextures);
        }
    }

    try {
        textureUrlArray.forEach((url) => {
            loadedTextures[url] = textureLoader.load(
                url,
                checkAllLoaded,
                (xhr) => console.log(`${url}: ${(xhr.loaded / xhr.total) * 100}% loaded`),
                (error) => {
                    hasError = true;
                    console.error(`Error loading texture ${url}:`, error);
                }
            );
        });
    } catch (error) {
        hasError = true;
        console.error("Texture loading failed:", error);
    }
}

function setup(preloaded) {
    preloadedTextures = preloaded;
    setUpScene();
    setupControls();
    setupWorld();
    // uses world items
    settings = new Settings();
    watchFocus();
    setupDatGui(settings);
    startAnimating();
    // uses settings
    Regenerate();
}

function setUpScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x868293, 0.0007);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("tabindex", -1);

    camera = new THREE.PerspectiveCamera(60, renderer.domElement.width / renderer.domElement.height, 1, 10000);
    scene.add(camera);
    camera.position.x = 449;
    camera.position.y = 311;
    camera.position.z = 376;
    camera.rotation.x = (-52 * Math.PI) / 180;
    camera.rotation.y = (35 * Math.PI) / 180;
    camera.rotation.z = (37 * Math.PI) / 180;

    clock = new THREE.Clock(false);
}

function setupControls() {
    fpsCamera = new THREE.PerspectiveCamera(60, renderer.domElement.width / renderer.domElement.height, 1, 10000);
    scene.add(fpsCamera);
    controls = new THREE.FirstPersonControls(fpsCamera, renderer.domElement);
    controls.enabled = false;
    controls.movementSpeed = 100;
    controls.lookSpeed = 0.075;
}

function setupWorld() {
    // sky
    let t1 = preloadedTextures["demo/img/sky1.jpg"];
    t1.minFilter = THREE.LinearFilter; // Texture is not a power-of-two size; use smoother interpolation.
    skyDome = new THREE.Mesh(
        new THREE.SphereGeometry(8192, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
        new THREE.MeshBasicMaterial({ map: t1, side: THREE.BackSide, fog: false })
    );
    skyDome.position.y = -99;
    scene.add(skyDome);

    // water
    water = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(16384 + 1024, 16384 + 1024, 16, 16),
        new THREE.MeshLambertMaterial({ color: 0x006ba0, transparent: true, opacity: 0.6 })
    );
    water.position.y = -99;
    water.rotation.x = -0.5 * Math.PI;
    scene.add(water);

    // directional light
    skyLight = new THREE.DirectionalLight(skyLightColor, 1.5);
    skyLight.position.set(2950, 2625, -160); // Sun on the sky texture
    scene.add(skyLight);

    // directional light
    let light = new THREE.DirectionalLight(0xc3eaff, 0.75);
    light.position.set(-1, -0.5, -1);
    scene.add(light);
}


function Regenerate() {
    let segments = parseInt(settings.segments, 10);
    // kind of arbitrary
    let heightmap = settings.heightmap === "heightmap.png";

    regenOpts = {
        after: settings.after,
        easing: THREE.Terrain[settings.easing],
        heightmap: heightmap
            ? heightmapImage
            : settings.heightmap === "influences"
            ? customInfluences
            : THREE.Terrain[settings.heightmap],
        material: settings.texture == "Wireframe" ? settings.mat : settings.texture == "Blended" ? settings.blend : settings.gray,
        maxHeight: settings.maxHeight - 100,
        minHeight: -100,
        steps: settings.steps,
        stretch: true,
        turbulent: settings.turbulent,
        xSize: settings.size,
        ySize: Math.round(settings.size * settings["width:length ratio"]),
        xSegments: segments,
        ySegments: Math.round(segments * settings["width:length ratio"]),
    };

    scene.remove(terrainScene);

    terrainScene = THREE.Terrain(regenOpts);

    applySmoothing(settings.smoothing, regenOpts);

    scene.add(terrainScene);

    skyDome.visible = sand.visible = water.visible = settings.texture != "Wireframe";

    let he = document.getElementById("heightmap");

    if (he) {
        regenOpts.heightmap = he;
        THREE.Terrain.toHeightmap(terrainScene.children[0].geometry.attributes.position.array, regenOpts);
    }

    lastOptions = regenOpts;

    scatterMeshes(settings);
}

let edgeCorrection = function (that, vertices, options) {
    if (that.edgeDirection !== "Normal") {
        (that.edgeType === "Box" ? THREE.Terrain.Edges : THREE.Terrain.RadialEdges)(
            vertices,
            options,
            that.edgeDirection === "Up" ? true : false,
            that.edgeType === "Box"
                ? that.edgeDistance
                : Math.min(options.xSize, options.ySize) * 0.5 - that.edgeDistance,
            THREE.Terrain[that.edgeCurve]
        );
    }
};

function Settings() {
    let that = this;
    let blend;
    let loader = new THREE.TextureLoader();

    let t1 = preloadedTextures["demo/img/sand1.jpg"];
    t1.wrapS = t1.wrapT = THREE.RepeatWrapping;
    sand = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(16384 + 1024, 16384 + 1024, 64, 64),
        new THREE.MeshLambertMaterial({ map: t1 })
    );
    sand.position.y = -101;
    sand.rotation.x = -0.5 * Math.PI;
    scene.add(sand);

    let t2 = preloadedTextures["demo/img/grass1.jpg"];
    let t3 = preloadedTextures["demo/img/stone1.jpg"];
    let t4 = preloadedTextures["demo/img/snow1.jpg"];

    t2.wrapS = t2.wrapT = THREE.RepeatWrapping;
    // need to add to options
    t2.repeat.set(2, 2);
    t2.needsUpdate = true;

    //t2.repeat.x = t2.repeat.y = 20;
    this.blend = blend = THREE.Terrain.generateBlendedMaterial([
        { texture: t1, repeat: { x: 6, y: 6 } },
        { texture: t2, levels: [-80, -35, 20, 50], repeat: { x: 6, y: 6 } },
        { texture: t3, levels: [20, 50, 60, 85], repeat: { x: 6, y: 6 } },
        {
            texture: t4,
            glsl: "1.0 - smoothstep(65.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 80.0, vPosition.z)",
            repeat: { x: 6, y: 6 },
        },
        {
            texture: t3,
            glsl: "slope > 0.7853981633974483 ? 0.2 : 1.0 - smoothstep(0.47123889803846897, 0.7853981633974483, slope) + 0.2",
            repeat: { x: 6, y: 6 },
        }, // between 27 and 45 degrees
    ]);

    for (let key in settingOptions) {
        that[key] = settingOptions[key];
    }

    this.after = function (vertices, options) {
        edgeCorrection(this, vertices, options);
    }.bind(this);

    this.callRegenerate = function () {
        Regenerate();
    }.bind(this);

    window.rebuild = this.Regenerate = this.callRegenerate;

    this.altitudeProbability = function(z, that) {
        if (z > -80 && z < -50) return THREE.Terrain.EaseInOut((z + 80) / (-50 + 80)) * that.spread * 0.002;
        else if (z > -50 && z < 20) return that.spread * 0.002;
        else if (z > 20 && z < 50) return THREE.Terrain.EaseInOut((z - 20) / (50 - 20)) * that.spread * 0.002;
        return 0;
    }

    this.altitudeSpread = function (v, k) {
        return k % 4 === 0 && Math.random() < altitudeProbability(v.z, this);
    };

    this["Scatter meshes"] = function() {
        scatterMeshes(settings);
    }
}

window.addEventListener(
    "resize",
    function () {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = renderer.domElement.width / renderer.domElement.height;
        camera.updateProjectionMatrix();
        fpsCamera.aspect = renderer.domElement.width / renderer.domElement.height;
        fpsCamera.updateProjectionMatrix();
        draw();
    },
    false
);

function draw() {
    renderer.render(scene, useFPS ? fpsCamera : camera);
}

function update(delta) {
    if (terrainScene) terrainScene.rotation.z = Date.now() * 0.00001;
    if (controls.update) controls.update(delta);
}

document.addEventListener("keyup", function (event) {
    if (event.key === "q" && useFPS) {
        controls.enabled = !controls.enabled;
    }
});

document.addEventListener(
    "mousemove",
    function (event) {
        if (!paused) {
            mouseX = event.pageX;
            mouseY = event.pageY;
        }
    },
    false
);

// Stop animating if the window lost focus
function watchFocus() {
    let _blurred = false;
    window.addEventListener("focus", function () {
        if (_blurred) {
            _blurred = false;
            startAnimating();
            controls.enabled = true;
        }
    });
    window.addEventListener("blur", function () {
        stopAnimating();
        _blurred = true;
        controls.enabled = false;
    });
}


document.querySelector("#show-analytics").addEventListener(
    "click",
    function (event) {
        loadAnalyticsTemplate("./demo/analytics.html", "analytics");
        // onload calls initAnalytics();
        event.preventDefault();
    },
    false
);

function __printCameraData() {
    let s = "";
    s += "camera.position.x = " + Math.round(fpsCamera.position.x) + ";\n";
    s += "camera.position.y = " + Math.round(fpsCamera.position.y) + ";\n";
    s += "camera.position.z = " + Math.round(fpsCamera.position.z) + ";\n";
    s += "camera.rotation.x = " + Math.round((fpsCamera.rotation.x * 180) / Math.PI) + " * Math.PI / 180;\n";
    s += "camera.rotation.y = " + Math.round((fpsCamera.rotation.y * 180) / Math.PI) + " * Math.PI / 180;\n";
    s += "camera.rotation.z = " + Math.round((fpsCamera.rotation.z * 180) / Math.PI) + " * Math.PI / 180;\n";
    console.log(s);
}

function applySmoothing(smoothing, o) {
    let m = terrainScene.children[0];
    let g = THREE.Terrain.toArray1D(m.geometry.attributes.position.array);
    if (smoothing === "Conservative (0.5)") THREE.Terrain.SmoothConservative(g, o, 0.5);
    if (smoothing === "Conservative (1)") THREE.Terrain.SmoothConservative(g, o, 1);
    if (smoothing === "Conservative (10)") THREE.Terrain.SmoothConservative(g, o, 10);
    else if (smoothing === "Gaussian (0.5, 7)") THREE.Terrain.Gaussian(g, o, 0.5, 7);
    else if (smoothing === "Gaussian (1.0, 7)") THREE.Terrain.Gaussian(g, o, 1, 7);
    else if (smoothing === "Gaussian (1.5, 7)") THREE.Terrain.Gaussian(g, o, 1.5, 7);
    else if (smoothing === "Gaussian (1.0, 5)") THREE.Terrain.Gaussian(g, o, 1, 5);
    else if (smoothing === "Gaussian (1.0, 11)") THREE.Terrain.Gaussian(g, o, 1, 11);
    else if (smoothing === "GaussianBox") THREE.Terrain.GaussianBoxBlur(g, o, 1, 3);
    else if (smoothing === "Mean (0)") THREE.Terrain.Smooth(g, o, 0);
    else if (smoothing === "Mean (1)") THREE.Terrain.Smooth(g, o, 1);
    else if (smoothing === "Mean (8)") THREE.Terrain.Smooth(g, o, 8);
    else if (smoothing === "Median") THREE.Terrain.SmoothMedian(g, o);
    THREE.Terrain.fromArray1D(m.geometry.attributes.position.array, g);
    THREE.Terrain.Normalize(m, o);
}

function customInfluences(g, options) {
    let clonedOptions = {};
    for (let opt in options) {
        if (options.hasOwnProperty(opt)) {
            clonedOptions[opt] = options[opt];
        }
    }
    clonedOptions.maxHeight = options.maxHeight * 0.67;
    clonedOptions.minHeight = options.minHeight * 0.67;
    THREE.Terrain.DiamondSquare(g, clonedOptions);

    let radius = Math.min(options.xSize, options.ySize) * 0.21,
        height = options.maxHeight * 0.8;
    THREE.Terrain.Influence(
        g,
        options,
        THREE.Terrain.Influences.Hill,
        0.25,
        0.25,
        radius,
        height,
        THREE.AdditiveBlending,
        THREE.Terrain.Linear
    );
    THREE.Terrain.Influence(
        g,
        options,
        THREE.Terrain.Influences.Mesa,
        0.75,
        0.75,
        radius,
        height,
        THREE.SubtractiveBlending,
        THREE.Terrain.EaseInStrong
    );
    THREE.Terrain.Influence(
        g,
        options,
        THREE.Terrain.Influences.Flat,
        0.75,
        0.25,
        radius,
        options.maxHeight,
        THREE.NormalBlending,
        THREE.Terrain.EaseIn
    );
    THREE.Terrain.Influence(
        g,
        options,
        THREE.Terrain.Influences.Volcano,
        0.25,
        0.75,
        radius,
        options.maxHeight,
        THREE.NormalBlending,
        THREE.Terrain.EaseInStrong
    );
}
