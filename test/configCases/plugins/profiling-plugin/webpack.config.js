var rootPath = "../../../../";
var webpack = require(rootPath);
var path = require("path");

module.exports = (env, { testPath }) => ({
	plugins: [
		new webpack.debug.ProfilingPlugin({
			outPath: path.join(testPath, "events.json")
		})
	],
	node: {
		__dirname: false,
		__filename: false
	}
});
