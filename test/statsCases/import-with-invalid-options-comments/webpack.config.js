module.exports = {
	mode: "production",
	entry: "./index",
	output: {
		chunkFilename: "[name].js"
	},
	stats: "minimal"
};
