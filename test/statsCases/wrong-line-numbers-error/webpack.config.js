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
	stats: "errors-only"
};
