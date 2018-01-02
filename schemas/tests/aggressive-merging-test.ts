/// <reference path="../webpack.d.ts" />

let config: Webpack = {
    entry: {
        pageA: "./pageA",
        pageB: "./pageB",
        pageC: "./pageC"
    },
    output: {
        path: "",
        filename: "[name].bundle.js",
        chunkFilename: "[id].chunk.js"
    },
    plugins: [
        new Object({
            minSizeReduce: 1.5,
            moveToParents: true
        })
    ]
};