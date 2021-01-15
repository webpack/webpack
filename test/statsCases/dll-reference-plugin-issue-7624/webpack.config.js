var webpack = require("../../../");

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./entry.js",
	output: {
		filename: "bundle.js"
	},
	plugins: [
		new webpack.DllReferencePlugin({
			manifest: __dirname + "/non-blank-manifest.json",
			name: "non-blank-manifest"
		})
	]
};
