var webpack = require("../../../../");
var TerserPlugin = require("terser-webpack-plugin");
/** @type {import("../../../../").Configuration} */
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	entry: {
		bundle0: ["./index.js"],
		"public/test": ["./test.js"]
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		minimizer: [new TerserPlugin()]
	},
	plugins: [
		new webpack.SourceMapDevToolPlugin({
			filename: "sourcemaps/[file].map",
			publicPath: "https://10.10.10.10/project/",
			fileContext: "public"
		})
	]
};
