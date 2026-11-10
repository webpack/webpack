"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../types").Configuration} */
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
				Number(process.versions.node.split(".")[0])
			),
			EXPECTED: JSON.stringify(webpack.version)
		})
	]
};
