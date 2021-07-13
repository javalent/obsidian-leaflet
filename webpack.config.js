const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");

const isDevMode = process.env.NODE_ENV === "development";

module.exports = {
    entry: "./src/main.ts",
    output: {
        path: path.resolve(__dirname, "."),
        filename: "main.js",
        libraryTarget: "commonjs"
    },
    target: "node",
    mode: isDevMode ? "development" : "production",
    ...(isDevMode ? { devtool: "eval" } : {}),
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                options: {
                    transpileOnly: true
                }
            },
            {
                test: /\.(jpe?g|png|gif)$/,
                use: "ignore-loader"
            },
            {
                test: /\.css?$/,
                loader: "css-loader"
            },
            {
                test: /\.(svg|njk|html)$/,
                type: "asset/source"
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: "./manifest.json", to: "." },
                { from: "./src/main.css", to: "./styles.css" }
            ]
        }),
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1
        })
    ],
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
        mainFields: ["browser", "module", "main"],
        alias: {
            src: path.resolve(__dirname, "src")
        }
    },
    externals: {
        electron: "commonjs2 electron",
        obsidian: "commonjs2 obsidian"
    }
};
