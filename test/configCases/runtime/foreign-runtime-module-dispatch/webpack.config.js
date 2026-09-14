"use strict";

const RuntimeGlobals = require("../../../../lib/RuntimeGlobals");
const RuntimeModule = require("../../../../lib/RuntimeModule");

const PLUGIN_NAME = "ForeignRuntimeModuleTestPlugin";

class ForeignChunkHandlerRuntimeModule extends RuntimeModule {
	constructor() {
		super("foreign chunk handler", RuntimeModule.STAGE_ATTACH);
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string} runtime code
	 */
	generate() {
		return `${RuntimeGlobals.ensureChunkHandlers}.foreign = function(chunkId, promises) { global.__foreignHandlerCalled = true; };`;
	}
}

// A module built against an older webpack extends a base class predating
// `getInstalledChunkHandlers`, so looking it up on the instance finds nothing.
ForeignChunkHandlerRuntimeModule.prototype.getInstalledChunkHandlers =
	undefined;

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	output: { filename: "[name].js" },
	optimization: { runtimeChunk: "single", chunkIds: "named" },
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
					compilation.hooks.additionalTreeRuntimeRequirements.tap(
						PLUGIN_NAME,
						(chunk, set) => {
							set.add(RuntimeGlobals.ensureChunkHandlers);
							compilation.addRuntimeModule(
								chunk,
								new ForeignChunkHandlerRuntimeModule()
							);
						}
					);
				});
			}
		}
	]
};
