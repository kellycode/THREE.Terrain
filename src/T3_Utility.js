import { T3_Filters } from "./T3_Filters.js";
import { T3_Images } from "./T3_Images.js";

export class T3_Utility {
    constructor() {
        if (this instanceof T3_Utility) {
            throw Error("A static class cannot be instantiated.");
        }
    }

    static NONE = 0;
    static GEOMIPMAP = 1;
    static GEOCLIPMAP = 2;
    static POLYGONREDUCTION = 3;

    /**
     * Normalize the terrain after applying a heightmap or filter.
     *
     * This applies turbulence, steps, and height clamping; calls the `after`
     * callback; updates normals and the bounding sphere; and marks vertices as
     * dirty.
     *
     * @param {THREE.Mesh} mesh
     *   The terrain mesh.
     * @param {Object} options
     *   A map of settings that control how the terrain is constructed and
     *   displayed.
     */
    static Normalize = function (mesh, options) {
        var zs = T3_Utility.toArray1D(mesh.geometry.attributes.position.array);
        if (options.turbulent) {
            T3_Filters.Turbulence(zs, options);
        }
        if (options.steps > 1) {
            T3_Filters.Step(zs, options.steps);
            T3_Filters.Smooth(zs, options);
        }

        // Keep the terrain within the allotted height range if necessary, and do easing.
        T3_Filters.Clamp(zs, options);

        // Call the "after" callback
        if (typeof options.after === "function") {
            options.after(zs, options);
        }
        T3_Utility.fromArray1D(mesh.geometry.attributes.position.array, zs);

        // Mark the geometry as having changed and needing updates.
        mesh.geometry.computeBoundingSphere();
        // three removed
        //mesh.geometry.computeFaceNormals();
        mesh.geometry.computeVertexNormals();
    };

    /**
     * Get a 2D array of heightmap values from a 1D array of Z-positions.
     *
     * @param {Float32Array} vertices
     *   A 1D array containing the vertex Z-positions of the geometry representing
     *   the terrain.
     * @param {Object} options
     *   A map of settings defining properties of the terrain. The only properties
     *   that matter here are `xSegments` and `ySegments`, which represent how many
     *   vertices wide and deep the terrain plane is, respectively (and therefore
     *   also the dimensions of the returned array).
     *
     * @return {Float32Array[]}
     *   A 2D array representing the terrain's heightmap.
     */
    static toArray2D = function (vertices, options) {
        var tgt = new Array(options.xSegments + 1),
            xl = options.xSegments + 1,
            yl = options.ySegments + 1,
            i,
            j;
        for (i = 0; i < xl; i++) {
            tgt[i] = new Float32Array(options.ySegments + 1);
            for (j = 0; j < yl; j++) {
                tgt[i][j] = vertices[j * xl + i];
            }
        }
        return tgt;
    };

    /**
     * Set the height of plane vertices from a 2D array of heightmap values.
     *
     * @param {Float32Array} vertices
     *   A 1D array containing the vertex Z-positions of the geometry representing
     *   the terrain.
     * @param {Number[][]} src
     *   A 2D array representing a heightmap to apply to the terrain.
     */
    static fromArray2D = function (vertices, src) {
        for (var i = 0, xl = src.length; i < xl; i++) {
            for (var j = 0, yl = src[i].length; j < yl; j++) {
                vertices[j * xl + i] = src[i][j];
            }
        }
    };

    /**
     * Get a 1D array of heightmap values from a 1D array of plane vertices.
     *
     * @param {Float32Array} vertices
     *   A 1D array containing the vertex positions of the geometry representing the
     *   terrain.
     * @param {Object} options
     *   A map of settings defining properties of the terrain. The only properties
     *   that matter here are `xSegments` and `ySegments`, which represent how many
     *   vertices wide and deep the terrain plane is, respectively (and therefore
     *   also the dimensions of the returned array).
     *
     * @return {Float32Array}
     *   A 1D array representing the terrain's heightmap.
     */
    static toArray1D = function (vertices) {
        var tgt = new Float32Array(vertices.length / 3);
        for (var i = 0, l = tgt.length; i < l; i++) {
            tgt[i] = vertices[i * 3 + 2];
        }
        return tgt;
    };

    /**
     * Set the height of plane vertices from a 1D array of heightmap values.
     *
     * @param {Float32Array} vertices
     *   A 1D array containing the vertex positions of the geometry representing the
     *   terrain.
     * @param {Number[]} src
     *   A 1D array representing a heightmap to apply to the terrain.
     */
    static fromArray1D = function (vertices, src) {
        for (var i = 0, l = Math.min(vertices.length / 3, src.length); i < l; i++) {
            vertices[i * 3 + 2] = src[i];
        }
    };

    /**
     * Generate a 1D array containing random heightmap data.
     *
     * This is like {@link T3_Images.toHeightmap} except that instead of
     * generating the Three.js mesh and material information you can just get the
     * height data.
     *
     * @param {Function} method
     *   The method to use to generate the heightmap data. Works with function that
     *   would be an acceptable value for the `heightmap` option for the
     *   {@link T3_TerrainCore.Terrain} function.
     * @param {Number} options
     *   The same as the options parameter for the {@link T3_TerrainCore.Terrain} function.
     */
    static heightmapArray = function (method, options) {
        var arr = new Array((options.xSegments + 1) * (options.ySegments + 1)),
            l = arr.length,
            i;
        arr.fill(0);
        options.minHeight = options.minHeight || 0;
        options.maxHeight = typeof options.maxHeight === "undefined" ? 1 : options.maxHeight;
        options.stretch = options.stretch || false;
        method(arr, options);
        T3_Filters.Clamp(arr, options);
        return arr;
    };

    /**
 * Randomness interpolation functions.
 */
static Linear = function (x) {
    return x;
};

// x = [0, 1], x^2
static EaseIn = function (x) {
    return x * x;
};

// x = [0, 1], -x(x-2)
static EaseOut = function (x) {
    return -x * (x - 2);
};

// x = [0, 1], x^2(3-2x)
// Nearly identical alternatives: 0.5+0.5*cos(x*pi-pi), x^a/(x^a+(1-x)^a) (where a=1.6 seems nice)
// For comparison: http://www.wolframalpha.com/input/?i=x^1.6%2F%28x^1.6%2B%281-x%29^1.6%29%2C+x^2%283-2x%29%2C+0.5%2B0.5*cos%28x*pi-pi%29+from+0+to+1
static EaseInOut = function (x) {
    return x * x * (3 - 2 * x);
};

// x = [0, 1], 0.5*(2x-1)^3+0.5
static InEaseOut = function (x) {
    var y = 2 * x - 1;
    return 0.5 * y * y * y + 0.5;
};

// x = [0, 1], x^1.55
static EaseInWeak = function (x) {
    return Math.pow(x, 1.55);
};

// x = [0, 1], x^7
static EaseInStrong = function (x) {
    return x * x * x * x * x * x * x;
};

}

