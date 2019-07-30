var NamedChunksPlugin = require("../../../../lib/NamedChunksPlugin");

module.exports = {
	entry: {
		constructor: "./index"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	optimization: {
		runtimeChunk: "single",
		namedChunks: true
	},
	plugins: [new NamedChunksPlugin()]
};
