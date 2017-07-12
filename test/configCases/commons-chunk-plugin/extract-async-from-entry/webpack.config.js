var CommonsChunkPlugin = require("../../../../lib/optimize/CommonsChunkPlugin");
module.exports = {
	entry: {
		main: "./index",
		second: "./index"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	plugins: [
		new CommonsChunkPlugin({
			minChunks: Infinity,
			name: "manifest"
		}),
		new CommonsChunkPlugin({
			async: "async",
			minChunks: 2
		})
	]
};
