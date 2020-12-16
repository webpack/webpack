var webpack = require("../../../../");
var TerserPlugin = require("terser-webpack-plugin");
/** @type {import("../../../../types").Configuration} */
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	entry: {
		bundle0: ["./index.js"],
		"some-test": ["./test.js"]
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
			append: data =>
				`\n//# sourceMappingURL=http://localhost:50505/${data.filename}.map`
		})
	]
};
