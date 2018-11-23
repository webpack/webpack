/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("./RuntimeGlobals");
const Template = require("./Template");
const CompatGetDefaultExportRuntimeModule = require("./runtime/CompatGetDefaultExportRuntimeModule");
const CreateFakeNamespaceObjectRuntimeModule = require("./runtime/CreateFakeNamespaceObjectRuntimeModule");
const DefinePropertyGetterRuntimeModule = require("./runtime/DefinePropertyGetterRuntimeModule");
const EnsureChunkRuntimeModule = require("./runtime/EnsureChunkRuntimeModule");
const GetChunkFilenameRuntimeModule = require("./runtime/GetChunkFilenameRuntimeModule");
const MakeNamespaceObjectRuntimeModule = require("./runtime/MakeNamespaceObjectRuntimeModule");
const PublicPathRuntimeModule = require("./runtime/PublicPathRuntimeModule");
const {
	concatComparators,
	compareSelect,
	compareIds
} = require("./util/comparators");

/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Module")} Module */

const DEPENDENCIES = {
	[RuntimeGlobals.chunkName]: [RuntimeGlobals.require],
	[RuntimeGlobals.compatGetDefaultExport]: [
		RuntimeGlobals.require,
		RuntimeGlobals.definePropertyGetter
	],
	[RuntimeGlobals.createFakeNamespaceObject]: [
		RuntimeGlobals.require,
		RuntimeGlobals.definePropertyGetter,
		RuntimeGlobals.makeNamespaceObject
	],
	[RuntimeGlobals.definePropertyGetter]: [RuntimeGlobals.require],
	[RuntimeGlobals.ensureChunk]: [RuntimeGlobals.require],
	[RuntimeGlobals.entryModuleId]: [RuntimeGlobals.require],
	[RuntimeGlobals.getFullHash]: [RuntimeGlobals.require],
	[RuntimeGlobals.makeNamespaceObject]: [RuntimeGlobals.require],
	[RuntimeGlobals.moduleCache]: [RuntimeGlobals.require],
	[RuntimeGlobals.moduleFactories]: [RuntimeGlobals.require],
	[RuntimeGlobals.publicPath]: [RuntimeGlobals.require],
	[RuntimeGlobals.scriptNonce]: [RuntimeGlobals.require],
	[RuntimeGlobals.uncaughtErrorHandler]: [RuntimeGlobals.require],
	[RuntimeGlobals.wasmInstances]: [RuntimeGlobals.require]
};

class RuntimePlugin {
	/**
	 * @param {Compiler} compiler the Compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("RuntimePlugin", compilation => {
			for (const req of Object.keys(DEPENDENCIES)) {
				const deps = DEPENDENCIES[req];
				compilation.hooks.runtimeRequirementInModule
					.for(req)
					.tap("RuntimePlugin", (module, set) => {
						for (const dep of deps) set.add(dep);
					});
			}
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
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.createFakeNamespaceObject)
				.tap("RuntimePlugin", chunk => {
					compilation.addRuntimeModule(
						chunk,
						new CreateFakeNamespaceObjectRuntimeModule()
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.compatGetDefaultExport)
				.tap("RuntimePlugin", chunk => {
					compilation.addRuntimeModule(
						chunk,
						new CompatGetDefaultExportRuntimeModule()
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.publicPath)
				.tap("RuntimePlugin", chunk => {
					compilation.addRuntimeModule(
						chunk,
						new PublicPathRuntimeModule(compilation)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.getChunkScriptFilename)
				.tap("RuntimePlugin", (chunk, set) => {
					if (/\[hash(:\d+)?\]/.test(compilation.outputOptions.chunkFilename))
						set.add(RuntimeGlobals.getFullHash);
					compilation.addRuntimeModule(
						chunk,
						new GetChunkFilenameRuntimeModule(
							compilation,
							chunk,
							"javascript",
							RuntimeGlobals.getChunkScriptFilename,
							compilation.outputOptions.chunkFilename
						)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.ensureChunk)
				.tap("RuntimePlugin", (chunk, set) => {
					const hasAsyncChunks = chunk.hasAsyncChunks();
					if (hasAsyncChunks) {
						set.add(RuntimeGlobals.ensureChunkHandlers);
					}
					compilation.addRuntimeModule(
						chunk,
						new EnsureChunkRuntimeModule(hasAsyncChunks)
					);
					return true;
				});
			compilation.mainTemplate.hooks.runtime.tap(
				"RuntimePlugin",
				(source, { chunk, chunkGraph }) => {
					const buf = [];
					const runtimeModules = Array.from(
						chunkGraph.getChunkRuntimeModulesIterable(chunk)
					);
					if (runtimeModules.length > 0) {
						buf.push("// Bootstrap all runtime modules");
						runtimeModules.sort(
							concatComparators(
								compareSelect(r => r.stage, compareIds),
								compareSelect(r => chunkGraph.getModuleId(r), compareIds)
							)
						);
						for (const module of runtimeModules) {
							buf.push(
								`// ${module.name}\nmodules[${JSON.stringify(
									chunkGraph.getModuleId(module)
								)}](0,0,__webpack_require__);`
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
