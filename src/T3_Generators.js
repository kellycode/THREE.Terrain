import * as THREE from "three";

import { T3_Noise } from "./T3_Noise.js";

export class T3_Generators {
    constructor() {
        if (this instanceof T3_Generators) {
            throw Error("A static class cannot be instantiated.");
        }
    }

    /**
     * A utility for generating heightmap functions by additive composition.
     *
     * @param {Float32Array} g
     *   The geometry's z-positions to modify with heightmap data.
     * 
     * @param {Object} [options]
     *   A map of settings that control how the terrain is constructed and
     *   displayed. Valid values are the same as those for the `options` parameter
     * 
     * @param {Object[]} passes
     *   Determines which heightmap functions to compose to create a new one.
     * 
     *   Consists of an array of objects with the following properties:
     *   - `method`: Contains something that will be passed around as an
     *     `options.heightmap` (a heightmap-generating function or a heightmap image)
     *   - `amplitude`: A multiplier for the heightmap of the pass. Applied before
     *     the result of the pass is added to the result of previous passes.
     *   - `frequency`: For terrain generation methods that support it (Perlin,
     *     Simplex, and Worley) the octave of randomness. This basically controls
     *     how big features of the terrain will be (higher frequencies result in
     *     smaller features). Often running multiple generation functions with
     *     different frequencies and amplitudes results in nice detail.
     */
    static MultiPass = function (g, options, passes) {
        let clonedOptions = {};

        for (let opt in options) {
            if (options.hasOwnProperty(opt)) {
                clonedOptions[opt] = options[opt];
            }
        }
        let range = options.maxHeight - options.minHeight;
        for (let i = 0, l = passes.length; i < l; i++) {
            let amp = typeof passes[i].amplitude === "undefined" ? 1 : passes[i].amplitude;
            let move = 0.5 * (range - range * amp);

            clonedOptions.maxHeight = options.maxHeight - move;
            clonedOptions.minHeight = options.minHeight + move;

            clonedOptions.frequency =
                typeof passes[i].frequency === "undefined" ? options.frequency : passes[i].frequency;

            passes[i].method(g, clonedOptions);
        }
    };

    /**
     * Generate random terrain using a curve.
     *
     * @param {Float32Array} g
     *   The geometry's z-positions to modify with heightmap data.
     * 
     * @param {Object} options
     *   A map of settings that control how the terrain is constructed and
     *   displayed. Valid values are the same as those for the `options` parameter
     * 
     * @param {Function} curve
     *   A function that takes an x- and y-coordinate and returns a z-coordinate.
     *   For example, `function(x, y) { return Math.sin(x*y*Math.PI*100); }`
     *   generates sine noise, and `function() { return Math.random(); }` sets the
     *   vertex elevations entirely randomly. The function's parameters (the x- and
     *   y-coordinates) are given as percentages of a phase (i.e. how far across
     *   the terrain in the relevant direction they are).
     */
    static Curve = function (g, options, curve) {
        let range = (options.maxHeight - options.minHeight) * 0.5;
        let scalar = options.frequency / (Math.min(options.xSegments, options.ySegments) + 1);

        for (let i = 0, xl = options.xSegments + 1, yl = options.ySegments + 1; i < xl; i++) {
            for (let j = 0; j < yl; j++) {
                g[j * xl + i] += curve(i * scalar, j * scalar) * range;
            }
        }
    };

    /**
     * Generate random terrain using the Cosine waves.
     *
     * Parameters are the same as those for {@link T3_Generators.DiamondSquare}.
     */
    static Cosine = function (g, options) {
        let amplitude = (options.maxHeight - options.minHeight) * 0.5;
        let frequencyScalar = (options.frequency * Math.PI) / (Math.min(options.xSegments, options.ySegments) + 1);
        let phase = Math.random() * Math.PI * 2;

        for (let i = 0, xl = options.xSegments + 1; i < xl; i++) {
            for (let j = 0, yl = options.ySegments + 1; j < yl; j++) {
                g[j * xl + i] +=
                    amplitude * (Math.cos(i * frequencyScalar + phase) + Math.cos(j * frequencyScalar + phase));
            }
        }
    };

