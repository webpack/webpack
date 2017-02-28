var CommonsChunkPlugin = require("../../../../lib/optimize/CommonsChunkPlugin");
module.exports = {
	entry: {
		bundle0: "./index"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	plugins: [
		new CommonsChunkPlugin({
			name: "bundle0",
			children: true,
			minChunks: 1
		})
	]
};
