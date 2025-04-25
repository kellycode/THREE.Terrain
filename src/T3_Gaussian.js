import { T3_Utility } from "./T3_Utility.js";

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
