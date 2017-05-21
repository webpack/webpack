var path = require("path");
var webpack = require("../../");

module.exports = {
	context: __dirname,
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
			manifest: require("./js/vendor-manifest.json"), // eslint-disable-line
		}),
	],
};