    /**
     * Generate random terrain using layers of Cosine waves.
     *
     * Parameters are the same as those for {@link T3_Generators.DiamondSquare}.
     */
    static CosineLayers = function (g, options) {
        this.MultiPass(g, options, [
            { method: this.Cosine, frequency: 2.5 },
            { method: this.Cosine, amplitude: 0.1, frequency: 12 },
            { method: this.Cosine, amplitude: 0.05, frequency: 15 },
            { method: this.Cosine, amplitude: 0.025, frequency: 20 },
        ]);
    }.bind(this);

    /**
     * Generate random terrain using the Diamond-Square method.
     *
     * Based on https://github.com/srchea/Terrain-Generation/blob/master/js/classes/TerrainGeneration.js
     *
     * @param {Float32Array} g
     *   The geometry's z-positions to modify with heightmap data.
     * 
     * @param {Object} options
     *   A map of settings that control how the terrain is constructed and
     *   displayed. Valid values are the same as those for the `options` parameter
     */
    static ceilPowerOfTwo(n) {
        return Math.pow(2, Math.ceil(Math.log2(n)));
    }

    static DiamondSquare = function (g, options) {
        // Set the segment length to the smallest power of 2 that is greater than
        // the number of vertices in either dimension of the plane
        let segments = T3_Generators.ceilPowerOfTwo(Math.max(options.xSegments, options.ySegments) + 1);

        // Initialize heightmap
        let size = segments + 1;
        let heightmap = [];
        let smoothing = options.maxHeight - options.minHeight;
        let i;
        let j;
        let xl = options.xSegments + 1;
        let yl = options.ySegments + 1;

        for (i = 0; i <= segments; i++) {
            heightmap[i] = new Float64Array(segments + 1);
        }

        // Generate heightmap
        for (let l = segments; l >= 2; l /= 2) {
            let half = Math.round(l * 0.5);
            let whole = Math.round(l);
            let x;
            let y;
            let avg;
            let d;
            let e;

            smoothing /= 2;

            // square
            for (x = 0; x < segments; x += whole) {
                for (y = 0; y < segments; y += whole) {
                    d = Math.random() * smoothing * 2 - smoothing;
                    avg =
                        heightmap[x][y] + // top left
                        heightmap[x + whole][y] + // top right
                        heightmap[x][y + whole] + // bottom left
                        heightmap[x + whole][y + whole]; // bottom right
                    avg *= 0.25;
                    heightmap[x + half][y + half] = avg + d;
                }
            }

            // diamond
            for (x = 0; x < segments; x += half) {
                for (y = (x + half) % l; y < segments; y += l) {
                    d = Math.random() * smoothing * 2 - smoothing;
                    avg =
                        heightmap[(x - half + size) % size][y] + // middle left
                        heightmap[(x + half) % size][y] + // middle right
                        heightmap[x][(y + half) % size] + // middle top
                        heightmap[x][(y - half + size) % size]; // middle bottom
                    avg *= 0.25;
                    avg += d;
                    heightmap[x][y] = avg;
                    // top and right edges
                    if (x === 0) heightmap[segments][y] = avg;
                    if (y === 0) heightmap[x][segments] = avg;
                }
            }
        }

        // Apply heightmap
        for (i = 0; i < xl; i++) {
            for (j = 0; j < yl; j++) {
                g[j * xl + i] += heightmap[i][j];
            }
        }

        // T3_Filters.SmoothConservative(g, options);
    };

    /**
     * Generate random terrain using the Fault method.
     *
     * Based on http://www.lighthouse3d.com/opengl/terrain/index.php3?fault
     * Repeatedly draw random lines that cross the terrain. Raise the terrain on
     * one side of the line and lower it on the other.
     *
     * Parameters are the same as those for {@link T3_Generators.DiamondSquare}.
     */
    static Fault = function (g, options) {
        let d = Math.sqrt(options.xSegments * options.xSegments + options.ySegments * options.ySegments);
        let iterations = d * options.frequency;
        let range = (options.maxHeight - options.minHeight) * 0.5;
        let displacement = range / iterations;
        let smoothDistance =
                Math.min(options.xSize / options.xSegments, options.ySize / options.ySegments) * options.frequency;

        for (let k = 0; k < iterations; k++) {
            let v = Math.random();
            let a = Math.sin(v * Math.PI * 2);
            let b = Math.cos(v * Math.PI * 2);
            let c = Math.random() * d - d * 0.5;

            for (let i = 0, xl = options.xSegments + 1; i < xl; i++) {
                for (let j = 0, yl = options.ySegments + 1; j < yl; j++) {
                    let distance = a * i + b * j - c;
                    if (distance > smoothDistance) {
                        g[j * xl + i] += displacement;
                    } else if (distance < -smoothDistance) {
                        g[j * xl + i] -= displacement;
                    } else {
                        g[j * xl + i] += Math.cos((distance / smoothDistance) * Math.PI * 2) * displacement;
                    }
                }
            }
        }
        // T3_Filters.Smooth(g, options);
    };

