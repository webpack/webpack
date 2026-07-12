/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import formatLocation from "../util/formatLocation.js";
import UnsupportedWebAssemblyFeatureError from "./UnsupportedWebAssemblyFeatureError.js";
/** @typedef {import("../Compiler.js").default} Compiler */
/** @typedef {import("../Dependency.js").default} Dependency */
/** @typedef {import("../Module.js").default} Module */
/** @typedef {import("../Module.js").BuildMeta} BuildMeta */
/** @typedef {import("./SyncWasmModule.js").SyncWasmModuleBuildMeta} SyncWasmModuleBuildMeta */

const PLUGIN_NAME = "WasmFinalizeExportsPlugin";

class WasmFinalizeExportsPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.finishModules.tap(PLUGIN_NAME, (modules) => {
				for (const module of modules) {
					// 1. if a WebAssembly module
					if (module.type.startsWith("webassembly") === true) {
						const jsIncompatibleExports =
							/** @type {SyncWasmModuleBuildMeta} */
							(module.buildMeta).jsIncompatibleExports;

						if (jsIncompatibleExports === undefined) {
							continue;
						}

						for (const connection of compilation.moduleGraph.getIncomingConnections(
							module
						)) {
							// 2. is active and referenced by a non-WebAssembly module
							if (
								connection.isTargetActive(undefined) &&
								/** @type {Module} */
								(connection.originModule).type.startsWith("webassembly") ===
									false
							) {
								const referencedExports =
									compilation.getDependencyReferencedExports(
										/** @type {Dependency} */ (connection.dependency),
										undefined
									);

								for (const info of referencedExports) {
									const names = Array.isArray(info) ? info : info.name;
									if (names.length === 0) continue;
									const name = names[0];
									if (typeof name === "object") continue;
									// 3. and uses a func with an incompatible JS signature
									if (Object.hasOwn(jsIncompatibleExports, name)) {
										// 4. error
										const error = new UnsupportedWebAssemblyFeatureError(
											`Export "${name}" with ${jsIncompatibleExports[name]} can only be used for direct wasm to wasm dependencies\n` +
												`It's used from ${
													/** @type {Module} */
													(connection.originModule).readableIdentifier(
														compilation.requestShortener
													)
												} at ${formatLocation(
													/** @type {Dependency} */ (connection.dependency).loc
												)}.`
										);
										error.module = module;
										compilation.errors.push(error);
									}
								}
							}
						}
					}
				}
			});
		});
	}
}

export default WasmFinalizeExportsPlugin;

export { WasmFinalizeExportsPlugin as "module.exports" };
