var webpack = require("webpack");
var path = require("path");

module.exports = {
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
			path: "js/vendor-manifest.json",
		})
	]
};
