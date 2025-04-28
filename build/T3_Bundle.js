/**
 * THREE.Terrain.js 2.0.0-20250428
 *
 * @author Isaac Sukin (http://www.isaacsukin.com/)
 * @license MIT
 */

import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";




/**
 * Generate random terrain using Brownian motion.
 *
 * Note that this method takes a particularly long time to run (a few seconds).
 *
 * Parameters are the same as those for {@link THREE.Terrain.DiamondSquare}.
 */

export class T3_Brownian {
    constructor() {
        if (this instanceof T3_Brownian) {
            throw Error("A static class cannot be instantiated.");
        }
    }

    static Brownian = function (g, options) {
        var untouched = [],
            touched = [],
            smallerSideSize = Math.min(options.xSize, options.ySize),
            changeDirectionProbability = Math.sqrt(smallerSideSize) / smallerSideSize,
            maxHeightAdjust = Math.sqrt(options.maxHeight - options.minHeight),
            xl = options.xSegments + 1,
            yl = options.ySegments + 1,
            i = Math.floor(Math.random() * options.xSegments),
            j = Math.floor(Math.random() * options.ySegments),
            x = i,
            y = j,
            numVertices = g.length,
            vertices = Array.from(g).map(function (z) {
                return { z: z };
            }),
            current = vertices[j * xl + i],
            randomDirection = Math.random() * Math.PI * 2,
            addX = Math.cos(randomDirection),
            addY = Math.sin(randomDirection),
            n,
            m,
            key,
            sum,
            c,
            lastAdjust,
            index;

        // Initialize the first vertex.
        current.z = Math.random() * (options.maxHeight - options.minHeight) + options.minHeight;
        touched.push(current);

        // Walk through all vertices until they've all been adjusted.
        while (touched.length !== numVertices) {
            // Mark the untouched neighboring vertices to revisit later.
            for (n = -1; n <= 1; n++) {
                for (m = -1; m <= 1; m++) {
                    key = (j + n) * xl + i + m;
                    if (
                        typeof vertices[key] !== "undefined" &&
                        touched.indexOf(vertices[key]) === -1 &&
                        i + m >= 0 &&
                        j + n >= 0 &&
                        i + m < xl &&
                        j + n < yl &&
                        n &&
                        m
                    ) {
                        untouched.push(vertices[key]);
                    }
                }
            }

            // Occasionally, pick a random untouched point instead of continuing.
            if (Math.random() < changeDirectionProbability) {
                current = untouched.splice(Math.floor(Math.random() * untouched.length), 1)[0];
                randomDirection = Math.random() * Math.PI * 2;
                addX = Math.cos(randomDirection);
                addY = Math.sin(randomDirection);
                index = vertices.indexOf(current);
                i = index % xl;
                j = Math.floor(index / xl);
                x = i;
                y = j;
            } else {
                // Keep walking in the current direction.
                var u = x,
                    v = y;
                while (Math.round(u) === i && Math.round(v) === j) {
                    u += addX;
                    v += addY;
                }
                i = Math.round(u);
                j = Math.round(u);

                // If we hit a touched vertex, look in different directions to try to find an untouched one.
                for (
                    var k = 0;
                    i >= 0 && j >= 0 && i < xl && j < yl && touched.indexOf(vertices[j * xl + i]) !== -1 && k < 9;
                    k++
                ) {
                    randomDirection = Math.random() * Math.PI * 2;
                    addX = Math.cos(randomDirection);
                    addY = Math.sin(randomDirection);
                    while (Math.round(u) === i && Math.round(v) === j) {
                        u += addX;
                        v += addY;
                    }
                    i = Math.round(u);
                    j = Math.round(v);
                }

                // If we found an untouched vertex, make it the current one.
                if (i >= 0 && j >= 0 && i < xl && j < yl && touched.indexOf(vertices[j * xl + i]) === -1) {
                    x = u;
                    y = v;
                    current = vertices[j * xl + i];
                    var io = untouched.indexOf(current);
                    if (io !== -1) {
                        untouched.splice(io, 1);
                    }
                }

                // If we couldn't find an untouched vertex near the current point,
                // pick a random untouched vertex instead.
                else {
                    current = untouched.splice(Math.floor(Math.random() * untouched.length), 1)[0];
                    randomDirection = Math.random() * Math.PI * 2;
                    addX = Math.cos(randomDirection);
                    addY = Math.sin(randomDirection);
                    index = vertices.indexOf(current);
                    i = index % xl;
                    j = Math.floor(index / xl);
                    x = i;
                    y = j;
                }
            }

            // Set the current vertex to the average elevation of its touched neighbors plus a random amount
            sum = 0;
            c = 0;
            for (n = -1; n <= 1; n++) {
                for (m = -1; m <= 1; m++) {
                    key = (j + n) * xl + i + m;
                    if (
                        typeof vertices[key] !== "undefined" &&
                        touched.indexOf(vertices[key]) !== -1 &&
                        i + m >= 0 &&
                        j + n >= 0 &&
                        i + m < xl &&
                        j + n < yl &&
                        n &&
                        m
                    ) {
                        sum += vertices[key].z;
                        c++;
                    }
                }
            }
            if (c) {
                if (!lastAdjust || Math.random() < changeDirectionProbability) {
                    lastAdjust = Math.random();
                }
                current.z = sum / c + THREE.Terrain.EaseInWeak(lastAdjust) * maxHeightAdjust * 2 - maxHeightAdjust;
            }
            touched.push(current);
        }

        for (i = vertices.length - 1; i >= 0; i--) {
            g[i] = vertices[i].z;
        }

        // Erase artifacts.
        T3_Filters.Smooth(g, options);
        T3_Filters.Smooth(g, options);
    };
}



export class T3_Filters {
    constructor() {
        if (this instanceof T3_Filters) {
            throw Error("A static class cannot be instantiated.");
        }
    }

    /**
     * Rescale the heightmap of a terrain to keep it within the maximum range.
     *
     * @param {Float32Array} g
     *   The geometry's z-positions to modify with heightmap data.
     * @param {Object} options
     *   A map of settings that control how the terrain is constructed and
     *   displayed. Valid values are the same as those for the `options` parameter
     *   of {@link T3_TerrainCore}() but only `maxHeight`, `minHeight`, and `easing`
     *   are used.
     */
    static Clamp = function (g, options) {
        var min = Infinity,
            max = -Infinity,
            l = g.length,
            i;
        options.easing = options.easing || T3_Utility.Linear;
        for (i = 0; i < l; i++) {
            if (g[i] < min) min = g[i];
            if (g[i] > max) max = g[i];
        }
        var actualRange = max - min,
            optMax = typeof options.maxHeight !== "number" ? max : options.maxHeight,
            optMin = typeof options.minHeight !== "number" ? min : options.minHeight,
            targetMax = options.stretch ? optMax : max < optMax ? max : optMax,
            targetMin = options.stretch ? optMin : min > optMin ? min : optMin,
            range = targetMax - targetMin;
        if (targetMax < targetMin) {
            targetMax = optMax;
            range = targetMax - targetMin;
        }
        for (i = 0; i < l; i++) {
            g[i] = options.easing((g[i] - min) / actualRange) * range + optMin;
        }
    };

    /**
     * Move the edges of the terrain up or down based on distance from the edge.
     *
     * Useful to make islands or enclosing walls/cliffs.
     *
     * @param {Float32Array} g
     *   The geometry's z-positions to modify with heightmap data.
     * @param {Object} options
     *   A map of settings that control how the terrain is constructed and
     *   displayed. Valid values are the same as those for the `options` parameter
     *   of {@link T3_TerrainCore.Terrain}().
     * @param {Boolean} direction
     *   `true` if the edges should be turned up; `false` if they should be turned
     *   down.
     * @param {Number} distance
     *   The distance from the edge at which the edges should begin to be affected
     *   by this operation.
     * @param {Number/Function} [e=T3_Utility.EaseInOut]
     *   A function that determines how quickly the terrain will transition between
     *   its current height and the edge shape as distance to the edge decreases.
     *   It does this by interpolating the height of each vertex along a curve.
     *   Valid values include `T3_Utility.Linear`, `T3_Utility.EaseIn`,
     *   `T3_Utility.EaseOut`, `T3_Utility.EaseInOut`,
     *   `T3_Utility.InEaseOut`, and any custom function that accepts a float
     *   between 0 and 1 and returns a float between 0 and 1.
     * @param {Object} [edges={top: true, bottom: true, left: true, right: true}]
     *   Determines which edges should be affected by this function. Defaults to
     *   all edges. If passed, should be an object with `top`, `bottom`, `left`,
     *   and `right` Boolean properties specifying which edges to affect.
     */
    static Edges = function (g, options, direction, distance, easing, edges) {
        var numXSegments = Math.floor(distance / (options.xSize / options.xSegments)) || 1,
            numYSegments = Math.floor(distance / (options.ySize / options.ySegments)) || 1,
            peak = direction ? options.maxHeight : options.minHeight,
            max = direction ? Math.max : Math.min,
            xl = options.xSegments + 1,
            yl = options.ySegments + 1,
            i,
            j,
            multiplier,
            k1,
            k2;
        easing = easing || T3_Utility.EaseInOut;
        if (typeof edges !== "object") {
            edges = { top: true, bottom: true, left: true, right: true };
        }
        for (i = 0; i < xl; i++) {
            for (j = 0; j < numYSegments; j++) {
                multiplier = easing(1 - j / numYSegments);
                k1 = j * xl + i;
                k2 = (options.ySegments - j) * xl + i;
                if (edges.top) {
                    g[k1] = max(g[k1], (peak - g[k1]) * multiplier + g[k1]);
                }
                if (edges.bottom) {
                    g[k2] = max(g[k2], (peak - g[k2]) * multiplier + g[k2]);
                }
            }
        }
        for (i = 0; i < yl; i++) {
            for (j = 0; j < numXSegments; j++) {
                multiplier = easing(1 - j / numXSegments);
                k1 = i * xl + j;
                k2 = (options.ySegments - i) * xl + (options.xSegments - j);
                if (edges.left) {
                    g[k1] = max(g[k1], (peak - g[k1]) * multiplier + g[k1]);
                }
                if (edges.right) {
                    g[k2] = max(g[k2], (peak - g[k2]) * multiplier + g[k2]);
                }
            }
        }
        this.Clamp(g, {
            maxHeight: options.maxHeight,
            minHeight: options.minHeight,
            stretch: true,
        });
    }.bind(this);

