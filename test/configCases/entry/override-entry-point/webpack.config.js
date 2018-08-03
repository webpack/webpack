const SingleEntryPlugin = require("../../../../lib/SingleEntryPlugin");
module.exports = {
	entry: () => ({}),
	optimization: {
		runtimeChunk: true
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	target: "web",
	plugins: [
		new SingleEntryPlugin(__dirname, "./fail", "main"),
		new SingleEntryPlugin(__dirname, "./ok", "main")
	]
};
