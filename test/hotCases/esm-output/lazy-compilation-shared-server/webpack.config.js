"use strict";

const sharedServer = require("../../lazy-compilation/shared-server/webpack.config");

/** @import { Configuration } from "webpack" */

/** @returns {Configuration} shared server with module output */
module.exports = () => ({
	...sharedServer(),
	output: {
		module: true,
		chunkFormat: "module"
	}
});