    /**
     * Move the edges of the terrain up or down based on distance from the center.
     *
     * Useful to make islands or enclosing walls/cliffs.
     *
     * @param {Float32Array} g
     *   The geometry's z-positions to modify with heightmap data.
     * @param {Object} options
     *   A map of settings that control how the terrain is constructed and
     *   displayed. Valid values are the same as those for the `options` parameter
     * @param {Boolean} direction
     *   `true` if the edges should be turned up; `false` if they should be turned
     *   down.
     * @param {Number} distance
     *   The distance from the center at which the edges should begin to be
     *   affected by this operation.
     * @param {Number/Function} [e=T3_Utility.EaseInOut]
     *   A function that determines how quickly the terrain will transition between
     *   its current height and the edge shape as distance to the edge decreases.
     *   It does this by interpolating the height of each vertex along a curve.
     *   Valid values include `T3_Utility.Linear`, `T3_Utility.EaseIn`,
     *   `T3_Utility.EaseOut`, `T3_Utility.EaseInOut`,
     *   `T3_Utility.InEaseOut`, and any custom function that accepts a float
     *   between 0 and 1 and returns a float between 0 and 1.
     */
    static RadialEdges = function (g, options, direction, distance, easing) {
        var peak = direction ? options.maxHeight : options.minHeight,
            max = direction ? Math.max : Math.min,
            xl = options.xSegments + 1,
            yl = options.ySegments + 1,
            xl2 = xl * 0.5,
            yl2 = yl * 0.5,
            xSegmentSize = options.xSize / options.xSegments,
            ySegmentSize = options.ySize / options.ySegments,
            edgeRadius = Math.min(options.xSize, options.ySize) * 0.5 - distance,
            i,
            j,
            multiplier,
            k,
            vertexDistance;
        for (i = 0; i < xl; i++) {
            for (j = 0; j < yl2; j++) {
                k = j * xl + i;
                vertexDistance = Math.min(
                    edgeRadius,
                    Math.sqrt(
                        (xl2 - i) * xSegmentSize * (xl2 - i) * xSegmentSize +
                            (yl2 - j) * ySegmentSize * (yl2 - j) * ySegmentSize
                    ) - distance
                );
                if (vertexDistance < 0) continue;
                multiplier = easing(vertexDistance / edgeRadius);
                g[k] = max(g[k], (peak - g[k]) * multiplier + g[k]);
                // Use symmetry to reduce the number of iterations.
                k = (options.ySegments - j) * xl + i;
                g[k] = max(g[k], (peak - g[k]) * multiplier + g[k]);
            }
        }
    };

    /**
     * Smooth the terrain by setting each point to the mean of its neighborhood.
     *
     * @param {Float32Array} g
     *   The geometry's z-positions to modify with heightmap data.
     * @param {Object} options
     *   A map of settings that control how the terrain is constructed and
     *   displayed. Valid values are the same as those for the `options` parameter
     * @param {Number} [weight=0]
     *   How much to weight the original vertex height against the average of its
     *   neighbors.
     */
    static Smooth = function (g, options, weight) {
        var heightmap = new Float32Array(g.length);
        for (var i = 0, xl = options.xSegments + 1, yl = options.ySegments + 1; i < xl; i++) {
            for (var j = 0; j < yl; j++) {
                var sum = 0,
                    c = 0;
                for (var n = -1; n <= 1; n++) {
                    for (var m = -1; m <= 1; m++) {
                        var key = (j + n) * xl + i + m;
                        if (typeof g[key] !== "undefined" && i + m >= 0 && j + n >= 0 && i + m < xl && j + n < yl) {
                            sum += g[key];
                            c++;
                        }
                    }
                }
                heightmap[j * xl + i] = sum / c;
            }
        }
        weight = weight || 0;
        var w = 1 / (1 + weight);
        for (var k = 0, l = g.length; k < l; k++) {
            g[k] = (heightmap[k] + g[k] * weight) * w;
        }
    };

    /**
     * Smooth the terrain by setting each point to the median of its neighborhood.
     *
     * @param {Float32Array} g
     *   The geometry's z-positions to modify with heightmap data.
     * @param {Object} options
     *   A map of settings that control how the terrain is constructed and
     *   displayed. Valid values are the same as those for the `options` parameter
     */
    static SmoothMedian = function (g, options) {
        var heightmap = new Float32Array(g.length),
            neighborValues = [],
            neighborKeys = [],
            sortByValue = function (a, b) {
                return neighborValues[a] - neighborValues[b];
            };
        for (var i = 0, xl = options.xSegments + 1, yl = options.ySegments + 1; i < xl; i++) {
            for (var j = 0; j < yl; j++) {
                neighborValues.length = 0;
                neighborKeys.length = 0;
                for (var n = -1; n <= 1; n++) {
                    for (var m = -1; m <= 1; m++) {
                        var key = (j + n) * xl + i + m;
                        if (typeof g[key] !== "undefined" && i + m >= 0 && j + n >= 0 && i + m < xl && j + n < yl) {
                            neighborValues.push(g[key]);
                            neighborKeys.push(key);
                        }
                    }
                }
                neighborKeys.sort(sortByValue);
                var halfKey = Math.floor(neighborKeys.length * 0.5),
                    median;
                if (neighborKeys.length % 2 === 1) {
                    median = g[neighborKeys[halfKey]];
                } else {
                    median = (g[neighborKeys[halfKey - 1]] + g[neighborKeys[halfKey]]) * 0.5;
                }
                heightmap[j * xl + i] = median;
            }
        }
        for (var k = 0, l = g.length; k < l; k++) {
            g[k] = heightmap[k];
        }
    };

    /**
     * Smooth the terrain by clamping each point within its neighbors' extremes.
     *
     * @param {Float32Array} g
     *   The geometry's z-positions to modify with heightmap data.
     * @param {Object} options
     *   A map of settings that control how the terrain is constructed and
     *   displayed. Valid values are the same as those for the `options` parameter
     * @param {Number} [multiplier=1]
     *   By default, this filter clamps each point within the highest and lowest
     *   value of its neighbors. This parameter is a multiplier for the range
     *   outside of which the point will be clamped. Higher values mean that the
     *   point can be farther outside the range of its neighbors.
     */
    static SmoothConservative = function (g, options, multiplier) {
        var heightmap = new Float32Array(g.length);
        for (var i = 0, xl = options.xSegments + 1, yl = options.ySegments + 1; i < xl; i++) {
            for (var j = 0; j < yl; j++) {
                var max = -Infinity,
                    min = Infinity;
                for (var n = -1; n <= 1; n++) {
                    for (var m = -1; m <= 1; m++) {
                        var key = (j + n) * xl + i + m;
                        if (
                            typeof g[key] !== "undefined" &&
                            n &&
                            m &&
                            i + m >= 0 &&
                            j + n >= 0 &&
                            i + m < xl &&
                            j + n < yl
                        ) {
                            if (g[key] < min) min = g[key];
                            if (g[key] > max) max = g[key];
                        }
                    }
                }
                var kk = j * xl + i;
                if (typeof multiplier === "number") {
                    var halfdiff = (max - min) * 0.5,
                        middle = min + halfdiff;
                    max = middle + halfdiff * multiplier;
                    min = middle - halfdiff * multiplier;
                }
                heightmap[kk] = g[kk] > max ? max : g[kk] < min ? min : g[kk];
            }
        }
        for (var k = 0, l = g.length; k < l; k++) {
            g[k] = heightmap[k];
        }
    };

