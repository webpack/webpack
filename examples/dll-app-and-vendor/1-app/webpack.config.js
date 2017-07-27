var path = require("path");
var webpack = require("../../../");

module.exports = {
	context: __dirname,
	entry: "./example-app",
	output: {
		filename: "app.js",
		path: path.resolve(__dirname, "js"),
	},
	plugins: [
		new webpack.DllReferencePlugin({
			context: ".",
			manifest: require("../0-vendor/js/vendor-manifest.json"), // eslint-disable-line
		}),
	],
};