    /**
     * Generate random terrain using the Hill method.
     *
     * The basic approach is to repeatedly pick random points on or near the
     * terrain and raise a small hill around those points. Those small hills
     * eventually accumulate into large hills with distinct features.
     *
     * @param {Float32Array} g
     *   The geometry's z-positions to modify with heightmap data.
     * @param {Object} options
     *   A map of settings that control how the terrain is constructed and
     *   displayed. Valid values are the same as those for the `options` parameter
     * 
     * @param {Function} [feature=T3_Influences.Influences.Hill]
     *   A function describing the feature to raise at the randomly chosen points.
     *   Typically this is a hill shape so that the accumulated features result in
     *   something resembling mountains, but it could be any function that accepts
     *   one parameter representing the distance from the feature's origin
     *   expressed as a number between -1 and 1 inclusive. Optionally it can accept
     *   a second and third parameter, which are the x- and y- distances from the
     *   feature's origin, respectively. It should return a number between -1 and 1
     *   representing the height of the feature at the given coordinate.
     *   `T3_Influences.Influences` contains some useful functions for this
     *   purpose.
     * 
     * @param {Function} [shape]
     *   A function that takes an object with `x` and `y` properties consisting of
     *   uniform random variables from 0 to 1, and returns a number from 0 to 1,
     *   typically by transforming it over a distribution. The result affects where
     *   small hills are raised thereby affecting the overall shape of the terrain.
     */
    static Hill = function (g, options, feature, shape) {
        let frequency = options.frequency * 2;
        let numFeatures = frequency * frequency * 10;
        let heightRange = options.maxHeight - options.minHeight;
        let minHeight = heightRange / (frequency * frequency);
        let maxHeight = heightRange / frequency;
        let smallerSideLength = Math.min(options.xSize, options.ySize);
        let minRadius = smallerSideLength / (frequency * frequency);
        let maxRadius = smallerSideLength / frequency;

        feature = feature || T3_Influences.Influences.Hill;

        let coords = { x: 0, y: 0 };

        for (let i = 0; i < numFeatures; i++) {
            let radius = Math.random() * (maxRadius - minRadius) + minRadius;
            let height = Math.random() * (maxHeight - minHeight) + minHeight;

            let min = 0 - radius;
            let maxX = options.xSize + radius;
            let maxY = options.ySize + radius;

            coords.x = Math.random();
            coords.y = Math.random();

            if (typeof shape === "function") shape(coords);

            T3_Influences.Influence(
                g,
                options,
                feature,
                coords.x,
                coords.y,
                radius,
                height,
                THREE.AdditiveBlending,
                T3_Utility.EaseInStrong
            );
        }
    };

    /**
     * Generate random terrain using the Hill method, centered on the terrain.
     *
     * The only difference between this and the Hill method is that the locations
     * of the points to place small hills are not uniformly randomly distributed
     * but instead are more likely to occur close to the center of the terrain.
     *
     * @param {Float32Array} g
     *   The geometry's z-positions to modify with heightmap data.
     * 
     * @param {Object} options
     *   A map of settings that control how the terrain is constructed and
     *   displayed. Valid values are the same as those for the `options` parameter
     * 
     * @param {Function} [feature=T3_Influences.Influences.Hill]
     *   A function describing the feature. The function should accept one
     *   parameter representing the distance from the feature's origin expressed as
     *   a number between -1 and 1 inclusive. Optionally it can accept a second and
     *   third parameter, which are the x- and y- distances from the feature's
     *   origin, respectively. It should return a number between -1 and 1
     *   representing the height of the feature at the given coordinate.
     *   `T3_Influences.Influences` contains some useful functions for this
     *   purpose.
     */
    static HillIsland = (function () {
        let island = function (coords) {
            let theta = Math.random() * Math.PI * 2;
            coords.x = 0.5 + Math.cos(theta) * coords.x * 0.4;
            coords.y = 0.5 + Math.sin(theta) * coords.y * 0.4;
        };
        return function (g, options, feature) {
            this.Hill(g, options, feature, island);
        };
    })();

