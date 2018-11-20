/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("./RuntimeGlobals");
const Template = require("./Template");
const DefinePropertyGetterRuntimeModule = require("./runtime/DefinePropertyGetterRuntimeModule");
const MakeNamespaceObjectRuntimeModule = require("./runtime/MakeNamespaceObjectRuntimeModule");
const { compareIds } = require("./util/comparators");

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
					set.add(RuntimeGlobals.makeNamespaceObject);
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
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.makeNamespaceObject)
				.tap("RuntimePlugin", chunk => {
					compilation.addRuntimeModule(
						chunk,
						new MakeNamespaceObjectRuntimeModule()
					);
					return true;
				});
			compilation.mainTemplate.hooks.runtime.tap(
				"RuntimePlugin",
				(source, { chunk, chunkGraph }) => {
					const buf = [];
					if (chunkGraph.getNumberOfRuntimeModules(chunk) > 0) {
						buf.push("// Bootstrap all runtime modules");
						const runtimeModules = Array.from(
							chunkGraph.getChunkRuntimeModulesIterable(chunk),
							m => chunkGraph.getModuleId(m)
						);
						runtimeModules.sort(compareIds);
						for (const moduleId of runtimeModules) {
							buf.push(
								`modules[${JSON.stringify(moduleId)}](0,0,__webpack_require__);`
							);
						}
					}
					return Template.asString(buf);
				}
			);
		});
	}
}
module.exports = RuntimePlugin;
