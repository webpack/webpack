/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("./RuntimeGlobals");
const RuntimeRequirementsDependency = require("./dependencies/RuntimeRequirementsDependency");
const JavascriptModulesPlugin = require("./javascript/JavascriptModulesPlugin");
const CompatGetDefaultExportRuntimeModule = require("./runtime/CompatGetDefaultExportRuntimeModule");
const CompatRuntimePlugin = require("./runtime/CompatRuntimePlugin");
const CreateFakeNamespaceObjectRuntimeModule = require("./runtime/CreateFakeNamespaceObjectRuntimeModule");
const DefinePropertyGettersRuntimeModule = require("./runtime/DefinePropertyGettersRuntimeModule");
const EnsureChunkRuntimeModule = require("./runtime/EnsureChunkRuntimeModule");
const GetChunkFilenameRuntimeModule = require("./runtime/GetChunkFilenameRuntimeModule");
const GetMainFilenameRuntimeModule = require("./runtime/GetMainFilenameRuntimeModule");
const GlobalRuntimeModule = require("./runtime/GlobalRuntimeModule");
const HasOwnPropertyRuntimeModule = require("./runtime/HasOwnPropertyRuntimeModule");
const MakeNamespaceObjectRuntimeModule = require("./runtime/MakeNamespaceObjectRuntimeModule");
const PublicPathRuntimeModule = require("./runtime/PublicPathRuntimeModule");
const SystemContextRuntimeModule = require("./runtime/SystemContextRuntimeModule");

/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Module")} Module */

const GLOBALS_ON_REQUIRE = [
	RuntimeGlobals.chunkName,
	RuntimeGlobals.compatGetDefaultExport,
	RuntimeGlobals.createFakeNamespaceObject,
	RuntimeGlobals.definePropertyGetters,
	RuntimeGlobals.ensureChunk,
	RuntimeGlobals.entryModuleId,
	RuntimeGlobals.getFullHash,
	RuntimeGlobals.global,
	RuntimeGlobals.makeNamespaceObject,
	RuntimeGlobals.moduleCache,
	RuntimeGlobals.moduleFactories,
	RuntimeGlobals.moduleFactoriesAddOnly,
	RuntimeGlobals.interceptModuleExecution,
	RuntimeGlobals.publicPath,
	RuntimeGlobals.scriptNonce,
	RuntimeGlobals.uncaughtErrorHandler,
	RuntimeGlobals.wasmInstances,
	RuntimeGlobals.instantiateWasm
];

const MODULE_DEPENDENCIES = {
	[RuntimeGlobals.moduleLoaded]: [RuntimeGlobals.module],
	[RuntimeGlobals.moduleId]: [RuntimeGlobals.module]
};

const TREE_DEPENDENCIES = {
	[RuntimeGlobals.definePropertyGetters]: [RuntimeGlobals.hasOwnProperty],
	[RuntimeGlobals.compatGetDefaultExport]: [
		RuntimeGlobals.definePropertyGetters
	],
	[RuntimeGlobals.createFakeNamespaceObject]: [
		RuntimeGlobals.definePropertyGetters,
		RuntimeGlobals.makeNamespaceObject,
		RuntimeGlobals.require
	]
};

