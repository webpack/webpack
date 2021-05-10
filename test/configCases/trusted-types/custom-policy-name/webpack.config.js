module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].web.js",
		crossOriginLoading: "anonymous",
		trustedTypesPolicy: "customPolicyName"
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	}
};
