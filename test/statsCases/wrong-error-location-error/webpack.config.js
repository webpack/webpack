/** @type {import("../../../../").Configuration} */

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
