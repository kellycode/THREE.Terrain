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
        .onFinishChange(settings.callRegenerate);

    heightmapFolder
        .add(settings, "easing", ["Linear", "EaseIn", "EaseInWeak", "EaseOut", "EaseInOut", "InEaseOut"])
        .onFinishChange(settings.callRegenerate);

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
            settings.applySmoothing(val, settings.lastOptions);
            settings["Scatter meshes"](settings);
            if (settings.lastOptions.heightmap) {
                THREE.Terrain.toHeightmap(settings.terrainScene.children[0].geometry.attributes.position.array, settings.lastOptions);
            }
        });

    heightmapFolder.add(settings, "segments", 7, 127).step(1).onFinishChange(settings.callRegenerate);
    heightmapFolder.add(settings, "steps", 1, 8).step(1).onFinishChange(settings.callRegenerate);
    heightmapFolder.add(settings, "turbulent").onFinishChange(settings.callRegenerate);
    heightmapFolder.open();

    var decoFolder = gui.addFolder("Decoration");
    decoFolder.add(settings, "texture", ["Blended", "Grayscale", "Wireframe"]).onFinishChange(settings.callRegenerate);
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
        .onFinishChange(function (val) {
            settings["Scatter meshes"](settings);
        });

    decoFolder.add(settings, "spread", 0, 100).step(1).onFinishChange(function (val) {
        settings["Scatter meshes"](settings);
    });
    decoFolder.addColor(settings, "Light color").onChange(function (val) {
        settings.skyLight.color.set(val);
    });

    var sizeFolder = gui.addFolder("Size");
    sizeFolder.add(settings, "size", 1024, 3072).step(256).onFinishChange(settings.callRegenerate);
    sizeFolder.add(settings, "maxHeight", 2, 300).step(2).onFinishChange(settings.callRegenerate);
    sizeFolder.add(settings, "width:length ratio", 0.2, 2).step(0.05).onFinishChange(settings.callRegenerate);

    var edgesFolder = gui.addFolder("Edges");
    edgesFolder.add(settings, "edgeType", ["Box", "Radial"]).onFinishChange(settings.callRegenerate);
    edgesFolder.add(settings, "edgeDirection", ["Normal", "Up", "Down"]).onFinishChange(settings.callRegenerate);
    edgesFolder
        .add(settings, "edgeCurve", ["Linear", "EaseIn", "EaseOut", "EaseInOut"])
        .onFinishChange(settings.callRegenerate);
    edgesFolder.add(settings, "edgeDistance", 0, 512).step(32).onFinishChange(settings.callRegenerate);

    gui.add(settings, "Flight mode").onChange(function (val) {
        settings.useFPS = val;
        settings.fpsCamera.position.x = 449;
        settings.fpsCamera.position.y = 311;
        settings.fpsCamera.position.z = 376;
        settings.controls.lookAt(settings.terrainScene.children[0].position);
        settings.controls.update(0);
        settings.controls.enabled = false;
        if (settings.useFPS) {
            document.getElementById("fpscontrols").className = "visible";
            setTimeout(function () {
                settings.controls.enabled = true;
            }, 1000);
        } else {
            document.getElementById("fpscontrols").className = "";
        }
    });
    gui.add(settings, "Scatter meshes");
    gui.add(settings, "Regenerate");

}