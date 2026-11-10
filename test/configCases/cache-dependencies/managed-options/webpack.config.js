"use strict";

// the same fixture built once per variant
module.exports = [
	require("./managed-items.config"),
	require("./managed-items-unsafe-cache.config"),
	...require("./managed-paths-regexp.config")
];
