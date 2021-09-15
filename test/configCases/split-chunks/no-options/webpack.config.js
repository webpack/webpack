const { SplitChunksPlugin } = require("../../../../").optimize;

/** @type {import("../../../../").Configuration} */
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
