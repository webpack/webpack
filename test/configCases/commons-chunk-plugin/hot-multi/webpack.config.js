var CommonsChunkPlugin = require("../../../../lib/optimize/CommonsChunkPlugin");
var HotModuleReplacementPlugin = require("../../../../lib/HotModuleReplacementPlugin");
module.exports = {
	entry: {
		vendor: ["./vendor"],
		first: ["./shared", "./first"],
		second: ["./shared", "./second"]
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	plugins: [
		new CommonsChunkPlugin({
			name: "vendor"
		}),
		new HotModuleReplacementPlugin()
	]
};
