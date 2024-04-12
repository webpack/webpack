const webpack = require("../../../../");
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		publicPath: "",
		filename: "bundle0.mjs",
		chunkFilename: "[name].js"
	},
	experiments: {
		css: true
	},
	// plugin that intercepts __webpack_require__
	plugins: [new webpack.HotModuleReplacementPlugin()]
};
