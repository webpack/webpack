var path = require("path");
var webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: ["./index"],
	output: {
		filename: "dll.js",
		chunkFilename: "[id].dll.js",
		libraryTarget: "commonjs2"
	},
	module: {
		rules: [
			{
				test: /0-create-dll.(module|dependency)/,
				sideEffects: false
			}
		]
	},
	optimization: {
		usedExports: true,
		sideEffects: true
	},
	plugins: [
		new webpack.DllPlugin({
			path: path.resolve(
				__dirname,
				"../../../js/config/dll-plugin-side-effects/manifest0.json"
			),
			entryOnly: false
		})
	]
};
