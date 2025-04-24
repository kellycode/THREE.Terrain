function loadAnalyticsTemplate(templatePath, targetDivId, callback) {
    fetch(templatePath)
        .then((response) => response.text())
        .then((template) => {
            const targetDiv = document.getElementById(targetDivId);
            if (targetDiv) {
                targetDiv.innerHTML = template;
                initAnalytics();
            } else {
                console.error(`Div with id "${targetDivId}" not found.`);
            }
        })
        .catch((error) => console.error("Error loading template:", error));
}

function populateAnalytics() {
    let analysis = THREE.Terrain.Analyze(terrainScene.children[0], regenOpts);
    let deviations = getSummary(analysis);
    let prop;

    analysis.elevation.drawHistogram(elevationGraph, 10);

    analysis.slope.drawHistogram(slopeGraph, 10);

    for (let i = 0, l = analyticsValues.length; i < l; i++) {
        prop = analyticsValues[i].getAttribute("data-property").split(".");
        let analytic = analysis[prop[0]][prop[1]];
        if (analyticsValues[i].getAttribute("class").split(/\s+/).indexOf("percent") !== -1) {
            analytic *= 100;
        }
        analyticsValues[i].textContent = cleanAnalytic(analytic);
    }

    for (prop in deviations) {
        if (deviations.hasOwnProperty(prop)) {
            document.querySelector('.summary-value[data-property="' + prop + '"]').textContent = deviations[prop];
        }
    }
}

function initAnalytics() {
    document.getElementById("show-analytics").classList.remove("visible");
    let analytics = document.getElementById("analytics");
    analytics.scrollTop = 0;
    analytics.classList.add("visible");

    elevationGraph = document.getElementById("elevation-graph");
    slopeGraph = document.getElementById("slope-graph");
    analyticsValues = document.getElementsByClassName("value");

    document.querySelector("#analytics .close").addEventListener(
        "click",
        function (event) {
            event.preventDefault();
            document.getElementById("analytics").classList.remove("visible");
            document.getElementById("show-analytics").classList.add("visible");
        },
        false
    );

    populateAnalytics();
}

function cleanAnalytic(val) {
    if (Array.isArray(val)) {
        if (val.length === 1) {
            val = val[0];
        } else {
            let str = val
                .map(function (v) {
                    return Math.round(v);
                })
                .join(", ");
            if (str.length > 9) str = val.join(",");
            if (str.length > 9) str = str.substring(0, str.lastIndexOf(",", 7)) + ",&hellip;";
            return str;
        }
    }
    let valIntStr = (val | 0) + "",
        c = "";
    if ((val | 0) === 0 && val < 0) {
        valIntStr = "-" + valIntStr;
    }
    while (valIntStr.length + c.length < 5) {
        c += " ";
    }
    return c + (typeof val === "undefined" || val === null ? NaN : val).round(3);
}

let moments = {
    "elevation.stdev": {
        mean: 42.063,
        stdev: 6.353,
    },
    "elevation.pearsonSkew": {
        // mean: 0.100,
        // stdev: 0.566,
        levels: {
            "+high": -1.032,
            "+medium": -0.277,
            low: 0.666,
            "-medium": 1.232,
            "-high": Infinity,
        },
    },
    "slope.stdev": {
        mean: 10.154,
        stdev: 3.586,
    },
    "slope.groeneveldMeedenSkew": {
        // mean: -0.021,
        // stdev: 0.163,
        levels: {
            "+high": -0.347,
            "+medium": -0.13,
            low: 0.088,
            "-medium": 0.305,
            "-high": Infinity,
        },
    },
    "roughness.jaggedness": {
        levels: [0.006, 0.02, 0.044, 0.1],
    },
    "roughness.terrainRuggednessIndex": {
        levels: [1, 2.2, 3.5, 4.8],
    },
};

function getSummary(analytics) {
    let results = {},
        deviationBuckets = [-2, -2 / 3, 2 / 3, 2];
    for (let prop in moments) {
        if (moments.hasOwnProperty(prop)) {
            let averageProp = moments[prop],
                split = prop.split("."),
                sampleProp = analytics[split[0]][split[1]];
            if (typeof averageProp.mean === "number") {
                results[prop] = (sampleProp - averageProp.mean) / averageProp.stdev;
                results[prop] = numberToCategory(results[prop], deviationBuckets);
            } else {
                results[prop] = numberToCategory(sampleProp, averageProp.levels);
            }
        }
    }
    return results;
}

/**
 * Classify a numeric input.
 *
 * @param {Number} value
 *   The number to classify.
 * @param {Object/Number[]} [buckets=[-2, -2/3, 2/3, 2]]
 *   An object or numeric array used to classify `value`. If `buckets` is an
 *   array, the returned category will be the first of "very low," "low,"
 *   "medium," and "high," in that order, where the correspondingly ordered
 *   bucket value is higher than the `value` being classified, or "very high"
 *   if all bucket values are smaller than the `value` being classified. If
 *   `buckets` is an object, its values will be sorted, and the returned
 *   category will be the key of the first bucket value that is higher than the
 *   `value` being classified, or the key of the highest bucket value if the
 *   `value` being classified is higher than all the values in `buckets`.
 *
 * @return {String}
 *   The category into which the numeric input was classified.
 */
function numberToCategory(value, buckets) {
    if (!buckets) {
        buckets = [-2, -2 / 3, 2 / 3, 2];
    }
    if (typeof buckets.length === "number" && buckets.length > 3) {
        if (value < buckets[0]) return "very low";
        if (value < buckets[1]) return "low";
        if (value < buckets[2]) return "medium";
        if (value < buckets[3]) return "high";
        if (value >= buckets[3]) return "very high";
    }
    let keys = Object.keys(buckets).sort(function (a, b) {
            return buckets[a] - buckets[b];
        }),
        l = keys.length;
    for (let i = 0; i < l; i++) {
        if (value < buckets[keys[i]]) {
            return keys[i];
        }
    }
    return keys[l - 1];
}
