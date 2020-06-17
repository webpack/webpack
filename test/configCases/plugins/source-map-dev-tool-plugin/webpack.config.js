var webpack = require("../../../../");
var TerserPlugin = require("terser-webpack-plugin");
/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		bundle0: ["./index.js"],
		"public/test": ["./test.js"]
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		minimizer: [
			new TerserPlugin({
				sourceMap: true
			})
		]
	},
	plugins: [
		new webpack.SourceMapDevToolPlugin({
			filename: "sourcemaps/[file].map",
			publicPath: "https://10.10.10.10/project/",
			fileContext: "public"
		})
	]
};
