module.exports = {
	mode: "production",
	entry: "./index",
	output: {
		chunkFilename: "[name].js"
	},
	performance: false
};
