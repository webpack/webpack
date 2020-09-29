module.exports = {
	// mode: "development" || "production",
	module: {
		rules: [
			{
				test: /worker\.js$/,
				use: {
					loader: "worker-loader",
					options: {
						filename: "fullhash.worker.js"
					}
				}
			}
		]
	},
	optimization: {
		chunkIds: "size" // To keep filename consistent between different modes (for example building only)
	}
};
