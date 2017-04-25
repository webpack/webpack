var path = require("path");
var webpack = require("../../");

module.exports = {
	context: __dirname,

	entry: {
		// these entries can also point to dependencies,
		// which can significantly boost build time in the app bundle
		vendor: ["./example-vendor"],
	},
	output: {
		filename: "vendor.bundle.js",
		path: path.resolve(__dirname, "./js"),
		library: "vendor_lib",
	},
	plugins: [
		new webpack.DllPlugin({
			name: "vendor_lib",
			path: path.resolve(__dirname, "js/vendor-manifest.json"),
		}),
	],
};
