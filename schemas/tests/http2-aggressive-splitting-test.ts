/// <reference path="../webpack.d.ts" />

let config: Webpack = {
    entry: "./example",
    output: {
        path: "js",
        filename: "[chunkhash].js",
        chunkFilename: "[chunkhash].js"
    },
    plugins: [
        new Object({
            minSize: 30000,
            maxSize: 50000
        }),
        new Object({
            "process.env.NODE_ENV": JSON.stringify("production")
        })
    ],
    recordsOutputPath: "records.json"
};