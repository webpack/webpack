"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: "./index",
	stats: { all: false, chunks: true, chunkOrigins: true },
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("Test", (compilation) => {
				compilation.hooks.afterSeal.tap("Test", () => {
					const entry = compilation.entrypoints.get("main");
					if (!entry) throw new Error("Missing main entry");
					entry.addOrigin(null, { name: "a,b" }, "c");
					entry.addOrigin(null, { name: "a" }, "b,c");
					entry.addOrigin(null, { name: "a,b" }, "c");
				});
			});
		}
	]
};
