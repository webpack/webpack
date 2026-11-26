"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */
/** @import { RuntimeModule } from "../../../../" */

const PLUGIN_NAME = "AddLazyRuntimeModuleErrorTestPlugin";

/** @type {Configuration} */
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
								() => Promise.reject(new Error("runtime module load failed")),
								(/** @type {new () => RuntimeModule} */ Ctor) => new Ctor()
							);
						}
					);
				});
			}
		}
	]
};
