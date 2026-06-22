"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["node", "web"],
	output: { module: true },
	experiments: { outputModule: true, sourceImport: true },
	externals: {
		// resolvable on both platforms so the source-phase import runs everywhere
		srcVar: "var 1 + 2",
		srcGlobal: "global globalThis"
	}
};
