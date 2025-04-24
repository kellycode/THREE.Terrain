/**
 * A terrain object for use with the Three.js library.
 *
 *
 * @param {Object} [options]
 *   An optional map of settings that control how the terrain is constructed
 *   and displayed. Options include:
 *
 * 
 *   - `easing`: A function that affects the distribution of slopes by
 *     interpolating the height of each vertex along a curve. Valid values
 *     include `T3_Utility.Linear` (the default), `T3_Utility.EaseIn`,
 *     `T3_Utility.EaseOut`, `T3_Utility.EaseInOut`,
 *     `T3_Utility.InEaseOut`, and any custom function that accepts a float
 *     between 0 and 1 and returns a float between 0 and 1.
 * 
 * 
 *   - `frequency`: For terrain generation methods that support it (Perlin,
 *     Simplex, and Worley) the octave of randomness. This basically controls
 *     how big features of the terrain will be (higher frequencies result in
 *     smaller features). Often running multiple generation functions with
 *     different frequencies and heights results in nice detail, as
 *     the PerlinLayers and SimplexLayers methods demonstrate. (The counterpart
 *     to frequency, amplitude, is represented by the difference between the
 *     `maxHeight` and `minHeight` parameters.) Defaults to 2.5.
 * 
 * 
 *   - `heightmap`: Either a canvas or pre-loaded image (from the same domain
 *     as the webpage or served with a CORS-friendly header) representing
 *     terrain height data (lighter pixels are higher); or a function used to
 *     generate random height data for the terrain. Valid random functions are
 *     specified in `generators.js` (or custom functions with the same
 *     signature). Ideally heightmap images have the same number of pixels as
 *     the terrain has vertices, as determined by the `xSegments` and
 *     `ySegments` options, but this is not required. If the heightmap is a
 *     different size, vertex height values will be interpolated.) Defaults to
 *     `T3_Generators.DiamondSquare`.
 * 
 * 
 *   - `material`: a THREE.Material instance used to display the terrain.
 *     Defaults to `new THREE.MeshBasicMaterial({color: 0xee6633})`.
 * 
 * 
 *   - `maxHeight`: the highest point, in Three.js units, that a peak should
 *     reach. Defaults to 100. Setting to `undefined`, `null`, or `Infinity`
 *     removes the cap, but this is generally not recommended because many
 *     generators and filters require a vertical range. Instead, consider
 *     setting the `stretch` option to `false`.
 * 
 *   - `minHeight`: the lowest point, in Three.js units, that a valley should
 *     reach. Defaults to -100. Setting to `undefined`, `null`, or `-Infinity`
 *     removes the cap, but this is generally not recommended because many
 *     generators and filters require a vertical range. Instead, consider
 *     setting the `stretch` option to `false`.
 * 
 *   - `steps`: If this is a number above 1, the terrain will be paritioned
 *     into that many flat "steps," resulting in a blocky appearance. Defaults
 *     to 1.
 * 
 *   - `stretch`: Determines whether to stretch the heightmap across the
 *     maximum and minimum height range if the height range produced by the
 * 
 *     `heightmap` property is smaller. Defaults to true.
 * 
 *   - `turbulent`: Whether to perform a turbulence transformation. Defaults to
 *     false.
 * 
 *   - `xSegments`: The number of segments (rows) to divide the terrain plane
 *     into. (This basically determines how detailed the terrain is.) Defaults
 *     to 63.
 * 
 *   - `xSize`: The width of the terrain in Three.js units. Defaults to 1024.
 *     Rendering might be slightly faster if this is a multiple of
 *     `options.xSegments + 1`.
 * 
 *   - `ySegments`: The number of segments (columns) to divide the terrain
 *     plane into. (This basically determines how detailed the terrain is.)
 *     Defaults to 63.
 * 
 *   - `ySize`: The length of the terrain in Three.js units. Defaults to 1024.
 *     Rendering might be slightly faster if this is a multiple of
 *     `options.ySegments + 1`.
 */
import * as THREE from "three";
import { T3_Utility } from "./T3_Utility.js";
import { T3_Generators } from "./T3_Generators.js";
import { T3_Images } from "./T3_Images.js";

export class T3_TerrainCore {
    constructor() {
        if (this instanceof T3_TerrainCore) {
            throw Error("A static class cannot be instantiated.");
        }
    }

    static Terrain = function(options) {
        var defaultOptions = {
            easing: T3_Utility.Linear,
            heightmap: T3_Generators.DiamondSquare,
            material: null,
            maxHeight: 100,
            minHeight: -100,
            optimization: T3_Utility.NONE,
            frequency: 2.5,
            steps: 1,
            stretch: true,
            turbulent: false,
            xSegments: 63,
            xSize: 1024,
            ySegments: 63,
            ySize: 1024,
        };
    
        options = options || {};
    
        for (var opt in defaultOptions) {
            if (defaultOptions.hasOwnProperty(opt)) {
                options[opt] = typeof options[opt] === "undefined" ? defaultOptions[opt] : options[opt];
            }
        }
    
        options.material = options.material || new THREE.MeshBasicMaterial({ color: 0xee6633 });
    
        // Encapsulating the terrain in a parent object allows us the flexibility
        // to more easily have multiple meshes for optimization purposes.
        var scene = new THREE.Object3D();
    
        // Planes are initialized on the XY plane, so rotate the plane to make it lie flat.
        scene.rotation.x = -Math.PI/2;
    
        // Create the terrain mesh.
        var mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(options.xSize, options.ySize, options.xSegments, options.ySegments),
            options.material
        );
    
        // Assign elevation data to the terrain plane from a heightmap or function.
        var zs = T3_Utility.toArray1D(mesh.geometry.attributes.position.array);
    
        if (options.heightmap instanceof HTMLCanvasElement || options.heightmap instanceof Image) {
            T3_Images.fromHeightmap(zs, options);
        } else if (typeof options.heightmap === "function") {
            options.heightmap(zs, options);
        } else {
            console.warn("An invalid value was passed for `options.heightmap`: " + options.heightmap);
        }
    
        T3_Utility.fromArray1D(mesh.geometry.attributes.position.array, zs);
    
        T3_Utility.Normalize(mesh, options);
    
        // lod.addLevel(mesh, options.unit * 10 * Math.pow(2, lodLevel));
    
        scene.add(mesh);
    
        return scene;
    };
}

