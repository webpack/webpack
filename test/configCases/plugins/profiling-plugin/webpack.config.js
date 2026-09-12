"use strict";

const rootPath = "../../../../";

const webpack = require(rootPath);
const path = require("path");
const { pathToFileURL } = require("url");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => ({
	plugins: [
		new webpack.debug.ProfilingPlugin({
			// A file URL, the form `import.meta.resolve()` returns, names the
			// same path the assertions read the trace back from
			outputPath: pathToFileURL(path.join(testPath, "in/directory/events.json"))
				.href
		})
	],
	node: {
		__dirname: false,
		__filename: false
	}
});
