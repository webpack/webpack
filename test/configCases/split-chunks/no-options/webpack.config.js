const { SplitChunksPlugin } = require("../../../../").optimize;

module.exports = {
	entry: {
		vendor: ["./a"],
		main: "./index"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	optimization: {
		splitChunks: false
	},
	plugins: [new SplitChunksPlugin()]
};
