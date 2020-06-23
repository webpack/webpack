const { ContainerReferencePlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].js",
		crossOriginLoading: "anonymous"
	},
	plugins: [
		new ContainerReferencePlugin({
			remoteType: "var",
			remotes: {
				remote: "REMOTE"
			}
		})
	],
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	}
};
