var path = require('path');
var JsonpErrorHandlingPlugin = require("../../lib/JsonpErrorHandlingPlugin");

module.exports = {
	entry: "./example",
	output: {
		path: path.join(__dirname, "js"),
		filename: "output.js",
		chunkFilename: "[name].chunk.output.js",
		jsonpLoadTimeout: 10 * 1000 // default 60 sec
	},
	plugins: [
		new JsonpErrorHandlingPlugin()
	]
}
