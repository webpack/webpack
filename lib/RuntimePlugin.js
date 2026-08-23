/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("./RuntimeGlobals");
const {
	getPresentKinds,
	usesFullHashDigest
} = require("./TemplatedPathPlugin");
const CssModulesPlugin = require("./css/CssModulesPlugin");
const RuntimeRequirementsDependency = require("./dependencies/RuntimeRequirementsDependency");
const JavascriptModulesPlugin = require("./javascript/JavascriptModulesPlugin");
const StringXor = require("./util/StringXor");
const lazyModule = require("./util/lazyModule");

/** @import { LibraryOptions } from "../declarations/WebpackOptions" */
/** @import Chunk from "./Chunk" */
/** @import { RuntimeRequirements } from "./Module" */
/** @import Compiler from "./Compiler" */
/** @import RuntimeModule from "./RuntimeModule" */

// Each runtime module below is loaded by `_attachPendingRuntimeModules`, so only
// the builds that emit one pay for it — most reach ~10 of these 30.
const getCssServerStylesRuntimeModule = lazyModule(() =>
	require("./css/CssServerStylesRuntimeModule")
);
const getAsyncModuleGeneratorRuntimeModule = lazyModule(() =>
	require("./runtime/AsyncModuleGeneratorRuntimeModule")
);
const getAsyncModuleRuntimeModule = lazyModule(() =>
	require("./runtime/AsyncModuleRuntimeModule")
);
const getAutoPublicPathRuntimeModule = lazyModule(() =>
	require("./runtime/AutoPublicPathRuntimeModule")
);
const getBaseUriRuntimeModule = lazyModule(() =>
	require("./runtime/BaseUriRuntimeModule")
);
const getCompatGetDefaultExportRuntimeModule = lazyModule(() =>
	require("./runtime/CompatGetDefaultExportRuntimeModule")
);
const getCompatRuntimeModule = lazyModule(() =>
	require("./runtime/CompatRuntimeModule")
);
const getConcatenationWrapRuntimeModule = lazyModule(() =>
	require("./runtime/ConcatenationWrapRuntimeModule")
);
const getConstructRequireRuntimeModule = lazyModule(() =>
	require("./runtime/ConstructRequireRuntimeModule")
);
const getCreateFakeNamespaceObjectRuntimeModule = lazyModule(() =>
	require("./runtime/CreateFakeNamespaceObjectRuntimeModule")
);
const getCreateScriptRuntimeModule = lazyModule(() =>
	require("./runtime/CreateScriptRuntimeModule")
);
const getCreateScriptUrlRuntimeModule = lazyModule(() =>
	require("./runtime/CreateScriptUrlRuntimeModule")
);
const getDefinePropertyGettersRuntimeModule = lazyModule(() =>
	require("./runtime/DefinePropertyGettersRuntimeModule")
);
const getEnsureChunkRuntimeModule = lazyModule(() =>
	require("./runtime/EnsureChunkRuntimeModule")
);
const getGetChunkFilenameRuntimeModule = lazyModule(() =>
	require("./runtime/GetChunkFilenameRuntimeModule")
);
const getGetMainFilenameRuntimeModule = lazyModule(() =>
	require("./runtime/GetMainFilenameRuntimeModule")
);
const getGetTrustedTypesPolicyRuntimeModule = lazyModule(() =>
	require("./runtime/GetTrustedTypesPolicyRuntimeModule")
);
const getGetWorkletBootstrapRuntimeModule = lazyModule(() =>
	require("./runtime/GetWorkletBootstrapRuntimeModule")
);
const getGlobalRuntimeModule = lazyModule(() =>
	require("./runtime/GlobalRuntimeModule")
);
const getHasOwnPropertyRuntimeModule = lazyModule(() =>
	require("./runtime/HasOwnPropertyRuntimeModule")
);
const getLoadScriptRuntimeModule = lazyModule(() =>
	require("./runtime/LoadScriptRuntimeModule")
);
const getMakeDeferredNamespaceObjectRuntimeModule = lazyModule(
	() =>
		require("./runtime/MakeDeferredNamespaceObjectRuntime")
			.MakeDeferredNamespaceObjectRuntimeModule
);
const getMakeOptimizedDeferredNamespaceObjectRuntimeModule = lazyModule(
	() =>
		require("./runtime/MakeDeferredNamespaceObjectRuntime")
			.MakeOptimizedDeferredNamespaceObjectRuntimeModule
);
const getMakeNamespaceObjectRuntimeModule = lazyModule(() =>
	require("./runtime/MakeNamespaceObjectRuntimeModule")
);
const getNonceRuntimeModule = lazyModule(() =>
	require("./runtime/NonceRuntimeModule")
);
const getOnChunksLoadedRuntimeModule = lazyModule(() =>
	require("./runtime/OnChunksLoadedRuntimeModule")
);
const getPublicPathRuntimeModule = lazyModule(() =>
	require("./runtime/PublicPathRuntimeModule")
);
const getRelativeUrlRuntimeModule = lazyModule(() =>
	require("./runtime/RelativeUrlRuntimeModule")
);
const getRuntimeIdRuntimeModule = lazyModule(() =>
	require("./runtime/RuntimeIdRuntimeModule")
);
const getSetAnonymousDefaultNameRuntimeModule = lazyModule(() =>
	require("./runtime/SetAnonymousDefaultNameRuntimeModule")
);
const getSystemContextRuntimeModule = lazyModule(() =>
	require("./runtime/SystemContextRuntimeModule")
);
const getToBinaryRuntimeModule = lazyModule(() =>
	require("./runtime/ToBinaryRuntimeModule")
);
const getWorkerRuntimeModule = lazyModule(() =>
	require("./runtime/WorkerRuntimeModule")
);
const getShareRuntimeModule = lazyModule(() =>
	require("./sharing/ShareRuntimeModule")
);

