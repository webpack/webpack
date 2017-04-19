var webpack = require("webpack");
var path = require("path");

module.exports = {
	target: "node",
	entry: {
		dependencies: ["lodash"],
		vendor: ["./example-vendor"],
	},
	output: {
		filename: "[name].bundle.js",
		path: path.resolve(__dirname, "./js"),
		library: "[name]_lib",
		libraryTarget: "commonjs2",
	},
	plugins: [
		new webpack.DllPlugin({
			context: ".",

      // The name of the global variable which the library's
      // require function has been assigned to. This must match the
      // output.library option above
			name: "[name]_dll_lib",

      // The path to the manifest file which maps between
      // modules included in a bundle and the internal IDs
      // within that bundle
			path: "./js/[name]-manifest.json",

			// must match output libraryTarget
			sourceType: "commonjs2"
		})
	]
};
