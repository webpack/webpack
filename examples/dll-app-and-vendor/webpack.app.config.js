var webpack = require("../../");
var path = require("path");

module.exports = {
	entry: {
		app: ["./example-app"],
	},
	output: {
		filename: "app.bundle.js",
		path: path.resolve(__dirname, "./js"),
	},
	plugins: [
		new webpack.DllReferencePlugin({
			context: ".",
			manifest: require("./js/vendor-manifest.json"),
		})
	]
};
