"use strict";

const { RuntimeModule } = require("../../../../");

const PLUGIN_NAME = "ThrowingNonErrorRuntimeModulePlugin";

class ThrowingNonErrorRuntimeModule extends RuntimeModule {
	constructor() {
		super("throwing non error");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string} runtime code
	 */
	generate() {
		// eslint-disable-next-line no-throw-literal
		throw "generate of the throwing runtime module failed";
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
								new ThrowingNonErrorRuntimeModule()
							);
						}
					);
				});
			}
		}
	]
};
