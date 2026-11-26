"use strict";

const path = require("path");
const LibManifestPlugin = require("../../../../").LibManifestPlugin;

/** @import { Configuration } from "../../../../" */

/** @type {(env: Env, options: TestOptions) => Configuration} */
module.exports = (env, { testPath }) => ({
	entry: {
		bundle0: ["./"]
	},
	plugins: [
		new LibManifestPlugin({
			path: path.resolve(testPath, "[name]-manifest.json"),
			name: "[name]_[fullhash]"
		})
	],
	node: {
		__dirname: false
	}
});
