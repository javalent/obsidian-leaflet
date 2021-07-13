import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import css from "rollup-plugin-css-only";
import image from "@rollup/plugin-image";
import inject from "@rollup/plugin-inject";

export default {
    input: "./src/main.ts",
    output: {
        dir: ".",
        sourcemap: "inline",
        sourcemapExcludeSources: true,
        format: "cjs",
        exports: "default"
    },
    external: ["obsidian"],
    plugins: [
        /* inject({ L: ["leaflet", "*"], include: "*.js", exclude: "*.ts" }), */
        typescript(),
        nodeResolve({ browser: true }),
        commonjs(),
        css({ output: "styles.css" }),
        image()
    ]
};