class RuntimePlugin {
	/**
	 * @param {Compiler} compiler the Compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("RuntimePlugin", compilation => {
			compilation.dependencyTemplates.set(
				RuntimeRequirementsDependency,
				new RuntimeRequirementsDependency.Template()
			);
			for (const req of GLOBALS_ON_REQUIRE) {
				compilation.hooks.runtimeRequirementInModule
					.for(req)
					.tap("RuntimePlugin", (module, set) => {
						set.add(RuntimeGlobals.requireScope);
					});
				compilation.hooks.runtimeRequirementInTree
					.for(req)
					.tap("RuntimePlugin", (module, set) => {
						set.add(RuntimeGlobals.requireScope);
					});
			}
			for (const req of Object.keys(TREE_DEPENDENCIES)) {
				const deps = TREE_DEPENDENCIES[req];
				compilation.hooks.runtimeRequirementInTree
					.for(req)
					.tap("RuntimePlugin", (chunk, set) => {
						for (const dep of deps) set.add(dep);
					});
			}
			for (const req of Object.keys(MODULE_DEPENDENCIES)) {
				const deps = MODULE_DEPENDENCIES[req];
				compilation.hooks.runtimeRequirementInModule
					.for(req)
					.tap("RuntimePlugin", (chunk, set) => {
						for (const dep of deps) set.add(dep);
					});
			}
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.definePropertyGetters)
				.tap("RuntimePlugin", chunk => {
					compilation.addRuntimeModule(
						chunk,
						new DefinePropertyGettersRuntimeModule()
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
				.for(RuntimeGlobals.hasOwnProperty)
				.tap("RuntimePlugin", chunk => {
					compilation.addRuntimeModule(
						chunk,
						new HasOwnPropertyRuntimeModule()
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
					compilation.addRuntimeModule(chunk, new PublicPathRuntimeModule());
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.global)
				.tap("RuntimePlugin", chunk => {
					compilation.addRuntimeModule(chunk, new GlobalRuntimeModule());
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.systemContext)
				.tap("RuntimePlugin", chunk => {
					if (compilation.outputOptions.library.type === "system") {
						compilation.addRuntimeModule(
							chunk,
							new SystemContextRuntimeModule()
						);
					}
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.getChunkScriptFilename)
				.tap("RuntimePlugin", (chunk, set) => {
					if (
						/\[(full)?hash(:\d+)?\]/.test(
							compilation.outputOptions.chunkFilename
						)
					)
						set.add(RuntimeGlobals.getFullHash);
					compilation.addRuntimeModule(
						chunk,
						new GetChunkFilenameRuntimeModule(
							"javascript",
							"javascript",
							RuntimeGlobals.getChunkScriptFilename,
							chunk =>
								chunk.filenameTemplate ||
								(chunk.isOnlyInitial()
									? compilation.outputOptions.filename
									: compilation.outputOptions.chunkFilename),
							false
						)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.getChunkUpdateScriptFilename)
				.tap("RuntimePlugin", (chunk, set) => {
					if (
						/\[(full)?hash(:\d+)?\]/.test(
							compilation.outputOptions.hotUpdateChunkFilename
						)
					)
						set.add(RuntimeGlobals.getFullHash);
					compilation.addRuntimeModule(
						chunk,
						new GetChunkFilenameRuntimeModule(
							"javascript",
							"javascript update",
							RuntimeGlobals.getChunkUpdateScriptFilename,
							c => compilation.outputOptions.hotUpdateChunkFilename,
							true
						)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.getUpdateManifestFilename)
				.tap("RuntimePlugin", (chunk, set) => {
					if (
						/\[(full)?hash(:\d+)?\]/.test(
							compilation.outputOptions.hotUpdateMainFilename
						)
					) {
						set.add(RuntimeGlobals.getFullHash);
					}
					compilation.addRuntimeModule(
						chunk,
						new GetMainFilenameRuntimeModule(
							"update manifest",
							RuntimeGlobals.getUpdateManifestFilename,
							compilation.outputOptions.hotUpdateMainFilename
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
						new EnsureChunkRuntimeModule(set)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.ensureChunkIncludeEntries)
				.tap("RuntimePlugin", (chunk, set) => {
					set.add(RuntimeGlobals.ensureChunkHandlers);
				});
			// TODO webpack 6: remove CompatRuntimePlugin
			compilation.hooks.additionalTreeRuntimeRequirements.tap(
				"RuntimePlugin",
				(chunk, set) => {
					const { mainTemplate } = compilation;
					if (
						mainTemplate.hooks.bootstrap.isUsed() ||
						mainTemplate.hooks.localVars.isUsed() ||
						mainTemplate.hooks.requireEnsure.isUsed() ||
						mainTemplate.hooks.requireExtensions.isUsed()
					) {
						compilation.addRuntimeModule(chunk, new CompatRuntimePlugin());
					}
				}
			);
			JavascriptModulesPlugin.getCompilationHooks(compilation).chunkHash.tap(
				"RuntimePlugin",
				(chunk, hash, { chunkGraph }) => {
					for (const m of chunkGraph.getChunkRuntimeModulesInOrder(chunk)) {
						hash.update(chunkGraph.getModuleHash(m));
					}
				}
			);
		});
	}
}
module.exports = RuntimePlugin;
