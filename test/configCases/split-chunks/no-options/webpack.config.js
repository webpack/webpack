const SplitChunksPlugin = require("../../../../lib/optimize/SplitChunksPlugin");

module.exports = {
	entry: {
		vendor: ["./a"],
		main: "./index"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	plugins: [new SplitChunksPlugin()]
};
