"use strict";

const { RuntimeModule } = require("../../../../");

const PLUGIN_NAME = "ThrowingRuntimeModulePlugin";

class ThrowingRuntimeModule extends RuntimeModule {
	constructor() {
		super("throwing");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string} runtime code
	 */
	generate() {
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
							compilation.addRuntimeModule(chunk, new ThrowingRuntimeModule());
						}
					);
				});
			}
		}
	]
};
