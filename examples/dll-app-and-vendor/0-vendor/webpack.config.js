var path = require("path");
var webpack = require("../../../");

module.exports = {
	// mode: "development || "production",
	context: __dirname,
	entry: ["example-vendor"],
	output: {
		filename: "vendor.js", // best use [fullhash] here too
		path: path.resolve(__dirname, "dist"),
		library: "vendor_lib_[fullhash]"
	},
	plugins: [
		new webpack.DllPlugin({
			name: "vendor_lib_[fullhash]",
			path: path.resolve(__dirname, "dist/vendor-manifest.json")
		})
	]
};
