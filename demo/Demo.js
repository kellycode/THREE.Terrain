export class Demo {
    constructor() {
        this.camera;
        this.scene;
        this.renderer;
        this.clock;
        this.player;
        this.terrainScene; // dat
        // decoration or trees in this case
        this.decoScene;
        this.lastOptions; // dat
        this.controls = {}; // dat
        this.fpsCamera; // dat
        this.skyDome;
        this.skyLight; // dat
        const skyLightColor = new THREE.Color(0xe8bdb0);
        this.sand;
        this.water; // jscs:ignore requireLineBreakAfterVariableAssignment (jscs is deprecated)
        this.INV_MAX_FPS = 1 / 100;
        this.frameDelta = 0;
        this.paused = true;
        this.mouseX = 0;
        this.mouseY = 0;
        this.useFPS = false; // dat
        this.preloadedTextures;
        this.stats; // dat
        this.analyticsActive = false;
        this.settings; // dat
        this.regenOpts;
        this.elevationGraph;
        this.slopeGraph;
        this.analyticsValues;
        this.treeMesh = buildTree();
        this.gray;
        this.mat;

        this.heightmapImage = new Image();
        heightmapImage.src = "demo/img/heightmap.png";

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
            "Flight mode": useFPS,
            "Light color": "#" + skyLightColor.getHexString(),
            spread: 60,
            scattering: "PerlinAltitude",
            mat: new THREE.MeshBasicMaterial({ color: 0x5566aa, wireframe: true }),
            gray: new THREE.MeshPhongMaterial({ color: 0x88aaaa, specular: 0x444455, shininess: 10 }),
        };
    }
}
