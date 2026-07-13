"use strict";

/**
 * Mimics ids restored from records: pins `./other.js` to the id `./mod.js0`
 * and reserves the base name `./mod.js` (so `./mod.js` needs a numbered id).
 * @type {import("../../../../").WebpackPluginInstance}
 */
const reserveIds = {
	apply(compiler) {
		compiler.hooks.compilation.tap("ReserveIds", (compilation) => {
			compilation.hooks.moduleIds.tap(
				{ name: "ReserveIds", stage: -100 },
				() => {
					const { chunkGraph } = compilation;
					for (const module of compilation.modules) {
						const resource =
							/** @type {import("../../../../").NormalModule} */ (module)
								.resource;
						if (
							resource &&
							resource.replace(/\?.*$/, "").endsWith("other.js")
						) {
							chunkGraph.setModuleId(module, "./mod.js0");
						}
					}
					if (!compilation.usedModuleIds) {
						compilation.usedModuleIds = new Set();
					}
					compilation.usedModuleIds.add("./mod.js");
				}
			);
		});
	}
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		moduleIds: "named"
	},
	plugins: [reserveIds]
};
