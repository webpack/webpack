var CommonsChunkPlugin = require("../../../../lib/optimize/CommonsChunkPlugin");

module.exports = {
	entry: {
		main: "./index",
		misc: "./second",
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		new CommonsChunkPlugin({
			name: "main",
			minChunks: 2,
			children: true,
			deepChildren: true,
		})
	]
};