    /**
     * Deposit a particle at a vertex.
     */
    static deposit = function (g, i, j, xl, displacement) {
        let currentKey = j * xl + i;
        // Pick a random neighbor.
        for (let k = 0; k < 3; k++) {
            let r = Math.floor(Math.random() * 8);
            switch (r) {
                case 0:
                    i++;
                    break;
                case 1:
                    i--;
                    break;
                case 2:
                    j++;
                    break;
                case 3:
                    j--;
                    break;
                case 4:
                    i++;
                    j++;
                    break;
                case 5:
                    i++;
                    j--;
                    break;
                case 6:
                    i--;
                    j++;
                    break;
                case 7:
                    i--;
                    j--;
                    break;
            }
            let neighborKey = j * xl + i;
            // If the neighbor is lower, move the particle to that neighbor and re-evaluate.
            if (typeof g[neighborKey] !== "undefined") {
                if (g[neighborKey] < g[currentKey]) {
                    T3_Generators.deposit(g, i, j, xl, displacement);
                    return;
                }
            }
            // Deposit some particles on the edge.
            else if (Math.random() < 0.2) {
                g[currentKey] += displacement;
                return;
            }
        }
        g[currentKey] += displacement;
    };

    /**
     * Generate random terrain using the Particle Deposition method.
     *
     * Based on http://www.lighthouse3d.com/opengl/terrain/index.php?particle
     * Repeatedly deposit particles on terrain vertices. Pick a random neighbor
     * of that vertex. If the neighbor is lower, roll the particle to the
     * neighbor. When the particle stops, displace the vertex upwards.
     *
     * The shape of the outcome is highly dependent on options.frequency
     * because that affects how many particles will be dropped. Values around
     * 0.25 generally result in archipelagos whereas the default of 2.5
     * generally results in one large mountainous island.
     *
     * Parameters are the same as those for {@link T3_Generators.DiamondSquare}.
     */
    static Particles = function (g, options) {
        let iterations =
                Math.sqrt(options.xSegments * options.xSegments + options.ySegments * options.ySegments) *
                options.frequency *
                300;
            let xl = options.xSegments + 1;
            let displacement = ((options.maxHeight - options.minHeight) / iterations) * 1000;
            let i = Math.floor(Math.random() * options.xSegments);
            let j = Math.floor(Math.random() * options.ySegments);
            let xDeviation = Math.random() * 0.2 - 0.1;
            let yDeviation = Math.random() * 0.2 - 0.1;

        for (let k = 0; k < iterations; k++) {
            T3_Generators.deposit(g, i, j, xl, displacement);
            let d = Math.random() * Math.PI * 2;

            if (k % 1000 === 0) {
                xDeviation = Math.random() * 0.2 - 0.1;
                yDeviation = Math.random() * 0.2 - 0.1;
            }

            if (k % 100 === 0) {
                i = Math.floor(
                    options.xSegments * (0.5 + xDeviation) +
                        Math.cos(d) * Math.random() * options.xSegments * (0.5 - Math.abs(xDeviation))
                );
                j = Math.floor(
                    options.ySegments * (0.5 + yDeviation) +
                        Math.sin(d) * Math.random() * options.ySegments * (0.5 - Math.abs(yDeviation))
                );
            }
        }
        // Filters.Smooth(g, options, 3);
    };

    /**
     * Generate random terrain using the Perlin Noise method.
     *
     * Parameters are the same as those for {@link T3_Generators.DiamondSquare}.
     */
    static Perlin = function (g, options) {
        T3_Noise.seed(Math.random());
        let range = (options.maxHeight - options.minHeight) * 0.5;
        let divisor = (Math.min(options.xSegments, options.ySegments) + 1) / options.frequency;

        for (let i = 0, xl = options.xSegments + 1; i < xl; i++) {
            for (let j = 0, yl = options.ySegments + 1; j < yl; j++) {
                g[j * xl + i] += T3_Noise.perlin(i / divisor, j / divisor) * range;
            }
        }
    };

