"use strict";

const sharedServer = require("../../lazy-compilation/shared-server/webpack.config");

/** @returns {import("webpack").Configuration} shared server with module output */
module.exports = () => ({
	...sharedServer(),
	output: {
		module: true,
		chunkFormat: "module"
	}
});
