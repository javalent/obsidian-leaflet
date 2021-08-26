const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");
const InjectPlugin = require("webpack-inject-plugin").default;

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
                test: /leaflet(\.path|-hotline|-freedraw|-fullscreen|-editable)/,
                loader: "string-replace-loader",
                options: {
                    search: /(\.|\s|\()L\./g,
                    replace: (match, p1) => `${p1}window.OBSIDIAN_LEAFLET_PLUGIN.`
                }
                /* options: {
                    search: "this.dragging = new L.Handler.PathDrag(this);",
                    replace: "this.dragging = new window['obsidian-leaflet-plugin'].Handler.PathDrag(this)"
                } */
            },
            {
                test: /\.worker\.ts?$/,
                loader: "worker-loader",
                options: {
                    inline: "no-fallback",
                    worker: {
                        type: "Worker",
                        options: {
                            name: "Leaflet Image Loader",
                            esModule: false
                        }
                    }
                }
            },
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                options: {
                    transpileOnly: true
                }
            },
            {
                test: /\.css?$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader",
                        options: {
                            url: false
                        }
                    }
                ]
            },
            {
                test: /\.(svg|njk|html)$/,
                type: "asset/source"
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [{ from: "./manifest.json", to: "." }]
        }),
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1
        }),
        new MiniCssExtractPlugin({
            filename: "styles.css"
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
        obsidian: "commonjs2 obsidian",
        moment: "commonjs2 moment"
    }
};