    /**
     * Generate random terrain using the Perlin and Diamond-Square methods composed.
     *
     * Parameters are the same as those for {@link T3_Generators.DiamondSquare}.
     */
    static PerlinDiamond = function (g, options) {
        this.MultiPass(g, options, [
            { method: this.Perlin },
            { method: this.DiamondSquare, amplitude: 0.75 },
            {
                method: function (g, o) {
                    return T3_Filters.SmoothMedian(g, o);
                },
            },
        ]);
    }.bind(this);

    /**
     * Generate random terrain using layers of Perlin noise.
     *
     * Parameters are the same as those for {@link T3_Generators.DiamondSquare}.
     */
    static PerlinLayers = function (g, options) {
        this.MultiPass(g, options, [
            { method: this.Perlin, frequency: 1.25 },
            { method: this.Perlin, amplitude: 0.05, frequency: 2.5 },
            { method: this.Perlin, amplitude: 0.35, frequency: 5 },
            { method: this.Perlin, amplitude: 0.15, frequency: 10 },
        ]);
    }.bind(this);

    /**
     * Generate random terrain using the Simplex Noise method.
     *
     * Parameters are the same as those for {@link T3_Generators.DiamondSquare}.
     *
     * See https://github.com/mrdoob/three.js/blob/master/examples/webgl_terrain_dynamic.html
     * for an interesting comparison where the generation happens in GLSL.
     */
    static Simplex = function (g, options) {
        T3_Noise.seed(Math.random());
        let range = (options.maxHeight - options.minHeight) * 0.5;
        let divisor = ((Math.min(options.xSegments, options.ySegments) + 1) * 2) / options.frequency;
        for (let i = 0, xl = options.xSegments + 1; i < xl; i++) {
            for (let j = 0, yl = options.ySegments + 1; j < yl; j++) {
                g[j * xl + i] += T3_Noise.simplex(i / divisor, j / divisor) * range;
            }
        }
    };

    /**
     * Generate random terrain using layers of Simplex noise.
     *
     * Parameters are the same as those for {@link T3_Generators.DiamondSquare}.
     */
    static SimplexLayers = function (g, options) {
        this.MultiPass(g, options, [
            { method: this.Simplex, frequency: 1.25 },
            { method: this.Simplex, amplitude: 0.5, frequency: 2.5 },
            { method: this.Simplex, amplitude: 0.25, frequency: 5 },
            { method: this.Simplex, amplitude: 0.125, frequency: 10 },
            { method: this.Simplex, amplitude: 0.0625, frequency: 20 },
        ]);
    }.bind(this);

    /**
     * Generate a heightmap using white noise.
     *
     * @param {THREE.Vector3[]} g The terrain vertices.
     * @param {Object} options Settings
     * @param {Number} scale The resolution of the resulting heightmap.
     * @param {Number} segments The width of the target heightmap.
     * @param {Number} range The altitude of the noise.
     * @param {Number[]} data The target heightmap.
     */
    static WhiteNoise = function (g, options, scale, segments, range, data) {
        if (scale > segments) return;
        let i = 0;
        let j = 0;
        let xl = segments;
        let yl = segments;
        let inc = Math.floor(segments / scale);
        let lastX = -inc;
        let lastY = -inc;

        // Walk over the target. For a target of size W and a resolution of N,
        // set every W/N points (in both directions).
        for (i = 0; i <= xl; i += inc) {
            for (j = 0; j <= yl; j += inc) {
                let k = j * xl + i;

                data[k] = Math.random() * range;

                if (lastX < 0 && lastY < 0) continue;

                // jscs:disable disallowSpacesInsideBrackets
                /* c b *
                 * l t */
                let t = data[k];
                let l = data[j * xl + (i - inc)] || t; // left
                let b = data[(j - inc) * xl + i] || t; // bottom
                let c = data[(j - inc) * xl + (i - inc)] || t; // corner

                // jscs:enable disallowSpacesInsideBrackets
                // Interpolate between adjacent points to set the height of
                // higher-resolution target data.
                for (let x = lastX; x < i; x++) {
                    for (let y = lastY; y < j; y++) {
                        if (x === lastX && y === lastY) continue;

                        let z = y * xl + x;

                        if (z < 0) continue;

                        let px = (x - lastX) / inc;
                        let py = (y - lastY) / inc;
                        let r1 = px * b + (1 - px) * c;
                        let r2 = px * t + (1 - px) * l;
                        data[z] = py * r2 + (1 - py) * r1;
                    }
                }
                lastY = j;
            }
            lastX = i;
            lastY = -inc;
        }
        // Assign the temporary data back to the actual terrain heightmap.
        for (i = 0, xl = options.xSegments + 1; i < xl; i++) {
            for (j = 0, yl = options.ySegments + 1; j < yl; j++) {
                // http://stackoverflow.com/q/23708306/843621
                let kg = j * xl + i;
                let kd = j * segments + i;
                g[kg] += data[kd];
            }
        }
    };

