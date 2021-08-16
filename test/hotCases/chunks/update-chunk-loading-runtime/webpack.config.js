module.exports = ({ config }) => ({
	output: {
		filename: "[name].js"
	},
	optimization: {
		runtimeChunk: config.target !== "webworker",
		splitChunks: {
			chunks: "all",
			minSize: 0
		}
	}
});
