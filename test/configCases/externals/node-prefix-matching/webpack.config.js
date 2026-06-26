"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "bare-key",
		// external keyed without the prefix must still match a `node:` import
		target: "web",
		externals: { fs: "commonjs fs", path: "commonjs path" },
		output: { libraryTarget: "commonjs2" }
	},
	{
		name: "prefixed-key",
		// external keyed with the prefix must still match a bare import
		target: "web",
		externals: {
			"node:fs": "commonjs node:fs",
			"node:path": "commonjs node:path"
		},
		output: { libraryTarget: "commonjs2" }
	}
];
