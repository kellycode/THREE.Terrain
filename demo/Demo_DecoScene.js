// The Tree Factory
import * as THREE from "three";

import { T3_Utility } from "../src/T3_Utility.js";
import { T3_Worley } from "../src/T3_Worley.js"; 
import { T3_Generators } from "../src/T3_Generators.js";
import { T3_Scatter } from "../src/T3_Scatter.js";

export class Demo_DecoScene {
    constructor() {
        if (this instanceof Demo_DecoScene) {
            throw Error("A static class cannot be instantiated.");
        }
    }
    static scatterMeshes(settings, terrainScene) {
        let segments = parseInt(settings.segments, 10);
    
        if(typeof settings === 'undefined') {
            console.log('ng')
        }
        let spread;
        let randomness;
        let decoScene;
    
        let scatterOptions = {
            xSegments: segments,
            ySegments: Math.round(segments * settings["width:length ratio"]),
        };
    
        if (settings.scattering === "Linear") {
            spread = settings.spread * 0.0005;
            randomness = Math.random;
        } else if (settings.scattering === "Altitude") {
            spread = settings.altitudeSpread;
        } else if (settings.scattering === "PerlinAltitude") {
            spread = (function () {
                let helper = T3_Scatter.ScatterHelper(T3_Generators.Perlin, scatterOptions, 2, 0.125)();
                let helperSpread = T3_Utility.InEaseOut(settings.spread * 0.01);
                return function (vertex, index) {
                    let rv = helper[index];
                    let place = false;
                    if (rv < helperSpread) {
                        place = true;
                    } else if (rv < helperSpread + 0.2) {
                        place = T3_Utility.EaseInOut((rv - helperSpread) * 5) * helperSpread < Math.random();
                    }
                    return Math.random() < settings.altitudeProbability(vertex.z, settings) * 5 && place;
                };
            })();
        } else {
            spread = T3_Utility.InEaseOut(settings.spread * 0.01) * (settings.scattering === "Worley" ? 1 : 0.5);
            if(settings.scattering === "Worley") {
                // Worley wasn't handled so added this
                randomness = T3_Scatter.ScatterHelper(T3_Worley[settings.scattering], scatterOptions, 2, 0.125);
            } else {
                randomness = T3_Scatter.ScatterHelper(T3_Generators[settings.scattering], scatterOptions, 2, 0.125);
            }
    
            
        }
    
        let geo = terrainScene.children[0].geometry;
    
        const previousDemo_DecoScene = terrainScene.getObjectByName("decoScene");
    
        if (previousDemo_DecoScene) {
            terrainScene.remove(previousDemo_DecoScene);
        }
    
        decoScene = T3_Scatter.ScatterMeshes(geo, {
            mesh: this.buildTree(),
            w: segments,
            h: Math.round(segments * settings["width:length ratio"]),
            spread: spread,
            smoothSpread: settings.scattering === "Linear" ? 0 : 0.2,
            randomness: randomness,
            maxSlope: 0.6283185307179586, // 36deg or 36 / 180 * Math.PI, about the angle of repose of earth
            maxTilt: 0.15707963267948966, //  9deg or  9 / 180 * Math.PI. Trees grow up regardless of slope but we can allow a small variation
        });
    
        decoScene.name = "decoScene";
    
        if (decoScene) {
            // decoScene.children[0] needs iteration
            // if (settings.texture == 'Wireframe') {
            //   decoScene.children[0].material = settings.mat;
            // }
            // else if (settings.texture == 'Grayscale') {
            //   decoScene.children[0].material = settings.gray;
            // }
            terrainScene.add(decoScene);
        }
    }
    
    static buildTree() {
        let green = new THREE.MeshLambertMaterial({ color: 0x2d4c1e });
    
        let c0 = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 12, 6, 1, true),
            new THREE.MeshLambertMaterial({ color: 0x3d2817 }) // brown
        );
        c0.position.setY(6);
    
        let c1 = new THREE.Mesh(new THREE.CylinderGeometry(0, 10, 14, 8), green);
        c1.position.setY(18);
        let c2 = new THREE.Mesh(new THREE.CylinderGeometry(0, 9, 13, 8), green);
        c2.position.setY(25);
        let c3 = new THREE.Mesh(new THREE.CylinderGeometry(0, 8, 12, 8), green);
        c3.position.setY(32);
    
        let s = new THREE.Object3D();
        s.add(c0);
        s.add(c1);
        s.add(c2);
        s.add(c3);
        s.scale.set(5, 1.25, 5);
    
        return s;
    }
}