    /**
     * Partition a terrain into flat steps.
     *
     * @param {Float32Array} g
     *   The geometry's z-positions to modify with heightmap data.
     * @param {Number} [levels]
     *   The number of steps to divide the terrain into. Defaults to
     *   (g.length/2)^(1/4).
     */
    static Step = function (g, levels) {
        // Calculate the max, min, and avg values for each bucket
        var i = 0,
            j = 0,
            l = g.length,
            inc = Math.floor(l / levels),
            heights = new Array(l),
            buckets = new Array(levels);
        if (typeof levels === "undefined") {
            levels = Math.floor(Math.pow(l * 0.5, 0.25));
        }
        for (i = 0; i < l; i++) {
            heights[i] = g[i];
        }
        heights.sort(function (a, b) {
            return a - b;
        });
        for (i = 0; i < levels; i++) {
            // Bucket by population (bucket size) not range size
            var subset = heights.slice(i * inc, (i + 1) * inc),
                sum = 0,
                bl = subset.length;
            for (j = 0; j < bl; j++) {
                sum += subset[j];
            }
            buckets[i] = {
                min: subset[0],
                max: subset[subset.length - 1],
                avg: sum / bl,
            };
        }

        // Set the height of each vertex to the average height of its bucket
        for (i = 0; i < l; i++) {
            var startHeight = g[i];
            for (j = 0; j < levels; j++) {
                if (startHeight >= buckets[j].min && startHeight <= buckets[j].max) {
                    g[i] = buckets[j].avg;
                    break;
                }
            }
        }
    };

    /**
     * Transform to turbulent noise.
     *
     * @param {Float32Array} g
     *   The geometry's z-positions to modify with heightmap data.
     * @param {Object} [options]
     *   The same map of settings you'd pass to {@link T3_TerrainCore.Terrain()}. Only
     *   `minHeight` and `maxHeight` are used (and required) here.
     */
    static Turbulence = function (g, options) {
        var range = options.maxHeight - options.minHeight;
        for (var i = 0, l = g.length; i < l; i++) {
            g[i] = options.minHeight + Math.abs((g[i] - options.minHeight) * 2 - range);
        }
    };
}



export class T3_Gaussian {
    constructor() {
        if (this instanceof T3_Gaussian) {
            throw Error("A static class cannot be instantiated.");
        }
    }

    /**
     * Convolve an array with a kernel.
     *
     * @param {Number[][]} src
     *   The source array to convolve. A nonzero-sized rectangular array of numbers.
     * @param {Number[][]} kernel
     *   The kernel array with which to convolve `src`.  A nonzero-sized
     *   rectangular array of numbers smaller than `src`.
     * @param {Number[][]} [tgt]
     *   The target array into which the result of the convolution should be put.
     *   If not passed, a new array will be created. This is also the array that
     *   this function returns. It must be at least as large as `src`.
     *
     * @return {Number[][]}
     *   An array containing the result of the convolution.
     */
    static convolve(src, kernel, tgt) {
        // src and kernel must be nonzero rectangular number arrays.
        if (!src.length || !kernel.length) return src;
        // Initialize tracking variables.
        var i = 0, // current src x-position
            j = 0, // current src y-position
            a = 0, // current kernel x-position
            b = 0, // current kernel y-position
            w = src.length, // src width
            l = src[0].length, // src length
            m = kernel.length, // kernel width
            n = kernel[0].length; // kernel length
        // If a target isn't passed, initialize it to an array the same size as src.
        if (typeof tgt === "undefined") {
            tgt = new Array(w);
            for (i = 0; i < w; i++) {
                tgt[i] = new Float64Array(l);
            }
        }
        // The kernel is a rectangle smaller than the source. Hold it over the
        // source so that its top-left value sits over the target position. Then,
        // for each value in the kernel, multiply it by the value in the source
        // that it is sitting on top of. The target value at that position is the
        // sum of those products.
        // For each position in the source:
        for (i = 0; i < w; i++) {
            for (j = 0; j < l; j++) {
                var last = 0;
                tgt[i][j] = 0;
                // For each position in the kernel:
                for (a = 0; a < m; a++) {
                    for (b = 0; b < n; b++) {
                        // If we're along the right or bottom edges of the source,
                        // parts of the kernel will fall outside of the source. In
                        // that case, pretend the source value is the last valid
                        // value we got from the source. This gives reasonable
                        // results. The alternative is to drop the edges and end up
                        // with a target smaller than the source. That is
                        // unreasonable for some applications, so we let the caller
                        // make that choice.
                        if (typeof src[i + a] !== "undefined" && typeof src[i + a][j + b] !== "undefined") {
                            last = src[i + a][j + b];
                        }
                        // Multiply the source and the kernel at this position.
                        // The value at the target position is the sum of these
                        // products.
                        tgt[i][j] += last * kernel[a][b];
                    }
                }
            }
        }
        return tgt;
    }

    /**
     * Returns the value at X of a Gaussian distribution with standard deviation S.
     */
    static gauss(x, s) {
        // 2.5066282746310005 is sqrt(2*pi)
        return Math.exp((-0.5 * x * x) / (s * s)) / (s * 2.5066282746310005);
    }

    /**
     * Generate a Gaussian kernel.
     *
     * Returns a kernel of size N approximating a 1D Gaussian distribution with
     * standard deviation S.
     */
    static gaussianKernel1D(s, n) {
        if (typeof n !== "number") n = 7;
        var kernel = new Float64Array(n),
            halfN = Math.floor(n * 0.5),
            odd = n % 2,
            i;
        if (!s || !n) return kernel;
        for (i = 0; i <= halfN; i++) {
            kernel[i] = T3_Gaussian.gauss(s * (i - halfN - odd * 0.5), s);
        }
        for (; i < n; i++) {
            kernel[i] = kernel[n - 1 - i];
        }
        return kernel;
    }

    /**
     * Perform Gaussian smoothing.
     *
     * @param {Number[][]} src
     *   The source array to convolve. A nonzero-sized rectangular array of numbers.
     * @param {Number} [s=1]
     *   The standard deviation of the Gaussian kernel to use. Higher values result
     *   in smoothing across more cells of the src matrix.
     * @param {Number} [kernelSize=7]
     *   The size of the Gaussian kernel to use. Larger kernels result in slower
     *   but more accurate smoothing.
     *
     * @return {Number[][]}
     *   An array containing the result of smoothing the src.
     */
    static gaussian(src, s, kernelSize) {
        if (typeof s === "undefined") s = 1;
        if (typeof kernelSize === "undefined") kernelSize = 7;
        var kernel = T3_Gaussian.gaussianKernel1D(s, kernelSize),
            l = kernelSize || kernel.length,
            kernelH = [kernel],
            kernelV = new Array(l);
        for (var i = 0; i < l; i++) {
            kernelV[i] = [kernel[i]];
        }
        return T3_Gaussian.convolve(T3_Gaussian.convolve(src, kernelH), kernelV);
    }

    /**
     * Perform Gaussian smoothing on terrain vertices.
     *
     * @param {THREE.Vector3[]} g
     *   The vertex array for plane geometry to modify with heightmap data. This
     *   method sets the `z` property of each vertex.
     * @param {Object} options
     *   A map of settings that control how the terrain is constructed and
     *   displayed. Valid values are the same as those for the `options` parameter
     *   of {@link THREE.Terrain}().
     * @param {Number} [s=1]
     *   The standard deviation of the Gaussian kernel to use. Higher values result
     *   in smoothing across more cells of the src matrix.
     * @param {Number} [kernelSize=7]
     *   The size of the Gaussian kernel to use. Larger kernels result in slower
     *   but more accurate smoothing.
     */
    static Gaussian = function (g, options, s, kernelSize) {
        T3_Utility.fromArray2D(g, T3_Gaussian.gaussian(T3_Utility.toArray2D(g, options), s, kernelSize));
    };

    // From weightedBoxBlurGaussian.js

    /**
     * Perform Gaussian smoothing on terrain vertices.
     *
     * @param {Float32Array} g
     *   The geometry's z-positions to modify with heightmap data.
     * @param {Object} options
     *   A map of settings that control how the terrain is constructed and
     *   displayed. Valid values are the same as those for the `options` parameter
     *   of {@link THREE.Terrain}().
     * @param {Number} [s=1]
     *   The standard deviation of the Gaussian kernel to use. Higher values result
     *   in smoothing across more cells of the src matrix.
     * @param {Number} [n=3]
     *   The number of box blurs to use in the approximation. Larger values result
     *   in slower but more accurate smoothing.
     */
    static GaussianBoxBlur = function (g, options, s, n) {
        T3_Gaussian.gaussianBoxBlur(g, options.xSegments + 1, options.ySegments + 1, s, n);
    };

