"use strict";

const RuntimeGlobals = require("../../../../lib/runtime/RuntimeGlobals");

/** @import { Configuration } from "../../../../types.d.ts" */

const PLUGIN_NAME = "AddLazyRuntimeModuleTestPlugin";

/** @type {Configuration} */
module.exports = {
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
					compilation.hooks.additionalTreeRuntimeRequirements.tap(
						PLUGIN_NAME,
						(chunk, set) => {
							set.add(RuntimeGlobals.global);
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
