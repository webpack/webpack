"use strict";

const { RuntimeModule } = require("../../../../");

const PLUGIN_NAME = "ThrowingFullHashRuntimeModulePlugin";

class ThrowingFullHashRuntimeModule extends RuntimeModule {
	constructor() {
		super("throwing full hash", RuntimeModule.STAGE_TRIGGER);
		this.fullHash = true;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string} runtime code
	 */
	generate() {
		// The pre-hash pass has no full hash yet, so only the re-render after hashing
		// throws — which is the call site this case covers.
		if (!this.compilation || !this.compilation.fullHash) return "";
		throw new Error("generate of the throwing runtime module failed");
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
					compilation.hooks.additionalTreeRuntimeRequirements.tap(
						PLUGIN_NAME,
						(chunk) => {
							compilation.addRuntimeModule(
								chunk,
								new ThrowingFullHashRuntimeModule()
							);
						}
					);
				});
			}
		}
	]
};
