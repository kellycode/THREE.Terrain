
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



