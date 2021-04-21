module.exports = {
	output: {
		filename: "[name].js",
		chunkFilename: "chunk.[name].js",
		enabledChunkLoadingTypes: ["import-scripts"]
	},
	target: "web"
};
