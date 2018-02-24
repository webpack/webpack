var rootPath = "../../../../";
var webpack = require(rootPath);
var path = require("path");
var os = require("os");

module.exports = {
	plugins: [
		new webpack.debug.ProfilingPlugin({
			outputPath: path.join(os.tmpdir(), "events.json")
		})
	],
	node: {
		__dirname: false,
		__filename: false
	}
};
