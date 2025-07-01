const path = require("path");
const webpack = require("../../../");

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./entry.js",
	output: {
		filename: "bundle.js"
	},
	plugins: [
		new webpack.DllReferencePlugin({
			manifest: path.resolve(__dirname, "./blank-manifest.json"),
			name: "blank-manifest"
		})
	]
};
