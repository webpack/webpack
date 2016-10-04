/// <reference path="../webpack.d.ts" />
var config = {
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
