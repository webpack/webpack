/// <reference path="../webpack.d.ts" />

let config: Webpack = {
    entry: {
        alpha: "./alpha",
        beta: "./beta"
    },
    module: {
        loaders: [
            {
                test: /\.json$/,
                loader: "json"
            }
        ]
    }
};