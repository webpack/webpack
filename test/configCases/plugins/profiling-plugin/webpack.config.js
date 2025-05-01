const rootPath = "../../../../";
const webpack = require(rootPath);
const path = require("path");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => ({
	plugins: [
		new webpack.debug.ProfilingPlugin({
			outputPath: path.join(testPath, "in/directory/events.json")
		})
	],
	node: {
		__dirname: false,
		__filename: false
	}
});
