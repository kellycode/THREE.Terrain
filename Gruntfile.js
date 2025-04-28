module.exports = function (grunt) {
    var banner =
        "/**\n" +
        ' * THREE.Terrain.js <%= pkg.version %>-<%= grunt.template.today("yyyymmdd") %>\n' +
        " *\n" +
        " * @author <%= pkg.author %>\n" +
        " * @license <%= pkg.license %>\n" +
        " */\n\n" +
        // a location for external imports to be added
        "//external_imports;\n\n";
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        // start with command "grunt watch"
        watch: {
            files: [
                "src/T3_Brownian.js",
                "src/T3_Filters.js",
                "src/T3_Gaussian.js",
                "src/T3_Generators.js",
                "src/T3_Images.js",
                "src/T3_Influences.js",
                "src/T3_Materials.js",
                "src/T3_Noise.js",
                "src/T3_Preloader.js",
                "src/T3_Scatter.js",
                "src/T3_TerrainCore.js",
                "src/T3_Utility.js",
                "src/T3_Worley.js",
            ],
            tasks: ["concat", "replace", "uglify"]
          },
        concat: {
            options: {
                banner: banner + "\n",
                separator: grunt.util.linefeed,
            },
            target: {
                src: [
                    "src/T3_Brownian.js",
                    "src/T3_Filters.js",
                    "src/T3_Gaussian.js",
                    "src/T3_Generators.js",
                    "src/T3_Images.js",
                    "src/T3_Influences.js",
                    "src/T3_Materials.js",
                    "src/T3_Noise.js",
                    "src/T3_Preloader.js",
                    "src/T3_Scatter.js",
                    "src/T3_TerrainCore.js",
                    "src/T3_Utility.js",
                    "src/T3_Worley.js",
                ],
                dest: "build/T3_Bundle.js",
                nonull: true,
            },
        },
        replace: {
            replace_imports: {
                src: ["./build/T3_Bundle.js"], // source files array (supports minimatch)
                dest: "./build/T3_Bundle.js", // destination directory or file
                replacements: [
                    {
                        from: /import\s+.*?;/g, // remove all import statements
                        to: "",
                    },
                    {
                        from: "//external_imports;", // add the external imports we need
                        to:
                            'import * as THREE from "three";\n' +
                            'import Stats from "three/addons/libs/stats.module.js";\n' +
                            'import { OrbitControls } from "three/addons/controls/OrbitControls.js";\n\n',
                    },
                ],
            },
        },
        uglify: {
            options: {
                compress: {
                    dead_code: false,
                    side_effects: false,
                    unused: false,
                },
                mangle: true,
                report: "min",
                sourceMap: true,
                output: {
                    comments: true,
                },
            },
            target: {
                files: {
                    "./build/T3_Bundle.min.js": ["./build/T3_Bundle.js"],
                },
            },
        },
    });

    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-text-replace");
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask("default", ["concat", "replace", "uglify"]);

};