    /**
     * Approximate a Gaussian blur by performing several weighted box blurs.
     *
     * After this function runs, `tcl` will contain the blurred source channel.
     * This operation also modifies `scl`.
     *
     * Lightly modified from http://blog.ivank.net/fastest-gaussian-blur.html
     * under the MIT license: http://opensource.org/licenses/MIT
     *
     * Other than style cleanup, the main significant change is that the original
     * version was used for manipulating RGBA channels in an image, so it assumed
     * that input and output were integers [0, 255]. This version does not make
     * such assumptions about the input or output values.
     *
     * @param Number[] scl
     *   The source channel.
     * @param Number w
     *   The image width.
     * @param Number h
     *   The image height.
     * @param Number [r=1]
     *   The standard deviation (how much to blur).
     * @param Number [n=3]
     *   The number of box blurs to use in the approximation.
     * @param Number[] [tcl]
     *   The target channel. Should be different than the source channel. If not
     *   passed, one is created. This is also the return value.
     *
     * @return Number[]
     *   An array representing the blurred channel.
     */
    static gaussianBoxBlur(scl, w, h, r, n, tcl) {
        if (typeof r === "undefined") r = 1;
        if (typeof n === "undefined") n = 3;
        if (typeof tcl === "undefined") tcl = new Float32Array(scl.length);
        var boxes = T3_Gaussian.boxesForGauss(r, n);
        for (var i = 0; i < n; i++) {
            T3_Gaussian.boxBlur(scl, tcl, w, h, (boxes[i] - 1) / 2);
        }
        return tcl;
    }

    /**
     * Calculate the size of boxes needed to approximate a Gaussian blur.
     *
     * The appropriate box sizes depend on the number of box blur passes required.
     *
     * @param Number sigma
     *   The standard deviation (how much to blur).
     * @param Number n
     *   The number of boxes (also the number of box blurs you want to perform
     *   using those boxes).
     */
    static boxesForGauss(sigma, n) {
        // Calculate how far out we need to go to capture the bulk of the distribution.
        var wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1); // Ideal averaging filter width
        var wl = Math.floor(wIdeal); // Lower odd integer bound on the width
        if (wl % 2 === 0) wl--;
        var wu = wl + 2; // Upper odd integer bound on the width

        var mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
        var m = Math.round(mIdeal);
        // var sigmaActual = Math.sqrt( (m*wl*wl + (n-m)*wu*wu - n)/12 );

        var sizes = new Int16Array(n);
        for (var i = 0; i < n; i++) {
            sizes[i] = i < m ? wl : wu;
        }
        return sizes;
    }

    /**
     * Perform a 2D box blur by doing a 1D box blur in two directions.
     *
     * Uses the same parameters as gaussblur().
     */
    static boxBlur(scl, tcl, w, h, r) {
        for (var i = 0, l = scl.length; i < l; i++) {
            tcl[i] = scl[i];
        }
        T3_Gaussian.boxBlurH(tcl, scl, w, h, r);
        T3_Gaussian.boxBlurV(scl, tcl, w, h, r);
    }

    /**
     * Perform a horizontal box blur.
     *
     * Uses the same parameters as gaussblur().
     */
    static boxBlurH(scl, tcl, w, h, r) {
        var iarr = 1 / (r + r + 1); // averaging adjustment parameter
        for (var i = 0; i < h; i++) {
            var ti = i * w, // current target index
                li = ti, // current left side of the examined range
                ri = ti + r, // current right side of the examined range
                fv = scl[ti], // first value in the row
                lv = scl[ti + w - 1], // last value in the row
                val = (r + 1) * fv, // target value, accumulated over examined points
                j;
            // Sum the source values in the box
            for (j = 0; j < r; j++) {
                val += scl[ti + j];
            }
            // Compute the target value by taking the average of the surrounding
            // values. This is done by adding the deviations so far and adjusting,
            // accounting for the edges by extending the first and last values.
            for (j = 0; j <= r; j++) {
                val += scl[ri++] - fv;
                tcl[ti++] = val * iarr;
            }
            for (j = r + 1; j < w - r; j++) {
                val += scl[ri++] - scl[li++];
                tcl[ti++] = val * iarr;
            }
            for (j = w - r; j < w; j++) {
                val += lv - scl[li++];
                tcl[ti++] = val * iarr;
            }
        }
    }

    /**
     * Perform a vertical box blur.
     *
     * Uses the same parameters as gaussblur().
     */
    static boxBlurV(scl, tcl, w, h, r) {
        var iarr = 1 / (r + r + 1); // averaging adjustment parameter
        for (var i = 0; i < w; i++) {
            var ti = i, // current target index
                li = ti, // current top of the examined range
                ri = ti + r * w, // current bottom of the examined range
                fv = scl[ti], // first value in the column
                lv = scl[ti + w * (h - 1)], // last value in the column
                val = (r + 1) * fv, // target value, accumulated over examined points
                j;
            // Sum the source values in the box
            for (j = 0; j < r; j++) {
                val += scl[ti + j * w];
            }
            // Compute the target value by taking the average of the surrounding
            // values. This is done by adding the deviations so far and adjusting,
            // accounting for the edges by extending the first and last values.
            for (j = 0; j <= r; j++) {
                val += scl[ri] - fv;
                tcl[ti] = val * iarr;
                ri += w;
                ti += w;
            }
            for (j = r + 1; j < h - r; j++) {
                val += scl[ri] - scl[li];
                tcl[ti] = val * iarr;
                li += w;
                ri += w;
                ti += w;
            }
            for (j = h - r; j < h; j++) {
                val += lv - scl[li];
                tcl[ti] = val * iarr;
                li += w;
                ti += w;
            }
        }
    }
}






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

export class T3_Images {
    constructor() {
        if (this instanceof T3_Images) {
            throw Error("A static class cannot be instantiated.");
        }
    }

    /**
     * Convert an image-based heightmap into vertex-based height data.
     *
     * @param {Float32Array} g
     *   The geometry's z-positions to modify with heightmap data.
     * 
     * @param {Object} options
     *   A map of settings that control how the terrain is constructed and
     *   displayed. Valid values are the same as those for the `options` parameter
     */
    static fromHeightmap = function (g, options) {
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        let rows = options.ySegments + 1;
        let cols = options.xSegments + 1;
        let spread = options.maxHeight - options.minHeight;

        canvas.width = cols;
        canvas.height = rows;

        context.drawImage(options.heightmap, 0, 0, canvas.width, canvas.height);

        let data = context.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                let i = row * cols + col,
                    idx = i * 4;
                g[i] = ((data[idx] + data[idx + 1] + data[idx + 2]) / 765) * spread + options.minHeight;
            }
        }
    };

    /**
     * Convert a terrain plane into an image-based heightmap.
     *
     * Parameters are the same as for {@link T3_Images.fromHeightmap} except
     * that if `options.heightmap` is a canvas element then the image will be
     * painted onto that canvas; otherwise a new canvas will be created.
     *
     * @param {Float32Array} g
     *   The vertex position array for the geometry to paint to a heightmap.
     * 
     * @param {Object} options
     *   A map of settings that control how the terrain is constructed and
     *   displayed. Valid values are the same as those for the `options` parameter
     *
     * @return {HTMLCanvasElement}
     *   A canvas with the relevant heightmap painted on it.
     */
    static toHeightmap = function (g, options) {
        let hasMax = typeof options.maxHeight !== "undefined";
        let hasMin = typeof options.minHeight !== "undefined";
        let max = hasMax ? options.maxHeight : -Infinity;
        let min = hasMin ? options.minHeight : Infinity;

        if (!hasMax || !hasMin) {
            let max2 = max;
            let min2 = min;

            for (let k = 2, l = g.length; k < l; k += 3) {
                if (g[k] > max2) max2 = g[k];
                if (g[k] < min2) min2 = g[k];
            }

            if (!hasMax) max = max2;
            if (!hasMin) min = min2;
        }

        let canvas = options.heightmap instanceof HTMLCanvasElement ? options.heightmap : document.createElement("canvas");
        let context = canvas.getContext("2d");
        let rows = options.ySegments + 1;
        let cols = options.xSegments + 1;
        let spread = max - min;

        canvas.width = cols;
        canvas.height = rows;

        let d = context.createImageData(canvas.width, canvas.height);
        let data = d.data;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                let i = row * cols + col,
                    idx = i * 4;
                data[idx] = data[idx + 1] = data[idx + 2] = Math.round(((g[i * 3 + 2] - min) / spread) * 255);
                data[idx + 3] = 255;
            }
        }

        context.putImageData(d, 0, 0);
        
        return canvas;
    };
}

