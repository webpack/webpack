/** @type {import("../../../types").Configuration} */

module.exports = {
	entry: "./index",
	module: {
		rules: [
			{
				test: /\.js$/,
				use: "./sampleLoader.js"
			}
		]
	},
	devtool: "source-map",
	stats: "errors-only"
};
