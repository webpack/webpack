module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].web.js",
		crossOriginLoading: "anonymous",
		trustedTypes: {
			policyName: "CustomPolicyName",
			onPolicyCreationFailure: "continue"
		}
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	}
};
