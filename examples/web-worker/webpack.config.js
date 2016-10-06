var webpack = require("../../");
module.exports = {
	worker: {
		output: {
			filename: "hash.worker.js",
			chunkFilename: "[id].hash.worker.js"
		}
	}
}
