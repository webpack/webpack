module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].web.js",
		crossOriginLoading: "anonymous",
		trustedTypesPolicyName: "" // Skip Trusted Types.
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	}
};
