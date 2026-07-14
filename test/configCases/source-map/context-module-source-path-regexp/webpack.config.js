"use strict";

const webpack = require("../../../../");

module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	devtool: "source-map",
	plugins: [new webpack.ContextReplacementPlugin(/foo$/, true, /(?:a|b)\.js$/)]
};
