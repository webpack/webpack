var webpack = require("../../");
module.exports = {
	// mode: "development" || "production",
	plugins: [
		new webpack.LoaderOptionsPlugin({
			options: {
				worker: {
					output: {
						filename: "hash.worker.js",
						chunkFilename: "[id].hash.worker.js"
					}
				}
			}
		})
	],
	optimization: {
		occurrenceOrder: true // To keep filename consistent between different modes (for example building only)
	}
};
