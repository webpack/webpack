const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("../../../../");

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
		minimizer: [new TerserPlugin()]
	},
	plugins: [
		new webpack.SourceMapDevToolPlugin({
			filename: "sourcemaps/[file].map",
			append: () => "\n//# sourceMappingURL=http://localhost:50505/[file].map"
		})
	]
};
