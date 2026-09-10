"use strict";

const { RuntimeModule } = require("../../../../");

const PLUGIN_NAME = "RuntimeModuleUpdateHashThrowPlugin";

class FailingRuntimeModule extends RuntimeModule {
	constructor() {
		super("failing runtime module");
	}

	generate() {
		throw new Error("error thrown in runtime module generate during hashing");
	}
}

/** @type {import("../../../../types").Configuration} */
module.exports = {
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
					compilation.hooks.additionalTreeRuntimeRequirements.tap(
						PLUGIN_NAME,
						(chunk) => {
							compilation.addRuntimeModule(chunk, new FailingRuntimeModule());
						}
					);
				});
			}
		}
	]
};