// Allows placing geometrically-described features on a terrain.
// If you want these features to look a little less regular, apply them before a procedural pass.
// If you want more complex influence, you can composite heightmaps.

export class T3_Influences {
    constructor() {
        if (this instanceof T3_Influences) {
            throw Error("A static class cannot be instantiated.");
        }
    }

    /**
     * Equations describing geographic features.
     */
    static Influences = {
        Mesa: function (x) {
            return 1.25 * Math.min(0.8, Math.exp(-(x * x)));
        },
        Hole: function (x) {
            return -THREE.Terrain.Influences.Mesa(x);
        },
        Hill: function (x) {
            // Same curve as EaseInOut, but mirrored and translated.
            return x < 0 ? (x + 1) * (x + 1) * (3 - 2 * (x + 1)) : 1 - x * x * (3 - 2 * x);
        },
        Valley: function (x) {
            return -THREE.Terrain.Influences.Hill(x);
        },
        Dome: function (x) {
            // Parabola
            return -(x + 1) * (x - 1);
        },
        // Not meaningful in Additive or Subtractive mode
        Flat: function (x) {
            return 0;
        },
        Volcano: function (x) {
            return 0.94 - 0.32 * (Math.abs(2 * x) + Math.cos(2 * Math.PI * Math.abs(x) + 0.4));
        },
    };

    /**
     * Place a geographic feature on the terrain.
     *
     * @param {THREE.Vector3[]} g
     *   The vertex array for plane geometry to modify with heightmap data. This
     *   method sets the `z` property of each vertex.
     * @param {Object} options
     *   A map of settings that control how the terrain is constructed and
     *   displayed. Valid values are the same as those for the `options` parameter
     *   of {@link THREE.Terrain}().
     * @param {Function} f
     *   A function describing the feature. The function should accept one
     *   parameter representing the distance from the feature's origin expressed as
     *   a number between -1 and 1 inclusive. Optionally it can accept a second and
     *   third parameter, which are the x- and y- distances from the feature's
     *   origin, respectively. It should return a number between -1 and 1
     *   representing the height of the feature at the given coordinate.
     *   `THREE.Terrain.Influences` contains some useful functions for this
     *   purpose.
     * @param {Number} [x=0.5]
     *   How far across the terrain the feature should be placed on the X-axis, in
     *   PERCENT (as a decimal) of the size of the terrain on that axis.
     * @param {Number} [y=0.5]
     *   How far across the terrain the feature should be placed on the Y-axis, in
     *   PERCENT (as a decimal) of the size of the terrain on that axis.
     * @param {Number} [r=64]
     *   The radius of the feature.
     * @param {Number} [h=64]
     *   The height of the feature.
     * @param {String} [t=THREE.NormalBlending]
     *   Determines how to layer the feature on top of the existing terrain. Valid
     *   values include `THREE.AdditiveBlending`, `THREE.SubtractiveBlending`,
     *   `THREE.MultiplyBlending`, `THREE.NoBlending`, `THREE.NormalBlending`, and
     *   any function that takes the terrain's current height, the feature's
     *   displacement at a vertex, and the vertex's distance from the feature
     *   origin, and returns the new height for that vertex. (If a custom function
     *   is passed, it can take optional fourth and fifth parameters, which are the
     *   x- and y-distances from the feature's origin, respectively.)
     * @param {Number/Function} [e=THREE.Terrain.EaseIn]
     *   A function that determines the "falloff" of the feature, i.e. how quickly
     *   the terrain will get close to its height before the feature was applied as
     *   the distance increases from the feature's location. It does this by
     *   interpolating the height of each vertex along a curve. Valid values
     *   include `THREE.Terrain.Linear`, `THREE.Terrain.EaseIn`,
     *   `THREE.Terrain.EaseOut`, `THREE.Terrain.EaseInOut`,
     *   `THREE.Terrain.InEaseOut`, and any custom function that accepts a float
     *   between 0 and 1 representing the distance to the feature origin and
     *   returns a float between 0 and 1 with the adjusted distance. (Custom
     *   functions can also accept optional second and third parameters, which are
     *   the x- and y-distances to the feature origin, respectively.)
     */
    static Influence = function (g, options, f, x, y, r, h, t, e) {
        f = f || THREE.Terrain.Influences.Hill; // feature shape
        x = typeof x === "undefined" ? 0.5 : x; // x-location %
        y = typeof y === "undefined" ? 0.5 : y; // y-location %
        r = typeof r === "undefined" ? 64 : r; // radius
        h = typeof h === "undefined" ? 64 : h; // height
        t = typeof t === "undefined" ? THREE.NormalBlending : t; // blending
        e = e || THREE.Terrain.EaseIn; // falloff
        // Find the vertex location of the feature origin
        var xl = options.xSegments + 1, // # x-vertices
            yl = options.ySegments + 1, // # y-vertices
            vx = xl * x, // vertex x-location
            vy = yl * y, // vertex y-location
            xw = options.xSize / options.xSegments, // width of x-segments
            yw = options.ySize / options.ySegments, // width of y-segments
            rx = r / xw, // radius of the feature in vertices on the x-axis
            ry = r / yw, // radius of the feature in vertices on the y-axis
            r1 = 1 / r, // for speed
            xs = Math.ceil(vx - rx), // starting x-vertex index
            xe = Math.floor(vx + rx), // ending x-vertex index
            ys = Math.ceil(vy - ry), // starting y-vertex index
            ye = Math.floor(vy + ry); // ending y-vertex index
        // Walk over the vertices within radius of origin
        for (var i = xs; i < xe; i++) {
            for (var j = ys; j < ye; j++) {
                var k = j * xl + i,
                    // distance to the feature origin
                    fdx = (i - vx) * xw,
                    fdy = (j - vy) * yw,
                    fd = Math.sqrt(fdx * fdx + fdy * fdy),
                    fdr = fd * r1,
                    fdxr = fdx * r1,
                    fdyr = fdy * r1,
                    // Get the displacement according to f, multiply it by h,
                    // interpolate using e, then blend according to t.
                    d = f(fdr, fdxr, fdyr) * h * (1 - e(fdr, fdxr, fdyr));
                if (fd > r || typeof g[k] == "undefined") continue;
                if (t === THREE.AdditiveBlending) g[k] += d; // jscs:ignore requireSpaceAfterKeywords
                else if (t === THREE.SubtractiveBlending) g[k] -= d;
                else if (t === THREE.MultiplyBlending) g[k] *= d;
                else if (t === THREE.NoBlending) g[k] = d;
                else if (t === THREE.NormalBlending) g[k] = e(fdr, fdxr, fdyr) * g[k] + d;
                else if (typeof t === "function") g[k] = t(g[k].z, d, fdr, fdxr, fdyr);
            }
        }
    };
}

/**
 * Generate a material that blends together textures based on vertex height.
 *
 * Inspired by http://www.chandlerprall.com/2011/06/blending-webgl-textures/
 *
 * Usage:
 *
 *    // Assuming the textures are already loaded
 *    var material = T3_Materials.generateBlendedMaterial([
 *      {texture: THREE.ImageUtils.loadTexture('img1.jpg')},
 *      {texture: THREE.ImageUtils.loadTexture('img2.jpg'), levels: [-80, -35, 20, 50]},
 *      {texture: THREE.ImageUtils.loadTexture('img3.jpg'), levels: [20, 50, 60, 85]},
 *      {texture: THREE.ImageUtils.loadTexture('img4.jpg'), glsl: '1.0 - smoothstep(65.0 + smoothstep(-256.0, 256.0, vPosition.x) * 10.0, 80.0, vPosition.z)'},
 *    ]);
 *
 * This material tries to behave exactly like a MeshLambertMaterial other than
 * the fact that it blends multiple texture maps together, although
 * ShaderMaterials are treated slightly differently by Three.js so YMMV. Note
 * that this means the texture will appear black unless there are lights
 * shining on it.
 *
 * @param {Object[]} textures
 *   An array of objects specifying textures to blend together and how to blend
 *   them. Each object should have a `texture` property containing a
 *   `THREE.Texture` instance. There must be at least one texture and the first
 *   texture does not need any other properties because it will serve as the
 *   base, showing up wherever another texture isn't blended in. Other textures
 *   must have either a `levels` property containing an array of four numbers
 *   or a `glsl` property containing a single GLSL expression evaluating to a
 *   float between 0.0 and 1.0. For the `levels` property,
 *
 *   the four numbers are, in order:
 *      the height at which the texture will start blending in,
 *      the height at which it will be fully blended in,
 *      the height at which it will start blending out, and
 *      the height at which it will be fully blended out.
 *
 *   The `vec3 vPosition` variable is available to `glsl` expressions; it
 *   contains the coordinates in Three-space of the texel currently being
 *   rendered.
 *
 * @param {Three.Material} material
 *   An optional base material. You can use this to pick a different base
 *   material type such as `MeshStandardMaterial` instead of the default
 *   `MeshLambertMaterial`.
 */



