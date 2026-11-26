"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
	output: {
		libraryTarget: "commonjs2"
	},
	externals: {
		external: ["webpack", "version"]
	},
	plugins: [
		new webpack.DefinePlugin({
			// Only the major: the full version would change the bundle with
			// every Node.js patch release the code-size report runs on.
			NODE_MAJOR_VERSION: JSON.stringify(
				Number(process.versions.node.split(".", 1)[0])
			),
			EXPECTED: JSON.stringify(webpack.version)
		})
	]
};
