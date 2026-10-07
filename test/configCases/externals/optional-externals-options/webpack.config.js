"use strict";

// the same fixture built once per variant
module.exports = [
	require("./optional-externals-cjs.config"),
	require("./optional-externals-root.config"),
	require("./optional-externals-umd.config"),
	require("./optional-externals-umd2.config")
];
