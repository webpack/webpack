"use strict";

const RuntimeGlobals = require("../../../../lib/RuntimeGlobals");

const PLUGIN_NAME = "OnChunksLoadedPriorityTestPlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
					compilation.hooks.additionalTreeRuntimeRequirements.tap(
						PLUGIN_NAME,
						(chunk, set) => {
							set.add(RuntimeGlobals.global);
							set.add(RuntimeGlobals.onChunksLoaded);
							compilation.addLazyRuntimeModule(
								chunk,
								() =>
									Promise.resolve(require("./DeferredPriorityRuntimeModule")),
								(DeferredPriorityRuntimeModule) =>
									new DeferredPriorityRuntimeModule()
							);
						}
					);
				});
			}
		}
	]
};
