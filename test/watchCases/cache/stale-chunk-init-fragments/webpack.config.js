"use strict";

/** @import { Configuration } from "../../../../" */

// A module rebuilt in place must not carry the previous build's init fragments.
/** @type {Configuration} */
module.exports = {
	target: "node",
	devtool: false,
	output: { module: true },
	node: { __dirname: "node-module" }
};
