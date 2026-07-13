"use strict";

/**
 * Mimics ids restored from records: pins `./third.js` to the id `./mod.js`
 * (so `./mod.js` needs a numbered id) and `./other.js` to `./mod.js0`.
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
						if (!resource) continue;
						const base = resource.replace(/\?.*$/, "");
						if (base.endsWith("other.js")) {
							chunkGraph.setModuleId(module, "./mod.js0");
						} else if (base.endsWith("third.js")) {
							chunkGraph.setModuleId(module, "./mod.js");
						}
					}
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
