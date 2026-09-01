"use strict";

// A module rebuilt in place must not carry the previous build's init fragments.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	devtool: false,
	experiments: { outputModule: true },
	output: { module: true },
	node: { __dirname: "node-module" }
};
