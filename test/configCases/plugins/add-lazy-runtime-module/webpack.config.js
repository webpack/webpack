"use strict";

const PLUGIN_NAME = "AddLazyRuntimeModuleTestPlugin";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
					compilation.hooks.additionalTreeRuntimeRequirements.tap(
						PLUGIN_NAME,
						(chunk) => {
							compilation.addLazyRuntimeModule(
								chunk,
								() => Promise.resolve(require("./MarkerRuntimeModule")),
								(MarkerRuntimeModule) => new MarkerRuntimeModule()
							);
						}
					);
				});
			}
		}
	]
};