export class T3_Materials {
    constructor() {
        if (this instanceof T3_Materials) {
            throw Error("A static class cannot be instantiated.");
        }
    }

    static generateBlendedMaterial = function (textures, material) {
        // Convert numbers to strings of floats so GLSL doesn't choke on "1" instead of "1.0"
        function glslifyNumber(n) {
            return n === (n | 0) ? n + ".0" : n + "";
        }

        let declare = "";
        let assign = "";
        let t0Repeat = textures[0].texture.repeat;
        let t0Offset = textures[0].texture.offset;

        for (let i = 0, l = textures.length; i < l; i++) {
            // Update textures
            textures[i].texture.wrapS = textures[i].texture.wrapT = THREE.RepeatWrapping;
            // need to add to options
            textures[i].texture.repeat.set(textures[i].repeat.x, textures[i].repeat.y);
            textures[i].texture.needsUpdate = true;

            // Shader fragments
            // Declare each texture, then mix them together.
            declare += "uniform sampler2D texture_" + i + ";\n";

            if (i !== 0) {
                let v = textures[i].levels; // Vertex heights at which to blend textures in and out
                let p = textures[i].glsl; // Or specify a GLSL expression that evaluates to a float between 0.0 and 1.0 indicating how opaque the texture should be at this texel
                let useLevels = typeof v !== "undefined"; // Use levels if they exist; otherwise, use the GLSL expression
                let tiRepeat = textures[i].texture.repeat;
                let tiOffset = textures[i].texture.offset;

                if (useLevels) {
                    // Must fade in; can't start and stop at the same point.
                    // So, if levels are too close, move one of them slightly.
                    if (v[1] - v[0] < 1) v[0] -= 1;
                    if (v[3] - v[2] < 1) v[3] += 1;
                    for (let j = 0; j < v.length; j++) {
                        v[j] = glslifyNumber(v[j]);
                    }
                }

                // The transparency of the new texture when it is layered on top of the existing color at this texel is
                // (how far between the start-blending-in and fully-blended-in levels the current vertex is) +
                // (how far between the start-blending-out and fully-blended-out levels the current vertex is)
                // So the opacity is 1.0 minus that.
                let blendAmount = !useLevels
                    ? p
                    : "1.0 - smoothstep(" +
                      v[0] +
                      ", " +
                      v[1] +
                      ", vPosition.z) + smoothstep(" +
                      v[2] +
                      ", " +
                      v[3] +
                      ", vPosition.z)";

                assign +=
                    "        color = mix( " +
                    "texture2D( texture_" +
                    i +
                    ", MyvUv * vec2( " +
                    glslifyNumber(tiRepeat.x) +
                    ", " +
                    glslifyNumber(tiRepeat.y) +
                    " ) + vec2( " +
                    glslifyNumber(tiOffset.x) +
                    ", " +
                    glslifyNumber(tiOffset.y) +
                    " ) ), " +
                    "color, " +
                    "max(min(" +
                    blendAmount +
                    ", 1.0), 0.0)" +
                    ");\n";
            }
        }

        let fragBlend =
            "float slope = acos(max(min(dot(myNormal, vec3(0.0, 0.0, 1.0)), 1.0), -1.0));\n" +
            "    diffuseColor = vec4( diffuse, opacity );\n" +
            "    vec4 color = texture2D( texture_0, MyvUv * vec2( " +
            glslifyNumber(t0Repeat.x) +
            ", " +
            glslifyNumber(t0Repeat.y) +
            " ) + vec2( " +
            glslifyNumber(t0Offset.x) +
            ", " +
            glslifyNumber(t0Offset.y) +
            " ) ); // base\n" +
            assign +
            "    diffuseColor = color;\n";

        let fragPars =
            declare + "\n" + "varying vec2 MyvUv;\n" + "varying vec3 vPosition;\n" + "varying vec3 myNormal;\n";

        let mat = material || new THREE.MeshStandardMaterial();

        mat.onBeforeCompile = function (shader) {
            // Patch vertexShader to setup MyUv, vPosition, and myNormal
            shader.vertexShader = shader.vertexShader.replace(
                "#include <common>",
                "varying vec2 MyvUv;\nvarying vec3 vPosition;\nvarying vec3 myNormal;\n#include <common>"
            );
            shader.vertexShader = shader.vertexShader.replace(
                "#include <uv_vertex>",
                "MyvUv = uv;\nvPosition = position;\nmyNormal = normal;\n#include <uv_vertex>"
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                "#include <common>",
                fragPars + "\n#include <common>"
            );
            shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", fragBlend);

            // Add our custom texture uniforms
            for (let i = 0, l = textures.length; i < l; i++) {
                shader.uniforms["texture_" + i] = {
                    type: "t",
                    value: textures[i].texture,
                };
            }
        };

        return mat;
    }.bind(this);
}

/**
* Simplex and Perlin noise.
*
* Copied with small edits from https://github.com/josephg/noisejs which is
* public domain. Originally by Stefan Gustavson (stegu@itn.liu.se) with
* optimizations by Peter Eastman (peastman@drizzle.stanford.edu) and converted
* to JavaScript by Joseph Gentle.
*/

export class T3_Noise {
    constructor() {
        if (this instanceof T3_Noise) {
            throw Error("A static class cannot be instantiated.");
        }
    }

    static Grad = function (x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;

        this.dot2 = function (x, y) {
            return this.x * x + this.y * y;
        };

        this.dot3 = function (x, y, z) {
            return this.x * x + this.y * y + this.z * z;
        };
    };

    static grad3 = [
        new this.Grad(1, 1, 0),
        new this.Grad(-1, 1, 0),
        new this.Grad(1, -1, 0),
        new this.Grad(-1, -1, 0),
        new this.Grad(1, 0, 1),
        new this.Grad(-1, 0, 1),
        new this.Grad(1, 0, -1),
        new this.Grad(-1, 0, -1),
        new this.Grad(0, 1, 1),
        new this.Grad(0, -1, 1),
        new this.Grad(0, 1, -1),
        new this.Grad(0, -1, -1),
    ];

    static p = [
        151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37,
        240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177,
        33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146,
        158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25,
        63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100,
        109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206,
        59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153,
        101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246,
        97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192,
        214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114,
        67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
    ];

    // To avoid the need for index wrapping, double the permutation table length
    static perm = new Array(512);
    static gradP = new Array(512);

    static seed = function (seed) {
        if (seed > 0 && seed < 1) {
            // Scale the seed out
            seed *= 65536;
        }

        seed = Math.floor(seed);
        if (seed < 256) {
            seed |= seed << 8;
        }

        for (let i = 0; i < 256; i++) {
            let v;
            if (i & 1) {
                v = this.p[i] ^ (seed & 255);
            } else {
                v = this.p[i] ^ ((seed >> 8) & 255);
            }

            this.perm[i] = this.perm[i + 256] = v;
            this.gradP[i] = this.gradP[i + 256] = this.grad3[v % 12];
        }
    }.bind(this);

    static init = function(noise) {
        T3_Noise.seed(Math.random())
    }(this);

    // Skewing and unskewing factors for 2 and 3 dimensions
    static F2 = 0.5 * (Math.sqrt(3) - 1);
    static G2 = (3 - Math.sqrt(3)) / 6;
    static F3 = 1 / 3;
    static G3 = 1 / 6;

