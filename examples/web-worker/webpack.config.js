var webpack = require("../../");
module.exports = {
	mode: "production",
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
	]
};
