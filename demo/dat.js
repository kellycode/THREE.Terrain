function setupDatGui(settings) {
    console.log("Setting up dat pita");

    var gui = new dat.GUI();

    var heightmapFolder = gui.addFolder("Heightmap");

    heightmapFolder
        .add(settings, "heightmap", [
            "Brownian",
            "Cosine",
            "CosineLayers",
            "DiamondSquare",
            "Fault",
            "heightmap.png",
            "Hill",
            "HillIsland",
            "influences",
            "Particles",
            "Perlin",
            "PerlinDiamond",
            "PerlinLayers",
            "Simplex",
            "SimplexLayers",
            "Value",
            "Weierstrass",
            "Worley",
        ])
        .onFinishChange(settings.Regenerate);

    heightmapFolder
        .add(settings, "easing", ["Linear", "EaseIn", "EaseInWeak", "EaseOut", "EaseInOut", "InEaseOut"])
        .onFinishChange(settings.Regenerate);

    heightmapFolder
        .add(settings, "smoothing", [
            "Conservative (0.5)",
            "Conservative (1)",
            "Conservative (10)",
            "Gaussian (0.5, 7)",
            "Gaussian (1.0, 7)",
            "Gaussian (1.5, 7)",
            "Gaussian (1.0, 5)",
            "Gaussian (1.0, 11)",
            "GaussianBox",
            "Mean (0)",
            "Mean (1)",
            "Mean (8)",
            "Median",
            "None",
        ])
        .onChange(function (val) {
            applySmoothing(val, lastOptions);
            settings["Scatter meshes"](settings);
            if (lastOptions.heightmap) {
                THREE.Terrain.toHeightmap(terrainScene.children[0].geometry.attributes.position.array, lastOptions);
            }
        });

    heightmapFolder.add(settings, "segments", 7, 127).step(1).onFinishChange(settings.Regenerate);
    heightmapFolder.add(settings, "steps", 1, 8).step(1).onFinishChange(settings.Regenerate);
    heightmapFolder.add(settings, "turbulent").onFinishChange(settings.Regenerate);
    heightmapFolder.open();

    var decoFolder = gui.addFolder("Decoration");
    decoFolder.add(settings, "texture", ["Blended", "Grayscale", "Wireframe"]).onFinishChange(settings.Regenerate);
    decoFolder
        .add(settings, "scattering", [
            "Altitude",
            "Linear",
            "Cosine",
            "CosineLayers",
            "DiamondSquare",
            "Particles",
            "Perlin",
            "PerlinAltitude",
            "Simplex",
            "Value",
            "Weierstrass",
            "Worley",
        ])
        .onFinishChange(settings["Scatter meshes"]);

    decoFolder.add(settings, "spread", 0, 100).step(1).onFinishChange(settings["Scatter meshes"]);
    decoFolder.addColor(settings, "Light color").onChange(function (val) {
        skyLight.color.set(val);
    });

    var sizeFolder = gui.addFolder("Size");
    sizeFolder.add(settings, "size", 1024, 3072).step(256).onFinishChange(settings.Regenerate);
    sizeFolder.add(settings, "maxHeight", 2, 300).step(2).onFinishChange(settings.Regenerate);
    sizeFolder.add(settings, "width:length ratio", 0.2, 2).step(0.05).onFinishChange(settings.Regenerate);

    var edgesFolder = gui.addFolder("Edges");
    edgesFolder.add(settings, "edgeType", ["Box", "Radial"]).onFinishChange(settings.Regenerate);
    edgesFolder.add(settings, "edgeDirection", ["Normal", "Up", "Down"]).onFinishChange(settings.Regenerate);
    edgesFolder
        .add(settings, "edgeCurve", ["Linear", "EaseIn", "EaseOut", "EaseInOut"])
        .onFinishChange(settings.Regenerate);
    edgesFolder.add(settings, "edgeDistance", 0, 512).step(32).onFinishChange(settings.Regenerate);

    gui.add(settings, "Flight mode").onChange(function (val) {
        useFPS = val;
        fpsCamera.position.x = 449;
        fpsCamera.position.y = 311;
        fpsCamera.position.z = 376;
        controls.lookAt(terrainScene.children[0].position);
        controls.update(0);
        controls.enabled = false;
        if (useFPS) {
            document.getElementById("fpscontrols").className = "visible";
            setTimeout(function () {
                controls.enabled = true;
            }, 1000);
        } else {
            document.getElementById("fpscontrols").className = "";
        }
    });
    gui.add(settings, "Scatter meshes");
    gui.add(settings, "Regenerate");

    stats = new Stats();
    stats.domElement.style = "position:absolute; right:0; bottom: 0; cursor: pointer; opacity: 0.9; z-index: 10000;";
    stats.domElement.id = "StatsContainer";
    document.body.appendChild(stats.domElement);
}