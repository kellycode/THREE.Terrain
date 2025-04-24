import * as THREE from "three";

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
