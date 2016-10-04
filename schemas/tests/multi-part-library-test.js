/// <reference path="../webpack.d.ts" />
var config = {
    entry: {
        alpha: "./alpha",
        beta: "./beta"
    },
    output: {
        path: "js",
        filename: "MyLibrary.[name].js",
        library: ["MyLibrary", "[name]"],
        libraryTarget: "umd"
    }
};
