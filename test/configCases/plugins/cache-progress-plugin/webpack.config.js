const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "[name][ext]"
	},
	plugins: [new webpack.ProgressPlugin(() => {})]
};
