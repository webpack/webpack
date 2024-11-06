/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].js",
		crossOriginLoading: "anonymous"
	},
	optimization: {
		minimize: false,
		splitChunks: {
			minSize: 1
		}
	},
	module: {
		rules: [
			{
				test: /d\.js$/,
				parser: {
					javascript: {
						dynamicImportFetchPriority: "low"
					}
				}
			}
		]
	}
};
