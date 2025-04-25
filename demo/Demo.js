
import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { T3_TerrainCore } from "../src/T3_TerrainCore.js";
import { T3_Images } from "../src/T3_Images.js";
import { T3_Utility } from "../src/T3_Utility.js";
import { T3_Materials } from "../src/T3_Materials.js";
import { T3_Generators } from "../src/T3_Generators.js";
import { T3_Gaussian } from "../src/T3_Gaussian.js";
import { T3_Influences } from "../src/T3_Influences.js";
import { T3_Analyze } from "../src/T3_Analyze.js";

import { Demo_Analytics } from "./Demo_Analytics.js"; 
import { Demo_DatConfig } from "./Demo_DatConfig.js";
import { Demo_DecoScene } from "./Demo_DecoScene.js";


export class Demo {
    constructor() {
        this.camera;
        this.scene;
        this.renderer;
        this.clock;
        this.terrainScene; // dat
        // decoration or trees in this case
        this.lastOptions; // dat
        this.controls = {}; // dat
        this.fpsCamera; // dat
        this.skyDome;
        this.skyLight; // dat
        this.skyLightColor = new THREE.Color(0xe8bdb0);
        this.sand;
        this.water; // jscs:ignore requireLineBreakAfterVariableAssignment (jscs is deprecated)
        this.INV_MAX_FPS = 1 / 100;
        this.frameDelta = 0;
        this.paused = true;
        this.mouseX = 0;
        this.mouseY = 0;
        this.useFPS = false; // dat
        this.preloadedTextures;
        this.settings; // dat

        this.stats; // dat
        this.stats = new Stats();
        this.stats.domElement.style =
            "position:absolute; right:0; bottom: 0; cursor: pointer; opacity: 0.9; z-index: 10000;";
            this.stats.domElement.id = "StatsContainer";
        document.body.appendChild(this.stats.domElement);

        this.heightmapImage = new Image();
        this.heightmapImage.src = "demo/img/heightmap.png";

        this.settingOptions = {
            easing: "Linear",
            heightmap: "PerlinDiamond",
            smoothing: "None",
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
            "Flight mode": this.useFPS,
            "Light color": "#" + this.skyLightColor.getHexString(),
            spread: 60,
            scattering: "PerlinAltitude",
            mat: new THREE.MeshBasicMaterial({ color: 0x5566aa, wireframe: true }),
            gray: new THREE.MeshPhongMaterial({ color: 0x88aaaa, specular: 0x444455, shininess: 10 }),
        };

        this.initEvents();
    }

    initEvents() {
        window.addEventListener(
            "resize",
            function () {
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.camera.aspect = this.renderer.domElement.width / this.renderer.domElement.height;
                this.camera.updateProjectionMatrix();
                this.fpsCamera.aspect = this.renderer.domElement.width / this.renderer.domElement.height;
                this.fpsCamera.updateProjectionMatrix();
                this.draw();
            }.bind(this),
            false
        );

        document.addEventListener(
            "mousemove",
            function (event) {
                if (!this.paused) {
                    this.mouseX = event.pageX;
                    this.mouseY = event.pageY;
                }
            }.bind(this),
            false
        );

        document.querySelector("#show-analytics").addEventListener(
            "click",
            function (event) {
                Analytics.loadAnalyticsTemplate("./demo/analytics.html", "analytics", this);
                // onload calls initAnalytics();
                event.preventDefault();
            }.bind(this),
            false
        );
    }

    watchFocus() {
        let _blurred = false;
        
        window.addEventListener("focus", function () {
            if (_blurred) {
                _blurred = false;
                this.startAnimating();
                this.controls.enabled = true;
            }
        }.bind(this));
        
        window.addEventListener("blur", function () {
            this.stopAnimating();
            _blurred = true;
            this.controls.enabled = false;
        }.bind(this));
    }

    draw() {
        this.renderer.render(this.scene, this.useFPS ? this.fpsCamera : this.camera);
    }

    update(delta) {
        if (this.terrainScene) this.terrainScene.rotation.z = Date.now() * 0.00001;
        if (this.controls.update) this.controls.update(delta);
    }

