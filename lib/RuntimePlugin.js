/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("./RuntimeGlobals");
const CompatGetDefaultExportRuntimeModule = require("./runtime/CompatGetDefaultExportRuntimeModule");
const CreateFakeNamespaceObjectRuntimeModule = require("./runtime/CreateFakeNamespaceObjectRuntimeModule");
const DefinePropertyGetterRuntimeModule = require("./runtime/DefinePropertyGetterRuntimeModule");
const EnsureChunkRuntimeModule = require("./runtime/EnsureChunkRuntimeModule");
const GetChunkFilenameRuntimeModule = require("./runtime/GetChunkFilenameRuntimeModule");
const GetMainFilenameRuntimeModule = require("./runtime/GetMainFilenameRuntimeModule");
const GlobalRuntimeModule = require("./runtime/GlobalRuntimeModule");
const MakeNamespaceObjectRuntimeModule = require("./runtime/MakeNamespaceObjectRuntimeModule");
const PublicPathRuntimeModule = require("./runtime/PublicPathRuntimeModule");

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
	[RuntimeGlobals.global]: [RuntimeGlobals.require],
	[RuntimeGlobals.makeNamespaceObject]: [RuntimeGlobals.require],
	[RuntimeGlobals.moduleCache]: [RuntimeGlobals.require],
	[RuntimeGlobals.moduleFactories]: [RuntimeGlobals.require],
	[RuntimeGlobals.publicPath]: [RuntimeGlobals.require],
	[RuntimeGlobals.scriptNonce]: [RuntimeGlobals.require],
	[RuntimeGlobals.uncaughtErrorHandler]: [RuntimeGlobals.require],
	[RuntimeGlobals.wasmInstances]: [RuntimeGlobals.require],
	[RuntimeGlobals.instantiateWasm]: [RuntimeGlobals.require]
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
				.for(RuntimeGlobals.global)
				.tap("RuntimePlugin", chunk => {
					compilation.addRuntimeModule(chunk, new GlobalRuntimeModule());
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
							compilation,
							chunk,
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
							compilation,
							chunk,
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
							compilation,
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
		});
	}
}
module.exports = RuntimePlugin;
