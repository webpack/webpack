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
	optimization: {
		splitChunks: {
			minSize: 1,
			name: "vendor"
		}
	},
	plugins: [new HotModuleReplacementPlugin()]
};