const GLOBALS_ON_REQUIRE = [
	RuntimeGlobals.chunkName,
	RuntimeGlobals.runtimeId,
	RuntimeGlobals.compatGetDefaultExport,
	RuntimeGlobals.createFakeNamespaceObject,
	RuntimeGlobals.createScript,
	RuntimeGlobals.createScriptUrl,
	RuntimeGlobals.getTrustedTypesPolicy,
	RuntimeGlobals.definePropertyGetters,
	RuntimeGlobals.ensureChunk,
	RuntimeGlobals.entryModuleId,
	RuntimeGlobals.getCssServerStyles,
	RuntimeGlobals.getFullHash,
	RuntimeGlobals.global,
	RuntimeGlobals.makeNamespaceObject,
	RuntimeGlobals.moduleCache,
	RuntimeGlobals.moduleFactories,
	RuntimeGlobals.moduleFactoriesAddOnly,
	RuntimeGlobals.interceptModuleExecution,
	RuntimeGlobals.publicPath,
	RuntimeGlobals.baseURI,
	RuntimeGlobals.prefetchAsset,
	RuntimeGlobals.preloadAsset,
	RuntimeGlobals.relativeUrl,
	// TODO webpack 6 - rename to nonce, because we use it for CSS too
	RuntimeGlobals.scriptNonce,
	RuntimeGlobals.uncaughtErrorHandler,
	RuntimeGlobals.asyncModule,
	RuntimeGlobals.asyncModuleGenerator,
	RuntimeGlobals.wasmInstances,
	RuntimeGlobals.instantiateWasm,
	RuntimeGlobals.shareScopeMap,
	RuntimeGlobals.initializeSharing,
	RuntimeGlobals.loadScript,
	RuntimeGlobals.setAnonymousDefaultName,
	RuntimeGlobals.systemContext,
	RuntimeGlobals.onChunksLoaded,
	RuntimeGlobals.makeOptimizedDeferredNamespaceObject,
	RuntimeGlobals.makeDeferredNamespaceObject,
	RuntimeGlobals.concatenationWrap,
	RuntimeGlobals.constructRequire
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
	],
	[RuntimeGlobals.makeOptimizedDeferredNamespaceObject]: [
		RuntimeGlobals.require
	],
	[RuntimeGlobals.makeDeferredNamespaceObject]: [
		RuntimeGlobals.createFakeNamespaceObject,
		RuntimeGlobals.require
	],
	[RuntimeGlobals.initializeSharing]: [RuntimeGlobals.shareScopeMap],
	[RuntimeGlobals.shareScopeMap]: [RuntimeGlobals.hasOwnProperty],
	[RuntimeGlobals.constructRequire]: [RuntimeGlobals.require]
};

