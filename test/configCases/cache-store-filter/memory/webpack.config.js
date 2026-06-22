"use strict";

const { EntryPlugin } = require("../../../../");
const { CACHE_TYPES } = require("../../../../lib/CacheFacade");

/** @type {Set<string>} */
const seenTypes = new Set();
let skippedAssets = false;

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	cache: {
		type: "memory",
		storeFilter: (entry) => {
			seenTypes.add(entry.type);
			// skip caching generated assets
			if (entry.type === CACHE_TYPES.ASSETS) {
				skippedAssets = true;
				return false;
			}
			return true;
		}
	},
	plugins: [
		// Build a child compiler so the storeFilter also sees compilerPath-prefixed entries.
		{
			apply(compiler) {
				compiler.hooks.make.tapAsync("ChildPlugin", (compilation, callback) => {
					const child = compilation.createChildCompiler(
						"my-child",
						{ filename: "child-[name].js" },
						[new EntryPlugin(compiler.context, "./child.js", "childEntry")]
					);
					child.runAsChild((err) => callback(err));
				});
			}
		},
		{
			apply(compiler) {
				compiler.hooks.done.tap("AssertStoreFilter", () => {
					if (!seenTypes.has(CACHE_TYPES.MODULES)) {
						throw new Error(
							`storeFilter never received ${CACHE_TYPES.MODULES} (saw: ${[...seenTypes]})`
						);
					}
					if (!skippedAssets) {
						throw new Error(`storeFilter never received ${CACHE_TYPES.ASSETS}`);
					}
					// storeFilter must only be called for the known Compilation caches
					for (const type of seenTypes) {
						if (!type.startsWith("Compilation/")) {
							throw new Error(
								`storeFilter received non-Compilation type: ${type}`
							);
						}
					}
				});
			}
		}
	]
};
