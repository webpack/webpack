/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("./RuntimeGlobals");
const DefinePropertyGetterRuntimeModule = require("./runtime/DefinePropertyGetterRuntimeModule");

/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Module")} Module */

const NEED_REQUIRE = [
	RuntimeGlobals.chunkName,
	RuntimeGlobals.compatGetDefaultExport,
	RuntimeGlobals.createFakeNamespaceObject,
	RuntimeGlobals.definePropertyGetter,
	RuntimeGlobals.ensureChunk,
	RuntimeGlobals.entryModuleId,
	RuntimeGlobals.getFullHash,
	RuntimeGlobals.hasOwnProperty,
	RuntimeGlobals.makeNamespaceObject,
	RuntimeGlobals.moduleCache,
	RuntimeGlobals.moduleFactories,
	RuntimeGlobals.publicPath,
	RuntimeGlobals.scriptNonce,
	RuntimeGlobals.uncaughtErrorHandler,
	RuntimeGlobals.wasmInstances
];

class RuntimePlugin {
	/**
	 * @param {Compiler} compiler the Compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("RuntimePlugin", compilation => {
			for (const req of NEED_REQUIRE) {
				compilation.hooks.runtimeRequirementInModule
					.for(req)
					.tap("RuntimePlugin", (module, set) => {
						set.add(RuntimeGlobals.require);
					});
			}
			compilation.hooks.runtimeRequirementInModule
				.for(RuntimeGlobals.createFakeNamespaceObject)
				.tap("RuntimePlugin", (module, set) => {
					set.add(RuntimeGlobals.definePropertyGetter);
				});
			compilation.hooks.runtimeRequirementInModule
				.for(RuntimeGlobals.compatGetDefaultExport)
				.tap("RuntimePlugin", (module, set) => {
					set.add(RuntimeGlobals.definePropertyGetter);
				});
			compilation.hooks.runtimeRequirementInModule
				.for(RuntimeGlobals.definePropertyGetter)
				.tap("RuntimePlugin", (module, set) => {
					set.add(RuntimeGlobals.hasOwnProperty);
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.definePropertyGetter)
				.tap("RuntimePlugin", chunk => {
					compilation.addRuntimeModule(
						chunk,
						new DefinePropertyGetterRuntimeModule()
					);
					return true;
				});
		});
	}
}
module.exports = RuntimePlugin;
