"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	externals: { fs: "commonjs fs", "node:path": "commonjs node:path" },
	output: { libraryTarget: "commonjs2" }
};