    /**
     * Generate random terrain using value noise.
     *
     * The basic approach of value noise is to generate white noise at a
     * smaller octave than the target and then interpolate to get a higher-
     * resolution result. This is then repeated at different resolutions.
     *
     * Parameters are the same as those for {@link T3_Generators.DiamondSquare}.
     */
    static Value = function (g, options) {
        // Set the segment length to the smallest power of 2 that is greater
        // than the number of vertices in either dimension of the plane
        let segments = T3_Generators.ceilPowerOfTwo(Math.max(options.xSegments, options.ySegments) + 1);

        // Store the array of white noise outside of the WhiteNoise function to
        // avoid allocating a bunch of unnecessary arrays; we can just
        // overwrite old data each time WhiteNoise() is called.
        let data = new Float64Array((segments + 1) * (segments + 1));

        // Layer white noise at different resolutions.
        let range = options.maxHeight - options.minHeight;

        for (let i = 2; i < 7; i++) {
            T3_Generators.WhiteNoise(g, options, Math.pow(2, i), segments, range * Math.pow(2, 2.4 - i * 1.2), data);
        }

        // White noise creates some weird artifacts; fix them.
        // Filters.Smooth(g, options, 1);
        T3_Filters.Clamp(g, {
            maxHeight: options.maxHeight,
            minHeight: options.minHeight,
            stretch: true,
        });
    };

    /**
     * Generate random terrain using Weierstrass functions.
     *
     * Weierstrass functions are known for being continuous but not differentiable
     * anywhere. This produces some nice shapes that look terrain-like, but can
     * look repetitive from above.
     *
     * Parameters are the same as those for {@link T3_Generators.DiamondSquare}.
     */
    static Weierstrass = function (g, options) {
        let range = (options.maxHeight - options.minHeight) * 0.5;
        let dir1 = Math.random() < 0.5 ? 1 : -1;
        let dir2 = Math.random() < 0.5 ? 1 : -1;
        let r11 = 0.5 + Math.random() * 1.0;
        let r12 = 0.5 + Math.random() * 1.0;
        let r13 = 0.025 + Math.random() * 0.1;
        let r14 = -1.0 + Math.random() * 2.0;
        let r21 = 0.5 + Math.random() * 1.0;
        let r22 = 0.5 + Math.random() * 1.0;
        let r23 = 0.025 + Math.random() * 0.1;
        let r24 = -1.0 + Math.random() * 2.0;

        for (let i = 0, xl = options.xSegments + 1; i < xl; i++) {
            for (let j = 0, yl = options.ySegments + 1; j < yl; j++) {
                let sum = 0;
                for (let k = 0; k < 20; k++) {
                    let x =
                        Math.pow(1 + r11, -k) *
                        Math.sin(Math.pow(1 + r12, k) * (i + 0.25 * Math.cos(j) + r14 * j) * r13);
                    let y =
                        Math.pow(1 + r21, -k) *
                        Math.sin(Math.pow(1 + r22, k) * (j + 0.25 * Math.cos(i) + r24 * i) * r23);
                    sum -= Math.exp(dir1 * x * x + dir2 * y * y);
                }
                g[j * xl + i] += sum * range;
            }
        }
        T3_Filters.Clamp(g, options);
    };
}
