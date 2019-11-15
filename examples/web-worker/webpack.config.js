module.exports = {
	// mode: "development" || "production",
	module: {
		rules: [
			{
				test: /worker\.js$/,
				use: {
					loader: "worker-loader",
					options: {
						name: "hash.worker.js"
					}
				}
			}
		]
	},
	optimization: {
		chunkIds: "size" // To keep filename consistent between different modes (for example building only)
	}
};
