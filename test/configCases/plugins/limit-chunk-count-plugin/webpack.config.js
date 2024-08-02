var webpack = require("../../../../");
/** @type {import("../../../../").Configuration} */
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	entry: "./index.js",
	output: {
		filename: "[name].js"
	},
	plugins: [new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 })]
};
