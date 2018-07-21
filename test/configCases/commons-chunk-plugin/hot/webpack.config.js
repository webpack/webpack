var CommonsChunkPlugin = require("../../../../lib/optimize/CommonsChunkPlugin");
var HotModuleReplacementPlugin = require("../../../../lib/HotModuleReplacementPlugin");
module.exports = {
	entry: {
		vendor: ["./vendor"],
		main: "./index"
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
