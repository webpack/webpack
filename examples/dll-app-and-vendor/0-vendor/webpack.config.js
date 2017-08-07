var path = require("path");
var webpack = require("../../../");

module.exports = {
	context: __dirname,
	entry: ["example-vendor"],
	output: {
		filename: "vendor.js", // best use [hash] here too
		path: path.resolve(__dirname, "js"),
		library: "vendor_lib_[hash]",
	},
	plugins: [
		new webpack.DllPlugin({
			name: "vendor_lib_[hash]",
			path: path.resolve(__dirname, "js/vendor-manifest.json"),
		}),
	],
};