    animate() {
        this.stats.update();
        this.draw();

        this.frameDelta += this.clock.getDelta();
        while (this.frameDelta >= this.INV_MAX_FPS) {
            this.update(this.INV_MAX_FPS);
            this.frameDelta -= this.INV_MAX_FPS;
        }

        if (!this.paused) {
            requestAnimationFrame(this.animate.bind(this));
        }
    }

    startAnimating() {
        if (this.paused) {
            this.paused = false;
            this.controls.enabled = true;
            this.clock.start();
            requestAnimationFrame(this.animate.bind(this));
        }
    }

    stopAnimating() {
        this.paused = true;
        this.controls.enabled = false;
        this.clock.stop();
    }

    preloadTextures(textureUrlArray, callback) {
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

    setup(preloaded) {
        this.preloadedTextures = preloaded;
        this.setUpScene();
        this.setupControls();
        this.setupWorld();
        // uses world items
        this.settings = this.Settings();
        this.watchFocus();
        Demo_DatConfig.setupDatGui(this.settings);
        this.startAnimating();
        // uses settings
        this.Regenerate();
    }

    setUpScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x868293, 0.0007);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        this.renderer.domElement.setAttribute("tabindex", -1);

        this.camera = new THREE.PerspectiveCamera(
            60,
            this.renderer.domElement.width / this.renderer.domElement.height,
            1,
            10000
        );
        this.scene.add(this.camera);
        this.camera.position.x = 449;
        this.camera.position.y = 311;
        this.camera.position.z = 376;
        this.camera.rotation.x = (-52 * Math.PI) / 180;
        this.camera.rotation.y = (35 * Math.PI) / 180;
        this.camera.rotation.z = (37 * Math.PI) / 180;

