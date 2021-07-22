module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].web.js",
		crossOriginLoading: "anonymous",
		trustedTypes: true
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	}
};
