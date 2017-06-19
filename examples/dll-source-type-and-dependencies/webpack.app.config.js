var webpack = require("../../");
var path = require("path");

module.exports = {
	target: "node",
	entry: {
		app: ["./example-app"],
	},
	output: {
		filename: "app.bundle.js",
		path: path.resolve(__dirname, "./js"),
		libraryTarget: "commonjs2",
	},
	plugins: [
		new webpack.DllReferencePlugin({
			context: ".",
			manifest: require("./js/vendor-manifest.json"), // eslint-disable-line
		}),
		new webpack.DllReferencePlugin({
			context: ".",
			manifest: require("./js/dependencies-manifest.json"), // eslint-disable-line
		})
	]
};
