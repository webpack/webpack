/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("./RuntimeGlobals");
const { getPresentKinds } = require("./TemplatedPathPlugin");
const RuntimeRequirementsDependency = require("./dependencies/RuntimeRequirementsDependency");
const JavascriptModulesPlugin = require("./javascript/JavascriptModulesPlugin");
const StringXor = require("./util/StringXor");
const memoize = require("./util/memoize");

/** @typedef {import("../declarations/WebpackOptions").LibraryOptions} LibraryOptions */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./RuntimeModule")} RuntimeModule */

const getCssModulesPlugin = memoize(() => require("./css/CssModulesPlugin"));

// Each runtime module below is constructed only from a `runtimeRequirementInTree`
// tap, so it loads for the builds that emit it — most reach ~10 of these 30.
const getCssServerStylesRuntimeModule = memoize(() =>
	require("./css/CssServerStylesRuntimeModule")
);
const getAsyncModuleGeneratorRuntimeModule = memoize(() =>
	require("./runtime/AsyncModuleGeneratorRuntimeModule")
);
const getAsyncModuleRuntimeModule = memoize(() =>
	require("./runtime/AsyncModuleRuntimeModule")
);
const getAutoPublicPathRuntimeModule = memoize(() =>
	require("./runtime/AutoPublicPathRuntimeModule")
);
const getBaseUriRuntimeModule = memoize(() =>
	require("./runtime/BaseUriRuntimeModule")
);
const getCompatGetDefaultExportRuntimeModule = memoize(() =>
	require("./runtime/CompatGetDefaultExportRuntimeModule")
);
const getCompatRuntimeModule = memoize(() =>
	require("./runtime/CompatRuntimeModule")
);
const getConcatenationWrapRuntimeModule = memoize(() =>
	require("./runtime/ConcatenationWrapRuntimeModule")
);
const getConstructRequireRuntimeModule = memoize(() =>
	require("./runtime/ConstructRequireRuntimeModule")
);
const getCreateFakeNamespaceObjectRuntimeModule = memoize(() =>
	require("./runtime/CreateFakeNamespaceObjectRuntimeModule")
);
const getCreateScriptRuntimeModule = memoize(() =>
	require("./runtime/CreateScriptRuntimeModule")
);
const getCreateScriptUrlRuntimeModule = memoize(() =>
	require("./runtime/CreateScriptUrlRuntimeModule")
);
const getDefinePropertyGettersRuntimeModule = memoize(() =>
	require("./runtime/DefinePropertyGettersRuntimeModule")
);
const getEnsureChunkRuntimeModule = memoize(() =>
	require("./runtime/EnsureChunkRuntimeModule")
);
const getGetChunkFilenameRuntimeModule = memoize(() =>
	require("./runtime/GetChunkFilenameRuntimeModule")
);
const getGetMainFilenameRuntimeModule = memoize(() =>
	require("./runtime/GetMainFilenameRuntimeModule")
);
const getGetTrustedTypesPolicyRuntimeModule = memoize(() =>
	require("./runtime/GetTrustedTypesPolicyRuntimeModule")
);
const getGetWorkletBootstrapRuntimeModule = memoize(() =>
	require("./runtime/GetWorkletBootstrapRuntimeModule")
);
const getGlobalRuntimeModule = memoize(() =>
	require("./runtime/GlobalRuntimeModule")
);
const getHasOwnPropertyRuntimeModule = memoize(() =>
	require("./runtime/HasOwnPropertyRuntimeModule")
);
const getLoadScriptRuntimeModule = memoize(() =>
	require("./runtime/LoadScriptRuntimeModule")
);
const getMakeDeferredNamespaceObjectRuntimeModule = memoize(
	() =>
		require("./runtime/MakeDeferredNamespaceObjectRuntime")
			.MakeDeferredNamespaceObjectRuntimeModule
);
const getMakeOptimizedDeferredNamespaceObjectRuntimeModule = memoize(
	() =>
		require("./runtime/MakeDeferredNamespaceObjectRuntime")
			.MakeOptimizedDeferredNamespaceObjectRuntimeModule
);
const getMakeNamespaceObjectRuntimeModule = memoize(() =>
	require("./runtime/MakeNamespaceObjectRuntimeModule")
);
const getNonceRuntimeModule = memoize(() =>
	require("./runtime/NonceRuntimeModule")
);
const getOnChunksLoadedRuntimeModule = memoize(() =>
	require("./runtime/OnChunksLoadedRuntimeModule")
);
const getPublicPathRuntimeModule = memoize(() =>
	require("./runtime/PublicPathRuntimeModule")
);
const getRelativeUrlRuntimeModule = memoize(() =>
	require("./runtime/RelativeUrlRuntimeModule")
);
const getRuntimeIdRuntimeModule = memoize(() =>
	require("./runtime/RuntimeIdRuntimeModule")
);
const getSetAnonymousDefaultNameRuntimeModule = memoize(() =>
	require("./runtime/SetAnonymousDefaultNameRuntimeModule")
);
const getSystemContextRuntimeModule = memoize(() =>
	require("./runtime/SystemContextRuntimeModule")
);
const getToBinaryRuntimeModule = memoize(() =>
	require("./runtime/ToBinaryRuntimeModule")
);
const getWorkerRuntimeModule = memoize(() =>
	require("./runtime/WorkerRuntimeModule")
);
const getShareRuntimeModule = memoize(() =>
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
/** @type {[string, () => (new () => RuntimeModule)][]} */
const SIMPLE_TREE_RUNTIME_MODULES = [
	[RuntimeGlobals.definePropertyGetters, getDefinePropertyGettersRuntimeModule],
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

// `[fullhash:<digest>]`/`[hash:<digest>]` — a non-numeric first arg is a digest (a
// numeric one is just a length). The re-encoded full hash must be inlined post-hash
// rather than read from the runtime `getFullHash()` expression.
const FULLHASH_DIGEST_REGEXP = /\[(?:fullhash|hash):(?!\d+\])\w/;

/**
 * @param {string} template path template
 * @returns {boolean} true when it references `[fullhash:<digest>]`/`[hash:<digest>]`
 */
const usesFullHashWithDigest = (template) =>
	FULLHASH_DIGEST_REGEXP.test(template);

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
						const RuntimeModule = getRuntimeModule();
						compilation.addRuntimeModule(chunk, new RuntimeModule());
						return true;
					});
			}
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.makeOptimizedDeferredNamespaceObject)
				.tap(PLUGIN_NAME, (chunk, runtimeRequirement) => {
					const MakeOptimizedDeferredNamespaceObjectRuntimeModule =
						getMakeOptimizedDeferredNamespaceObjectRuntimeModule();
					compilation.addRuntimeModule(
						chunk,
						new MakeOptimizedDeferredNamespaceObjectRuntimeModule(
							runtimeRequirement.has(RuntimeGlobals.asyncModule)
						)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.makeDeferredNamespaceObject)
				.tap(PLUGIN_NAME, (chunk, runtimeRequirement) => {
					const MakeDeferredNamespaceObjectRuntimeModule =
						getMakeDeferredNamespaceObjectRuntimeModule();
					compilation.addRuntimeModule(
						chunk,
						new MakeDeferredNamespaceObjectRuntimeModule(
							runtimeRequirement.has(RuntimeGlobals.asyncModule)
						)
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
						const AutoPublicPathRuntimeModule =
							getAutoPublicPathRuntimeModule();
						const module = new AutoPublicPathRuntimeModule();
						// A worklet chunk reads `import.meta.url`, so it needs neither the
						// worker-scope detection nor the `globalThis` polyfill.
						if (
							scriptType !== "module" &&
							!(entryOptions && entryOptions.worklet) &&
							!outputOptions.environment.globalThis
						) {
							set.add(RuntimeGlobals.global);
						}

						compilation.addRuntimeModule(chunk, module);
					} else {
						const PublicPathRuntimeModule = getPublicPathRuntimeModule();
						const module = new PublicPathRuntimeModule(publicPath);

						if (typeof publicPath !== "string" || usesFullHash(publicPath)) {
							module.fullHash = true;
						}

						compilation.addRuntimeModule(chunk, module);
					}
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.asyncModule)
				.tap(PLUGIN_NAME, (chunk) => {
					const experiments = compilation.options.experiments;
					const AsyncModuleRuntimeModule = getAsyncModuleRuntimeModule();
					compilation.addRuntimeModule(
						chunk,
						new AsyncModuleRuntimeModule(experiments.deferImport)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.asyncModuleGenerator)
				.tap(PLUGIN_NAME, (chunk, set) => {
					set.add(RuntimeGlobals.asyncModule);
					const AsyncModuleGeneratorRuntimeModule =
						getAsyncModuleGeneratorRuntimeModule();
					compilation.addRuntimeModule(
						chunk,
						new AsyncModuleGeneratorRuntimeModule()
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
						const SystemContextRuntimeModule = getSystemContextRuntimeModule();
						compilation.addRuntimeModule(
							chunk,
							new SystemContextRuntimeModule()
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
					const GetChunkFilenameRuntimeModule =
						getGetChunkFilenameRuntimeModule();
					compilation.addRuntimeModule(
						chunk,
						new GetChunkFilenameRuntimeModule(
							"javascript",
							"javascript",
							RuntimeGlobals.getChunkScriptFilename,
							(chunk) =>
								JavascriptModulesPlugin.chunkHasJs(chunk, chunkGraph) &&
								JavascriptModulesPlugin.getChunkFilenameTemplate(
									chunk,
									compilation.outputOptions
								),
							set.has(RuntimeGlobals.hmrDownloadUpdateHandlers),
							typeof compilation.outputOptions.chunkFilename === "string" &&
								usesFullHashWithDigest(compilation.outputOptions.chunkFilename)
						)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.getWorkletBootstrap)
				.tap(PLUGIN_NAME, (chunk, set) => {
					set.add(RuntimeGlobals.baseURI);
					const GetWorkletBootstrapRuntimeModule =
						getGetWorkletBootstrapRuntimeModule();
					compilation.addRuntimeModule(
						chunk,
						new GetWorkletBootstrapRuntimeModule()
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
					const GetChunkFilenameRuntimeModule =
						getGetChunkFilenameRuntimeModule();
					compilation.addRuntimeModule(
						chunk,
						new GetChunkFilenameRuntimeModule(
							"css",
							"css",
							RuntimeGlobals.getChunkCssFilename,
							(chunk) => {
								const cssModulePlugin = getCssModulesPlugin();

								return (
									cssModulePlugin.chunkHasCss(chunk, chunkGraph) &&
									cssModulePlugin.getChunkFilenameTemplate(
										chunk,
										compilation.outputOptions
									)
								);
							},
							set.has(RuntimeGlobals.hmrDownloadUpdateHandlers),
							typeof compilation.outputOptions.cssChunkFilename === "string" &&
								usesFullHashWithDigest(
									compilation.outputOptions.cssChunkFilename
								)
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
					const GetChunkFilenameRuntimeModule =
						getGetChunkFilenameRuntimeModule();
					compilation.addRuntimeModule(
						chunk,
						new GetChunkFilenameRuntimeModule(
							"javascript",
							"javascript update",
							RuntimeGlobals.getChunkUpdateScriptFilename,
							(_chunk) => compilation.outputOptions.hotUpdateChunkFilename,
							true,
							typeof compilation.outputOptions.hotUpdateChunkFilename ===
								"string" &&
								usesFullHashWithDigest(
									compilation.outputOptions.hotUpdateChunkFilename
								)
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
					const CssServerStylesRuntimeModule =
						getCssServerStylesRuntimeModule();
					compilation.addRuntimeModule(
						chunk,
						new CssServerStylesRuntimeModule()
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.getUpdateManifestFilename)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (usesFullHash(compilation.outputOptions.hotUpdateMainFilename)) {
						set.add(RuntimeGlobals.getFullHash);
					}
					const GetMainFilenameRuntimeModule =
						getGetMainFilenameRuntimeModule();
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
				.tap(PLUGIN_NAME, (chunk, set) => {
					const hasAsyncChunks = chunk.hasAsyncChunks();
					if (hasAsyncChunks) {
						set.add(RuntimeGlobals.ensureChunkHandlers);
					}
					const EnsureChunkRuntimeModule = getEnsureChunkRuntimeModule();
					compilation.addRuntimeModule(
						chunk,
						new EnsureChunkRuntimeModule(set)
					);
					return true;
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
					const LoadScriptRuntimeModule = getLoadScriptRuntimeModule();
					compilation.addRuntimeModule(
						chunk,
						new LoadScriptRuntimeModule(withCreateScriptUrl, withFetchPriority)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.createScript)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (compilation.outputOptions.trustedTypes) {
						set.add(RuntimeGlobals.getTrustedTypesPolicy);
					}
					const CreateScriptRuntimeModule = getCreateScriptRuntimeModule();
					compilation.addRuntimeModule(chunk, new CreateScriptRuntimeModule());
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.createScriptUrl)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (compilation.outputOptions.trustedTypes) {
						set.add(RuntimeGlobals.getTrustedTypesPolicy);
					}
					const CreateScriptUrlRuntimeModule =
						getCreateScriptUrlRuntimeModule();
					compilation.addRuntimeModule(
						chunk,
						new CreateScriptUrlRuntimeModule()
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.getTrustedTypesPolicy)
				.tap(PLUGIN_NAME, (chunk, set) => {
					const GetTrustedTypesPolicyRuntimeModule =
						getGetTrustedTypesPolicyRuntimeModule();
					compilation.addRuntimeModule(
						chunk,
						new GetTrustedTypesPolicyRuntimeModule(set)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.baseURI)
				.tap(PLUGIN_NAME, (chunk) => {
					if (isChunkLoadingDisabledForChunk(chunk)) {
						const BaseUriRuntimeModule = getBaseUriRuntimeModule();
						compilation.addRuntimeModule(chunk, new BaseUriRuntimeModule());
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
						const CompatRuntimeModule = getCompatRuntimeModule();
						compilation.addRuntimeModule(chunk, new CompatRuntimeModule());
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