// Tree runtime requirements whose only effect is attaching a zero-arg runtime
// module to the chunk. Conditional / argument-taking ones stay as explicit taps.
/** @type {[string, () => Promise<new () => RuntimeModule>][]} */
const SIMPLE_TREE_RUNTIME_MODULES = [
	[RuntimeGlobals.makeNamespaceObject, getMakeNamespaceObjectRuntimeModule],
	[
		RuntimeGlobals.createFakeNamespaceObject,
		getCreateFakeNamespaceObjectRuntimeModule
	],
	[RuntimeGlobals.hasOwnProperty, getHasOwnPropertyRuntimeModule],
	[
		RuntimeGlobals.compatGetDefaultExport,
		getCompatGetDefaultExportRuntimeModule
	],
	[RuntimeGlobals.concatenationWrap, getConcatenationWrapRuntimeModule],
	[RuntimeGlobals.constructRequire, getConstructRequireRuntimeModule],
	[
		RuntimeGlobals.setAnonymousDefaultName,
		getSetAnonymousDefaultNameRuntimeModule
	],
	[RuntimeGlobals.runtimeId, getRuntimeIdRuntimeModule],
	[RuntimeGlobals.global, getGlobalRuntimeModule],
	[RuntimeGlobals.shareScopeMap, getShareRuntimeModule],
	[RuntimeGlobals.relativeUrl, getRelativeUrlRuntimeModule],
	[RuntimeGlobals.worker, getWorkerRuntimeModule],
	[RuntimeGlobals.onChunksLoaded, getOnChunksLoadedRuntimeModule],
	[RuntimeGlobals.scriptNonce, getNonceRuntimeModule],
	[RuntimeGlobals.toBinary, getToBinaryRuntimeModule]
];

/**
 * @param {string} template path template
 * @returns {boolean} true when it references the compilation `[fullhash]`/`[hash]`
 */
const usesFullHash = (template) => {
	const kinds = getPresentKinds(template);
	return kinds.has("fullhash") || kinds.has("hash");
};

const PLUGIN_NAME = "RuntimePlugin";

class RuntimePlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the Compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			const globalChunkLoading = compilation.outputOptions.chunkLoading;
			/**
			 * Checks whether this runtime plugin is chunk loading disabled for chunk.
			 * @param {Chunk} chunk chunk
			 * @returns {boolean} true, when chunk loading is disabled for the chunk
			 */
			const isChunkLoadingDisabledForChunk = (chunk) => {
				const options = chunk.getEntryOptions();
				const chunkLoading =
					options && options.chunkLoading !== undefined
						? options.chunkLoading
						: globalChunkLoading;
				return chunkLoading === false;
			};
			compilation.dependencyTemplates.set(
				RuntimeRequirementsDependency,
				new RuntimeRequirementsDependency.Template()
			);
			for (const req of GLOBALS_ON_REQUIRE) {
				compilation.hooks.runtimeRequirementInModule
					.for(req)
					.tap(PLUGIN_NAME, (module, set) => {
						set.add(RuntimeGlobals.requireScope);
					});
				compilation.hooks.runtimeRequirementInTree
					.for(req)
					.tap(PLUGIN_NAME, (module, set) => {
						set.add(RuntimeGlobals.requireScope);
					});
			}
			for (const req of Object.keys(TREE_DEPENDENCIES)) {
				const deps =
					TREE_DEPENDENCIES[/** @type {keyof TREE_DEPENDENCIES} */ (req)];
				compilation.hooks.runtimeRequirementInTree
					.for(req)
					.tap(PLUGIN_NAME, (chunk, set) => {
						for (const dep of deps) set.add(dep);
					});
			}
			for (const req of Object.keys(MODULE_DEPENDENCIES)) {
				const deps =
					MODULE_DEPENDENCIES[/** @type {keyof MODULE_DEPENDENCIES} */ (req)];
				compilation.hooks.runtimeRequirementInModule
					.for(req)
					.tap(PLUGIN_NAME, (chunk, set) => {
						for (const dep of deps) set.add(dep);
					});
			}
			for (const [
				runtimeGlobal,
				getRuntimeModule
			] of SIMPLE_TREE_RUNTIME_MODULES) {
				compilation.hooks.runtimeRequirementInTree
					.for(runtimeGlobal)
					.tap(PLUGIN_NAME, (chunk) => {
						compilation.addLazyRuntimeModule(
							chunk,
							getRuntimeModule,
							(Ctor) => new Ctor()
						);
						return true;
					});
			}
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.definePropertyGetters)
				.tap(PLUGIN_NAME, (chunk, runtimeRequirement) => {
					compilation.addLazyRuntimeModule(
						chunk,
						getDefinePropertyGettersRuntimeModule,
						(Ctor) => new Ctor(runtimeRequirement)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.makeOptimizedDeferredNamespaceObject)
				.tap(PLUGIN_NAME, (chunk, runtimeRequirement) => {
					const asyncModule = runtimeRequirement.has(
						RuntimeGlobals.asyncModule
					);
					compilation.addLazyRuntimeModule(
						chunk,
						getMakeOptimizedDeferredNamespaceObjectRuntimeModule,
						(Ctor) => new Ctor(asyncModule)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.makeDeferredNamespaceObject)
				.tap(PLUGIN_NAME, (chunk, runtimeRequirement) => {
					const asyncModule = runtimeRequirement.has(
						RuntimeGlobals.asyncModule
					);
					compilation.addLazyRuntimeModule(
						chunk,
						getMakeDeferredNamespaceObjectRuntimeModule,
						(Ctor) => new Ctor(asyncModule)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.publicPath)
				.tap(PLUGIN_NAME, (chunk, set) => {
					const { outputOptions } = compilation;
					const { publicPath: globalPublicPath, scriptType } = outputOptions;
					const entryOptions = chunk.getEntryOptions();
					const publicPath =
						entryOptions && entryOptions.publicPath !== undefined
							? entryOptions.publicPath
							: globalPublicPath;

					if (publicPath === "auto") {
						// A worklet chunk reads `import.meta.url`, so it needs neither the
						// worker-scope detection nor the `globalThis` polyfill.
						if (
							scriptType !== "module" &&
							!(entryOptions && entryOptions.worklet) &&
							!outputOptions.environment.globalThis
						) {
							set.add(RuntimeGlobals.global);
						}

						compilation.addLazyRuntimeModule(
							chunk,
							getAutoPublicPathRuntimeModule,
							(Ctor) => new Ctor()
						);
					} else {
						const fullHash =
							typeof publicPath !== "string" || usesFullHash(publicPath);

						compilation.addLazyRuntimeModule(
							chunk,
							getPublicPathRuntimeModule,
							(Ctor) => {
								const module = new Ctor(publicPath);
								if (fullHash) module.fullHash = true;
								return module;
							}
						);
					}
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.asyncModule)
				.tap(PLUGIN_NAME, (chunk) => {
					const experiments = compilation.options.experiments;
					compilation.addLazyRuntimeModule(
						chunk,
						getAsyncModuleRuntimeModule,
						(Ctor) => new Ctor(experiments.deferImport)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.asyncModuleGenerator)
				.tap(PLUGIN_NAME, (chunk, set) => {
					set.add(RuntimeGlobals.asyncModule);
					compilation.addLazyRuntimeModule(
						chunk,
						getAsyncModuleGeneratorRuntimeModule,
						(Ctor) => new Ctor()
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.systemContext)
				.tap(PLUGIN_NAME, (chunk) => {
					const entryOptions = chunk.getEntryOptions();
					const libraryType =
						entryOptions && entryOptions.library !== undefined
							? entryOptions.library.type
							: /** @type {LibraryOptions} */
								(compilation.outputOptions.library).type;

					if (libraryType === "system") {
						compilation.addLazyRuntimeModule(
							chunk,
							getSystemContextRuntimeModule,
							(Ctor) => new Ctor()
						);
					}
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.getChunkScriptFilename)
				.tap(PLUGIN_NAME, (chunk, set, { chunkGraph }) => {
					if (
						typeof compilation.outputOptions.chunkFilename === "string" &&
						usesFullHash(compilation.outputOptions.chunkFilename)
					) {
						set.add(RuntimeGlobals.getFullHash);
					}
					const hmr = set.has(RuntimeGlobals.hmrDownloadUpdateHandlers);
					const fullHashDigest =
						typeof compilation.outputOptions.chunkFilename === "string" &&
						usesFullHashDigest(compilation.outputOptions.chunkFilename);
					compilation.addLazyRuntimeModule(
						chunk,
						getGetChunkFilenameRuntimeModule,
						(Ctor) =>
							new Ctor(
								"javascript",
								"javascript",
								RuntimeGlobals.getChunkScriptFilename,
								(/** @type {Chunk} */ chunk) =>
									JavascriptModulesPlugin.chunkHasJs(chunk, chunkGraph) &&
									JavascriptModulesPlugin.getChunkFilenameTemplate(
										chunk,
										compilation.outputOptions
									),
								hmr,
								fullHashDigest
							)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.getWorkletBootstrap)
				.tap(PLUGIN_NAME, (chunk, set) => {
					set.add(RuntimeGlobals.baseURI);
					compilation.addLazyRuntimeModule(
						chunk,
						getGetWorkletBootstrapRuntimeModule,
						(Ctor) => new Ctor()
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.getChunkCssFilename)
				.tap(PLUGIN_NAME, (chunk, set, { chunkGraph }) => {
					if (
						typeof compilation.outputOptions.cssChunkFilename === "string" &&
						usesFullHash(compilation.outputOptions.cssChunkFilename)
					) {
						set.add(RuntimeGlobals.getFullHash);
					}
					const hmr = set.has(RuntimeGlobals.hmrDownloadUpdateHandlers);
					const fullHashDigest =
						typeof compilation.outputOptions.cssChunkFilename === "string" &&
						usesFullHashDigest(compilation.outputOptions.cssChunkFilename);
					compilation.addLazyRuntimeModule(
						chunk,
						getGetChunkFilenameRuntimeModule,
						(Ctor) =>
							new Ctor(
								"css",
								"css",
								RuntimeGlobals.getChunkCssFilename,
								(/** @type {Chunk} */ chunk) => {
									const cssModulePlugin = CssModulesPlugin;

									return (
										cssModulePlugin.chunkHasCss(chunk, chunkGraph) &&
										cssModulePlugin.getChunkFilenameTemplate(
											chunk,
											compilation.outputOptions
										)
									);
								},
								hmr,
								fullHashDigest
							)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.getChunkUpdateScriptFilename)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (usesFullHash(compilation.outputOptions.hotUpdateChunkFilename)) {
						set.add(RuntimeGlobals.getFullHash);
					}
					const fullHashDigest =
						typeof compilation.outputOptions.hotUpdateChunkFilename ===
							"string" &&
						usesFullHashDigest(
							compilation.outputOptions.hotUpdateChunkFilename
						);
					compilation.addLazyRuntimeModule(
						chunk,
						getGetChunkFilenameRuntimeModule,
						(Ctor) =>
							new Ctor(
								"javascript",
								"javascript update",
								RuntimeGlobals.getChunkUpdateScriptFilename,
								(/** @type {Chunk} */ _chunk) =>
									compilation.outputOptions.hotUpdateChunkFilename,
								true,
								fullHashDigest
							)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.getCssServerStyles)
				.tap(PLUGIN_NAME, (chunk, set) => {
					// The registry lives on the global, reached via the polyfill when
					// the target has no `globalThis`.
					if (!compilation.outputOptions.environment.globalThis) {
						set.add(RuntimeGlobals.global);
					}
					compilation.addLazyRuntimeModule(
						chunk,
						getCssServerStylesRuntimeModule,
						(Ctor) => new Ctor()
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.getUpdateManifestFilename)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (usesFullHash(compilation.outputOptions.hotUpdateMainFilename)) {
						set.add(RuntimeGlobals.getFullHash);
					}
					compilation.addLazyRuntimeModule(
						chunk,
						getGetMainFilenameRuntimeModule,
						(Ctor) =>
							new Ctor(
								"update manifest",
								RuntimeGlobals.getUpdateManifestFilename,
								compilation.outputOptions.hotUpdateMainFilename
							)
					);
					return true;
				});
			/** @type {WeakSet<Chunk>} */
			const ensureChunkModuleAdded = new WeakSet();
			/**
			 * The module carries the handler map as well as `ensureChunk`, and an
			 * analyzable `import()` needs the map without the function around it.
			 * @param {Chunk} chunk the chunk
			 * @param {RuntimeRequirements} set the tree's requirements, filled in place
			 */
			const addEnsureChunkRuntimeModule = (chunk, set) => {
				if (ensureChunkModuleAdded.has(chunk)) return;
				ensureChunkModuleAdded.add(chunk);
				compilation.addLazyRuntimeModule(
					chunk,
					getEnsureChunkRuntimeModule,
					(Ctor) => new Ctor(set)
				);
			};
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.ensureChunk)
				.tap(PLUGIN_NAME, (chunk, set) => {
					const hasAsyncChunks = chunk.hasAsyncChunks();
					if (hasAsyncChunks) {
						set.add(RuntimeGlobals.ensureChunkHandlers);
					}
					addEnsureChunkRuntimeModule(chunk, set);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.ensureChunkHandlers)
				.tap(PLUGIN_NAME, (chunk, set) => {
					// No bail: every other plugin attaching a handler taps this same key.
					addEnsureChunkRuntimeModule(chunk, set);
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.ensureChunkIncludeEntries)
				.tap(PLUGIN_NAME, (chunk, set) => {
					set.add(RuntimeGlobals.ensureChunkHandlers);
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.loadScript)
				.tap(PLUGIN_NAME, (chunk, set) => {
					const withCreateScriptUrl = Boolean(
						compilation.outputOptions.trustedTypes
					);
					if (withCreateScriptUrl) {
						set.add(RuntimeGlobals.createScriptUrl);
					}
					const withFetchPriority = set.has(RuntimeGlobals.hasFetchPriority);
					compilation.addLazyRuntimeModule(
						chunk,
						getLoadScriptRuntimeModule,
						(Ctor) => new Ctor(withCreateScriptUrl, withFetchPriority)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.createScript)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (compilation.outputOptions.trustedTypes) {
						set.add(RuntimeGlobals.getTrustedTypesPolicy);
					}
					compilation.addLazyRuntimeModule(
						chunk,
						getCreateScriptRuntimeModule,
						(Ctor) => new Ctor()
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.createScriptUrl)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (compilation.outputOptions.trustedTypes) {
						set.add(RuntimeGlobals.getTrustedTypesPolicy);
					}
					compilation.addLazyRuntimeModule(
						chunk,
						getCreateScriptUrlRuntimeModule,
						(Ctor) => new Ctor()
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.getTrustedTypesPolicy)
				.tap(PLUGIN_NAME, (chunk, set) => {
					compilation.addLazyRuntimeModule(
						chunk,
						getGetTrustedTypesPolicyRuntimeModule,
						(Ctor) => new Ctor(set)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.baseURI)
				.tap(PLUGIN_NAME, (chunk) => {
					if (isChunkLoadingDisabledForChunk(chunk)) {
						compilation.addLazyRuntimeModule(
							chunk,
							getBaseUriRuntimeModule,
							(Ctor) => new Ctor()
						);
						return true;
					}
				});
			// TODO webpack 6: remove CompatRuntimeModule
			compilation.hooks.additionalTreeRuntimeRequirements.tap(
				PLUGIN_NAME,
				(chunk, _set) => {
					const { mainTemplate } = compilation;
					if (
						mainTemplate.hooks.bootstrap.isUsed() ||
						mainTemplate.hooks.localVars.isUsed() ||
						mainTemplate.hooks.requireEnsure.isUsed() ||
						mainTemplate.hooks.requireExtensions.isUsed()
					) {
						compilation.addLazyRuntimeModule(
							chunk,
							getCompatRuntimeModule,
							(Ctor) => new Ctor()
						);
					}
				}
			);
			JavascriptModulesPlugin.getCompilationHooks(compilation).chunkHash.tap(
				PLUGIN_NAME,
				(chunk, hash, { chunkGraph }) => {
					const xor = new StringXor();
					for (const m of chunkGraph.getChunkRuntimeModulesIterable(chunk)) {
						xor.add(chunkGraph.getModuleHash(m, chunk.runtime));
					}
					xor.updateHash(hash);
				}
			);
		});
	}
}

module.exports = RuntimePlugin;