    // 2D simplex noise
    static simplex = function (xin, yin) {
        var n0, n1, n2; // Noise contributions from the three corners
        // Skew the input space to determine which simplex cell we're in
        var s = (xin + yin) * T3_Noise.F2; // Hairy factor for 2D
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var t = (i + j) * T3_Noise.G2;
        var x0 = xin - i + t; // The x,y distances from the cell origin, unskewed
        var y0 = yin - j + t;
        // For the 2D case, the simplex shape is an equilateral triangle.
        // Determine which simplex we are in.
        var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
        if (x0 > y0) {
            // Lower triangle, XY order: (0,0)->(1,0)->(1,1)
            i1 = 1;
            j1 = 0;
        } else {
            // Upper triangle, YX order: (0,0)->(0,1)->(1,1)
            i1 = 0;
            j1 = 1;
        }
        // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
        // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
        // c = (3-sqrt(3))/6
        var x1 = x0 - i1 + T3_Noise.G2; // Offsets for middle corner in (x,y) unskewed coords
        var y1 = y0 - j1 + T3_Noise.G2;
        var x2 = x0 - 1 + 2 * T3_Noise.G2; // Offsets for last corner in (x,y) unskewed coords
        var y2 = y0 - 1 + 2 * T3_Noise.G2;
        // Work out the hashed gradient indices of the three simplex corners
        i &= 255;
        j &= 255;
        var gi0 = this.gradP[i + this.perm[j]];
        var gi1 = this.gradP[i + i1 + this.perm[j + j1]];
        var gi2 = this.gradP[i + 1 + this.perm[j + 1]];
        // Calculate the contribution from the three corners
        var t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) {
            n0 = 0;
        } else {
            t0 *= t0;
            n0 = t0 * t0 * gi0.dot2(x0, y0); // (x,y) of grad3 used for 2D gradient
        }
        var t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) {
            n1 = 0;
        } else {
            t1 *= t1;
            n1 = t1 * t1 * gi1.dot2(x1, y1);
        }
        var t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) {
            n2 = 0;
        } else {
            t2 *= t2;
            n2 = t2 * t2 * gi2.dot2(x2, y2);
        }
        // Add contributions from each corner to get the final noise value.
        // The result is scaled to return values in the interval [-1,1].
        return 70 * (n0 + n1 + n2);
    };

    // ##### Perlin noise stuff
    static fade = function(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    static lerp = function(a, b, t) {
        return (1 - t) * a + t * b;
    }

    static perlin = function (x, y) {
        // Find unit grid cell containing point
        var X = Math.floor(x),
            Y = Math.floor(y);
        // Get relative xy coordinates of point within that cell
        x = x - X;
        y = y - Y;
        // Wrap the integer cells at 255 (smaller integer period can be introduced here)
        X = X & 255;
        Y = Y & 255;

        // Calculate noise contributions from each of the four corners
        var n00 = this.gradP[X + this.perm[Y]].dot2(x, y);
        var n01 = this.gradP[X + this.perm[Y + 1]].dot2(x, y - 1);
        var n10 = this.gradP[X + 1 + this.perm[Y]].dot2(x - 1, y);
        var n11 = this.gradP[X + 1 + this.perm[Y + 1]].dot2(x - 1, y - 1);

        // Compute the fade curve value for x
        var u = this.fade(x);

        // Interpolate the four results
        return this.lerp(this.lerp(n00, n10, u), this.lerp(n01, n11, u), this.fade(y));
    };
}



export class T3_Preloader {
    constructor() {
        if (this instanceof T3_Preloader) {
            throw Error("A static class cannot be instantiated.");
        }
    }

    
    static safeLoad = function (textureUrlArray, callback) {
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
    };

    // not used atm
    static installShaders = function () {
        var vertexShader = null;
        var fragmentShader = null;

        function shadersDone() {
            var material = new THREE.ShaderMaterial({
                uniforms: {
                    /* define your uniforms */
                },
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
            });
        }

        function vertexDone(code) {
            vertexShader = code;
            if (fragmentShader !== null) {
                shadersDone();
            }
        }

        function fragmentDone(code) {
            fragmentShader = code;
            if (vertexShader !== null) {
                shadersDone();
            }
        }

        var xhr1 = new XMLHttpRequest();
        var xhr2 = new XMLHttpRequest();

        // C:\Users\kwkel\Desktop\Projects\THREE.Terrain\shaders\terrain.frag.glsl
        xhr1.open("GET", "../shaders/terrain.vert.glsl", true);
        xhr2.open("GET", "../shaders/terrain.frag.glsl", true);

        xhr1.responseType = "text";
        xhr2.responseType = "text";

        xhr1.onload = function () {
            if (xhr1.readyState === xhr1.DONE && xhr1.status === 200) {
                vertexDone(xhr1.responseText);
            }
        };

        xhr2.onload = function () {
            if (xhr2.readyState === xhr2.DONE && xhr2.status === 200) {
                fragmentDone(xhr2.responseText);
            }
        };

        xhr1.send(null);
        xhr2.send(null);
    };
}

/**
 * Scatter a mesh across the terrain.
 *
 * @param {THREE.BufferGeometry} geometry
 *   The terrain's geometry (or the highest-resolution version of it).
 * @param {Object} options
 *   A map of settings that controls how the meshes are scattered, with the
 *   following properties:
 *   - `mesh`: A `THREE.Mesh` instance to scatter across the terrain.
 *   - `spread`: A number or a function that affects where meshes are placed.
 *     If it is a number, it represents the percent of faces of the terrain
 *     onto which a mesh should be placed. If it is a function, it takes a
 *     vertex from the terrain and the key of a related face and returns a
 *     boolean indicating whether to place a mesh on that face or not. An
 *     example could be `function(v, k) { return v.z > 0 && !(k % 4); }`.
 *     Defaults to 0.025.
 *   - `smoothSpread`: If the `spread` option is a number, this affects how
 *     much placement is "eased in." Specifically, if the `randomness` function
 *     returns a value for a face that is within `smoothSpread` percentiles
 *     above `spread`, then the probability that a mesh is placed there is
 *     interpolated between zero and `spread`. This creates a "thinning" effect
 *     near the edges of clumps, if the randomness function creates clumps.
 *   - `scene`: A `THREE.Object3D` instance to which the scattered meshes will
 *     be added. This is expected to be either a return value of a call to
 *     `THREE.Terrain()` or added to that return value; otherwise the position
 *     and rotation of the meshes will be wrong.
 *   - `sizeVariance`: The percent by which instances of the mesh can be scaled
 *     up or down when placed on the terrain.
 *   - `randomness`: If `options.spread` is a number, then this property is a
 *     function that determines where meshes are placed. Specifically, it
 *     returns an array of numbers, where each number is the probability that
 *     a mesh is NOT placed on the corresponding face. Valid values include
 *     `Math.random` and the return value of a call to
 *     `THREE.Terrain.ScatterHelper`.
 *   - `maxSlope`: The angle in radians between the normal of a face of the
 *     terrain and the "up" vector above which no mesh will be placed on the
 *     related face. Defaults to ~0.63, which is 36 degrees.
 *   - `maxTilt`: The maximum angle in radians a mesh can be tilted away from
 *     the "up" vector (towards the normal vector of the face of the terrain).
 *     Defaults to Infinity (meshes will point towards the normal).
 *   - `w`: The number of horizontal segments of the terrain.
 *   - `h`: The number of vertical segments of the terrain.
 *
 * @return {THREE.Object3D}
 *   An Object3D containing the scattered meshes. This is the value of the
 *   `options.scene` parameter if passed. This is expected to be either a
 *   return value of a call to `THREE.Terrain()` or added to that return value;
 *   otherwise the position and rotation of the meshes will be wrong.
 */



export class T3_Scatter {
    constructor() {
        if (this instanceof T3_Scatter) {
            throw Error("A static class cannot be instantiated.");
        }
    }

