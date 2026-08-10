"use strict";

const IgnorePlugin = require("../../../../").IgnorePlugin;

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	entry: "./index.js",
	plugins: [
		new IgnorePlugin({
			resourceRegExp: /ignored-module/,
			contextRegExp: /folder-b/
		})
	],
	optimization: {
		minimize: false,
		moduleIds: "named",
		mangleExports: false,
		usedExports: true,
		sideEffects: true,
		concatenateModules: false
	}
};