        this.clock = new THREE.Clock(false);
    }

    setupControls() {
        this.fpsCamera = new THREE.PerspectiveCamera(
            60,
            this.renderer.domElement.width / this.renderer.domElement.height,
            1,
            10000
        );
        this.scene.add(this.fpsCamera);
        this.controls = new OrbitControls(this.fpsCamera, this.renderer.domElement);
        this.controls.enabled = false;
        this.controls.movementSpeed = 100;
        this.controls.lookSpeed = 0.075;
    }

    setupWorld() {

        // sky
        let t1 = this.preloadedTextures["demo/img/sky1.jpg"];
        t1.minFilter = THREE.LinearFilter; // Texture is not a power-of-two size; use smoother interpolation.
        this.skyDome = new THREE.Mesh(
            new THREE.SphereGeometry(8192, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
            new THREE.MeshBasicMaterial({ map: t1, side: THREE.BackSide, fog: false })
        );
        this.skyDome.position.y = -99;
        this.scene.add(this.skyDome);

        // water
        this.water = new THREE.Mesh(
            new THREE.PlaneGeometry(16384 + 1024, 16384 + 1024, 16, 16),
            new THREE.MeshLambertMaterial({ color: 0x006ba0, transparent: true, opacity: 0.6 })
        );
        this.water.position.y = -99;
        this.water.rotation.x = -0.5 * Math.PI;
        this.scene.add(this.water);

        //const ambient = new THREE.AmbientLight(0x404040); // soft white light
        //this.scene.add(ambient);

        // directional light
        this.skyLight = new THREE.DirectionalLight(this.skyLightColor, 1.5);
        this.skyLight.position.set(2950, 2625, -160); // Sun on the sky texture
        this.scene.add(this.skyLight);

        // directional light
        let light = new THREE.DirectionalLight(0xc3eaff, 1.5);
        light.position.set(-1, -0.5, -1);
        this.scene.add(light);
    }

    Regenerate() {
        let segments = parseInt(this.settings.segments, 10);
        // kind of arbitrary
        let heightmap = this.settings.heightmap === "heightmap.png";

        let regenOpts = this.regenOpts = {
            after: this.settings.after,
            easing: T3_Utility[this.settings.easing],
            heightmap: heightmap
                ? this.heightmapImage
                : this.settings.heightmap === "influences"
                ? this.customInfluences
                : T3_Generators[this.settings.heightmap],
            material:
                this.settings.texture == "Wireframe"
                    ? this.settings.mat
                    : this.settings.texture == "Blended"
                    ? this.settings.blend
                    : this.settings.gray,
            maxHeight: this.settings.maxHeight - 100,
            minHeight: -100,
            steps: this.settings.steps,
            stretch: true,
            turbulent: this.settings.turbulent,
            xSize: this.settings.size,
            ySize: Math.round(this.settings.size * this.settings["width:length ratio"]),
            xSegments: segments,
            ySegments: Math.round(segments * this.settings["width:length ratio"]),
        };

        this.scene.remove(this.terrainScene);

        this.terrainScene = T3_TerrainCore.Terrain(regenOpts);

        this.applySmoothing(this.settings.smoothing, regenOpts);

        this.scene.add(this.terrainScene);

        this.skyDome.visible = this.sand.visible = this.water.visible = this.settings.texture != "Wireframe";

        let he = document.getElementById("heightmap");

        if (he) {
            regenOpts.heightmap = he;
            T3_Images.toHeightmap(this.terrainScene.children[0].geometry.attributes.position.array, regenOpts);
        }

        this.lastOptions = regenOpts;

        Demo_DecoScene.scatterMeshes(this.settings, this.terrainScene);
    }

    edgeCorrection = function (that, vertices, options) {
        if (that.edgeDirection !== "Normal") {
            (that.edgeType === "Box" ? T3_Filters.Edges : T3_Filters.RadialEdges)(
                vertices,
                options,
                that.edgeDirection === "Up" ? true : false,
                that.edgeType === "Box"
                    ? that.edgeDistance
                    : Math.min(options.xSize, options.ySize) * 0.5 - that.edgeDistance,
                T3_Utility[that.edgeCurve]
            );
        }
    };

    Settings() {
        let that = this;
        let blend;
        let loader = new THREE.TextureLoader();

        let t1 = this.preloadedTextures["demo/img/sand1.jpg"];
        t1.wrapS = t1.wrapT = THREE.RepeatWrapping;

        this.sand = new THREE.Mesh(
            new THREE.PlaneGeometry(16384 + 1024, 16384 + 1024, 64, 64),
            new THREE.MeshLambertMaterial({ map: t1 })
        );
        this.sand.position.y = -101;
        this.sand.rotation.x = -0.5 * Math.PI;
        this.scene.add(this.sand);

        let t2 = this.preloadedTextures["demo/img/grass1.jpg"];
        let t3 = this.preloadedTextures["demo/img/stone1.jpg"];
        let t4 = this.preloadedTextures["demo/img/snow1.jpg"];

        t2.wrapS = t2.wrapT = THREE.RepeatWrapping;
        // need to add to options
        t2.repeat.set(2, 2);
        t2.needsUpdate = true;

        this.blend = blend = T3_Materials.generateBlendedMaterial([
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

        for (let key in this.settingOptions) {
            that[key] = this.settingOptions[key];
        }

        this.after = function (vertices, options) {
            this.edgeCorrection(this, vertices, options);
        }.bind(this);

        this.callRegenerate = function () {
            this.Regenerate();
        }.bind(this);

        window.rebuild = this.callRegenerate;

        this.altitudeProbability = function (z, that) {
            if (z > -80 && z < -50) return T3_Utility.EaseInOut((z + 80) / (-50 + 80)) * that.spread * 0.002;
            else if (z > -50 && z < 20) return that.spread * 0.002;
            else if (z > 20 && z < 50) return T3_Utility.EaseInOut((z - 20) / (50 - 20)) * that.spread * 0.002;
            return 0;
        };

        this.altitudeSpread = function (v, k) {
            return k % 4 === 0 && Math.random() < this.altitudeProbability(v.z, this);
        }.bind(this);

        this["Scatter meshes"] = function () {
            Demo_DecoScene.scatterMeshes(this.settings, this.terrainScene);
        };

        return this;
    }

    __printCameraData() {
        let s = "";
        s += "camera.position.x = " + Math.round(fpsCamera.position.x) + ";\n";
        s += "camera.position.y = " + Math.round(fpsCamera.position.y) + ";\n";
        s += "camera.position.z = " + Math.round(fpsCamera.position.z) + ";\n";
        s += "camera.rotation.x = " + Math.round((fpsCamera.rotation.x * 180) / Math.PI) + " * Math.PI / 180;\n";
        s += "camera.rotation.y = " + Math.round((fpsCamera.rotation.y * 180) / Math.PI) + " * Math.PI / 180;\n";
        s += "camera.rotation.z = " + Math.round((fpsCamera.rotation.z * 180) / Math.PI) + " * Math.PI / 180;\n";
        console.log(s);
    }

    applySmoothing(smoothing, o) {
        let m = this.terrainScene.children[0];
        let g = T3_Utility.toArray1D(m.geometry.attributes.position.array);
        if (smoothing === "Conservative (0.5)") T3_Filters.SmoothConservative(g, o, 0.5);
        if (smoothing === "Conservative (1)") T3_Filters.SmoothConservative(g, o, 1);
        if (smoothing === "Conservative (10)") T3_Filters.SmoothConservative(g, o, 10);
        else if (smoothing === "Gaussian (0.5, 7)") T3_Gaussian.Gaussian(g, o, 0.5, 7);
        else if (smoothing === "Gaussian (1.0, 7)") T3_Gaussian.Gaussian(g, o, 1, 7);
        else if (smoothing === "Gaussian (1.5, 7)") T3_Gaussian.Gaussian(g, o, 1.5, 7);
        else if (smoothing === "Gaussian (1.0, 5)") T3_Gaussian.Gaussian(g, o, 1, 5);
        else if (smoothing === "Gaussian (1.0, 11)") T3_Gaussian.Gaussian(g, o, 1, 11);
        else if (smoothing === "GaussianBox") T3_Gaussian.GaussianBoxBlur(g, o, 1, 3);
        else if (smoothing === "Mean (0)") T3_Filters.Smooth(g, o, 0);
        else if (smoothing === "Mean (1)") T3_Filters.Smooth(g, o, 1);
        else if (smoothing === "Mean (8)") T3_Filters.Smooth(g, o, 8);
        else if (smoothing === "Median") T3_Filters.SmoothMedian(g, o);
        T3_Utility.fromArray1D(m.geometry.attributes.position.array, g);
        T3_Utility.Normalize(m, o);
    }

    customInfluences(g, options) {
        let clonedOptions = {};
        for (let opt in options) {
            if (options.hasOwnProperty(opt)) {
                clonedOptions[opt] = options[opt];
            }
        }
        clonedOptions.maxHeight = options.maxHeight * 0.67;
        clonedOptions.minHeight = options.minHeight * 0.67;

        T3_Generators.DiamondSquare(g, clonedOptions);

        let radius = Math.min(options.xSize, options.ySize) * 0.21;
        let height = options.maxHeight * 0.8;

        T3_Influences.Influence(
            g,
            options,
            T3_Influences.Influences.Hill,
            0.25,
            0.25,
            radius,
            height,
            THREE.AdditiveBlending,
            T3_Utility.Linear
        );

        T3_Influences.Influence(
            g,
            options,
            T3_Influences.Influences.Mesa,
            0.75,
            0.75,
            radius,
            height,
            THREE.SubtractiveBlending,
            T3_Utility.EaseInStrong
        );

        T3_Influences.Influence(
            g,
            options,
            T3_Influences.Influences.Flat,
            0.75,
            0.25,
            radius,
            options.maxHeight,
            THREE.NormalBlending,
            T3_Utility.EaseIn
        );

        T3_Influences.Influence(
            g,
            options,
            T3_Influences.Influences.Volcano,
            0.25,
            0.75,
            radius,
            options.maxHeight,
            THREE.NormalBlending,
            T3_Utility.EaseInStrong
        );
    }
}