    static ScatterMeshes = function(geometry, options) {
        if (!options.mesh) {
            console.error('options.mesh is required for THREE.Terrain.ScatterMeshes but was not passed');
            return;
        }
        if (!options.scene) {
            options.scene = new THREE.Object3D();
        }
        var defaultOptions = {
            spread: 0.025,
            smoothSpread: 0,
            sizeVariance: 0.1,
            randomness: Math.random,
            maxSlope: 0.6283185307179586, // 36deg or 36 / 180 * Math.PI, about the angle of repose of earth
            maxTilt: Infinity,
            w: 0,
            h: 0,
        };
        for (var opt in defaultOptions) {
            if (defaultOptions.hasOwnProperty(opt)) {
                options[opt] = typeof options[opt] === 'undefined' ? defaultOptions[opt] : options[opt];
            }
        }
    
        var spreadIsNumber = typeof options.spread === 'number',
            randomHeightmap,
            randomness,
            spreadRange = 1 / options.smoothSpread,
            doubleSizeVariance = options.sizeVariance * 2,
            vertex1 = new THREE.Vector3(),
            vertex2 = new THREE.Vector3(),
            vertex3 = new THREE.Vector3(),
            faceNormal = new THREE.Vector3(),
            up = options.mesh.up.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), 0.5*Math.PI);
        if (spreadIsNumber) {
            randomHeightmap = options.randomness();
            randomness = typeof randomHeightmap === 'number' ? Math.random : function(k) { return randomHeightmap[k]; };
        }
    
        geometry = geometry.toNonIndexed();
        var gArray = geometry.attributes.position.array;
        for (var i = 0; i < geometry.attributes.position.array.length; i += 9) {
            vertex1.set(gArray[i + 0], gArray[i + 1], gArray[i + 2]);
            vertex2.set(gArray[i + 3], gArray[i + 4], gArray[i + 5]);
            vertex3.set(gArray[i + 6], gArray[i + 7], gArray[i + 8]);
            THREE.Triangle.getNormal(vertex1, vertex2, vertex3, faceNormal);
    
            var place = false;
            if (spreadIsNumber) {
                var rv = randomness(i/9);
                if (rv < options.spread) {
                    place = true;
                }
                else if (rv < options.spread + options.smoothSpread) {
                    // Interpolate rv between spread and spread + smoothSpread,
                    // then multiply that "easing" value by the probability
                    // that a mesh would get placed on a given face.
                    place = T3_Utility.EaseInOut((rv - options.spread) * spreadRange) * options.spread > Math.random();
                }
            }
            else {
                place = options.spread(vertex1, i / 9, faceNormal, i);
            }
            if (place) {
                // Don't place a mesh if the angle is too steep.
                if (faceNormal.angleTo(up) > options.maxSlope) {
                    continue;
                }
                var mesh = options.mesh.clone();
                mesh.position.addVectors(vertex1, vertex2).add(vertex3).divideScalar(3);
                if (options.maxTilt > 0) {
                    var normal = mesh.position.clone().add(faceNormal);
                    mesh.lookAt(normal);
                    var tiltAngle = faceNormal.angleTo(up);
                    if (tiltAngle > options.maxTilt) {
                        var ratio = options.maxTilt / tiltAngle;
                        mesh.rotation.x *= ratio;
                        mesh.rotation.y *= ratio;
                        mesh.rotation.z *= ratio;
                    }
                }
                mesh.rotation.x += 90 / 180 * Math.PI;
                mesh.rotateY(Math.random() * 2 * Math.PI);
                if (options.sizeVariance) {
                    var variance = Math.random() * doubleSizeVariance - options.sizeVariance;
                    mesh.scale.x = mesh.scale.z = 1 + variance;
                    mesh.scale.y += variance;
                }
    
                mesh.updateMatrix();
                options.scene.add(mesh);
            }
        }
    
        return options.scene;
    };
    
    /**
     * Generate a function that returns a heightmap to pass to ScatterMeshes.
     *
     * Specifically, this function generates a heightmap and then uses that
     * heightmap as a map of probabilities of where meshes will be placed.
     *
     * @param {Function} method
     *   A random terrain generation function (i.e. a valid value for the
     *   `options.heightmap` parameter of the `THREE.Terrain` function).
     * @param {Object} options
     *   A map of settings that control how the resulting noise should be generated
     *   (with the same parameters as the `options` parameter to the
     *   `THREE.Terrain` function). `options.minHeight` must equal `0` and
     *   `options.maxHeight` must equal `1` if they are specified.
     * @param {Number} skip
     *   The number of sequential faces to skip between faces that are candidates
     *   for placing a mesh. This avoid clumping meshes too closely together.
     *   Defaults to 1.
     * @param {Number} threshold
     *   The probability that, if a mesh can be placed on a non-skipped face due to
     *   the shape of the heightmap, a mesh actually will be placed there. Helps
     *   thin out placement and make it less regular. Defaults to 0.25.
     *
     * @return {Function}
     *   Returns a function that can be passed as the value of the
     *   `options.randomness` parameter to the {@link THREE.Terrain.ScatterMeshes}
     *   function.
     */
    static ScatterHelper = function(method, options, skip, threshold) {
        skip = skip || 1;
        threshold = threshold || 0.25;
        options.frequency = options.frequency || 2.5;
    
        var clonedOptions = {};
        for (var opt in options) {
            if (options.hasOwnProperty(opt)) {
                clonedOptions[opt] = options[opt];
            }
        }
    
        clonedOptions.xSegments *= 2;
        clonedOptions.stretch = true;
        clonedOptions.maxHeight = 1;
        clonedOptions.minHeight = 0;
        var heightmap = T3_Utility.heightmapArray(method, clonedOptions);
    
        for (var i = 0, l = heightmap.length; i < l; i++) {
            if (i % skip || Math.random() > threshold) {
                heightmap[i] = 1; // 0 = place, 1 = don't place
            }
        }
        return function() {
            return heightmap;
        };
    };
    

}

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



export class T3_Worley {
    constructor() {
        if (this instanceof T3_Worley) {
            throw Error("A static class cannot be instantiated.");
        }
    }

    static Worley = function(g, options) {
        var points = (options.worleyDistribution || this.randomPoints)(
                options.xSegments,
                options.ySegments,
                options.worleyPoints
            ),
            transform =
                options.worleyDistanceTransformation ||
                function (d) {
                    return -d;
                },
            currentCoords = new THREE.Vector2(0, 0);
        // The height of each heightmap vertex is the distance to the closest Voronoi centroid
        for (var i = 0, xl = options.xSegments + 1; i < xl; i++) {
            for (var j = 0; j < options.ySegments + 1; j++) {
                currentCoords.x = i;
                currentCoords.y = j;
                g[j * xl + i] = transform(this.distanceToNearest(currentCoords, points, options.distanceType || ""));
            }
        }
        // We set the heights to distances so now we need to normalize
        T3_Filters.Clamp(g, {
            maxHeight: options.maxHeight,
            minHeight: options.minHeight,
            stretch: true,
        });
    }.bind(this)

    static initProtos = function() {
        THREE.Vector2.prototype.distanceToManhattan = function (b) {
            return Math.abs(this.x - b.x) + Math.abs(this.y - b.y);
        };
        THREE.Vector2.prototype.distanceToChebyshev = function (b) {
            var c = Math.abs(this.x - b.x),
                d = Math.abs(this.y - b.y);
            return c <= d ? d : c;
        };
        THREE.Vector2.prototype.distanceToQuadratic = function (b) {
            var c = Math.abs(this.x - b.x),
                d = Math.abs(this.y - b.y);
            return c * c + c * d + d * d;
        };
    }

    static distanceToNearest = function(coords, points, distanceType) {
        var color = Infinity,
            distanceFunc = "distanceTo" + distanceType;
        for (var k = 0; k < points.length; k++) {
            var d = points[k][distanceFunc](coords);
            if (d < color) {
                color = d;
            }
        }
        return color;
    }

    static randomPoints = function (width, height, numPoints) {
        numPoints = numPoints || Math.floor(Math.sqrt(width * height * 0.025)) || 1;
        var points = new Array(numPoints);
        for (var i = 0; i < numPoints; i++) {
            points[i] = new THREE.Vector2(Math.random() * width, Math.random() * height);
        }
        return points;
    };

    /* Utility functions for Poisson Disks. */
    static removeAndReturnRandomElement(arr) {
        return arr.splice(Math.floor(Math.random() * arr.length), 1)[0];
    }

    static putInGrid = function(grid, point, cellSize) {
        var gx = Math.floor(point.x / cellSize),
            gy = Math.floor(point.y / cellSize);
        if (!grid[gx]) grid[gx] = [];
        grid[gx][gy] = point;
    }

    static inRectangle = function(point, width, height) {
        return (
            point.x >= 0 && // jscs:ignore requireSpaceAfterKeywords
            point.y >= 0 &&
            point.x <= width + 1 &&
            point.y <= height + 1
        );
    }

    static inNeighborhood = function(grid, point, minDist, cellSize) {
        var gx = Math.floor(point.x / cellSize),
            gy = Math.floor(point.y / cellSize);
        for (var x = gx - 1; x <= gx + 1; x++) {
            for (var y = gy - 1; y <= gy + 1; y++) {
                if (x !== gx && y !== gy && typeof grid[x] !== "undefined" && typeof grid[x][y] !== "undefined") {
                    var cx = x * cellSize,
                        cy = y * cellSize;
                    if (Math.sqrt((point.x - cx) * (point.x - cx) + (point.y - cy) * (point.y - cy)) < minDist) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    static generateRandomPointAround = function(point, minDist) {
        var radius = minDist * (Math.random() + 1),
            angle = 2 * Math.PI * Math.random();
        return new THREE.Vector2(point.x + radius * Math.cos(angle), point.y + radius * Math.sin(angle));
    }

    static PoissonDisks = function (width, height, numPoints, minDist) {
        numPoints = numPoints || Math.floor(Math.sqrt(width * height * 0.2)) || 1;
        minDist = Math.sqrt((width + height) * 2.5);
        if (minDist > numPoints * 0.67) minDist = numPoints * 0.67;
        var cellSize = minDist / Math.sqrt(2);
        if (cellSize < 2) cellSize = 2;

        var grid = [];

        var processList = [],
            samplePoints = [];

        var firstPoint = new THREE.Vector2(Math.random() * width, Math.random() * height);
        processList.push(firstPoint);
        samplePoints.push(firstPoint);
        putInGrid(grid, firstPoint, cellSize);

        var count = 0;
        while (processList.length) {
            var point = this.removeAndReturnRandomElement(processList);
            for (var i = 0; i < numPoints; i++) {
                // optionally, minDist = perlin(point.x / width, point.y / height)
                var newPoint = this.generateRandomPointAround(point, minDist);
                if (inRectangle(newPoint, width, height) && !inNeighborhood(grid, newPoint, minDist, cellSize)) {
                    processList.push(newPoint);
                    samplePoints.push(newPoint);
                    putInGrid(grid, newPoint, cellSize);
                    if (samplePoints.length >= numPoints) break;
                }
            }
            if (samplePoints.length >= numPoints) break;
            // Sanity check
            if (++count > numPoints * numPoints) {
                break;
            }
        }
        return samplePoints;
    };
}



