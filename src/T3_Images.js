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
