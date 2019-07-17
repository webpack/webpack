module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].web.js",
		crossOriginLoading: "anonymous",
		trustedTypesPolicyName: "customPolicyName"
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	}
};
