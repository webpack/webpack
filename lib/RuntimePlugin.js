/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { createRequire } from "node:module";

import * as RuntimeGlobals from "./RuntimeGlobals.js";
import { getPresentKinds } from "./TemplatedPathPlugin.js";
import RuntimeRequirementsDependency from "./dependencies/RuntimeRequirementsDependency.js";
import JavascriptModulesPlugin from "./javascript/JavascriptModulesPlugin.js";
import AsyncModuleRuntimeModule from "./runtime/AsyncModuleRuntimeModule.js";
import AutoPublicPathRuntimeModule from "./runtime/AutoPublicPathRuntimeModule.js";
import BaseUriRuntimeModule from "./runtime/BaseUriRuntimeModule.js";
import CompatGetDefaultExportRuntimeModule from "./runtime/CompatGetDefaultExportRuntimeModule.js";
import CompatRuntimeModule from "./runtime/CompatRuntimeModule.js";
import CreateFakeNamespaceObjectRuntimeModule from "./runtime/CreateFakeNamespaceObjectRuntimeModule.js";
import CreateScriptRuntimeModule from "./runtime/CreateScriptRuntimeModule.js";
import CreateScriptUrlRuntimeModule from "./runtime/CreateScriptUrlRuntimeModule.js";
import DefinePropertyGettersRuntimeModule from "./runtime/DefinePropertyGettersRuntimeModule.js";
import EnsureChunkRuntimeModule from "./runtime/EnsureChunkRuntimeModule.js";
import GetChunkFilenameRuntimeModule from "./runtime/GetChunkFilenameRuntimeModule.js";
import GetMainFilenameRuntimeModule from "./runtime/GetMainFilenameRuntimeModule.js";
import GetTrustedTypesPolicyRuntimeModule from "./runtime/GetTrustedTypesPolicyRuntimeModule.js";
import GlobalRuntimeModule from "./runtime/GlobalRuntimeModule.js";
import HasOwnPropertyRuntimeModule from "./runtime/HasOwnPropertyRuntimeModule.js";
import LoadScriptRuntimeModule from "./runtime/LoadScriptRuntimeModule.js";
import {
	MakeDeferredNamespaceObjectRuntimeModule,
	MakeOptimizedDeferredNamespaceObjectRuntimeModule
} from "./runtime/MakeDeferredNamespaceObjectRuntime.js";
import MakeNamespaceObjectRuntimeModule from "./runtime/MakeNamespaceObjectRuntimeModule.js";
import NonceRuntimeModule from "./runtime/NonceRuntimeModule.js";
import OnChunksLoadedRuntimeModule from "./runtime/OnChunksLoadedRuntimeModule.js";
import PublicPathRuntimeModule from "./runtime/PublicPathRuntimeModule.js";
import RelativeUrlRuntimeModule from "./runtime/RelativeUrlRuntimeModule.js";
import RuntimeIdRuntimeModule from "./runtime/RuntimeIdRuntimeModule.js";
import SetAnonymousDefaultNameRuntimeModule from "./runtime/SetAnonymousDefaultNameRuntimeModule.js";
import SystemContextRuntimeModule from "./runtime/SystemContextRuntimeModule.js";
import ToBinaryRuntimeModule from "./runtime/ToBinaryRuntimeModule.js";
import WorkerRuntimeModule from "./runtime/WorkerRuntimeModule.js";
import ShareRuntimeModule from "./sharing/ShareRuntimeModule.js";
import StringXor from "./util/StringXor.js";
import memoize from "./util/memoize.js";

const require = createRequire(import.meta.url);
/** @typedef {import("../declarations/WebpackOptions.js").LibraryOptions} LibraryOptions */
/** @typedef {import("./Chunk.js").default} Chunk */
/** @typedef {import("./Compiler.js").default} Compiler */

const getJavascriptModulesPlugin = memoize(
	() =>
		/** @type {typeof import("./javascript/JavascriptModulesPlugin.js").default} */ (
			require("./javascript/JavascriptModulesPlugin.js")
		)
);
const getCssModulesPlugin = memoize(() => require("./css/CssModulesPlugin.js"));

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
	RuntimeGlobals.wasmInstances,
	RuntimeGlobals.instantiateWasm,
	RuntimeGlobals.shareScopeMap,
	RuntimeGlobals.initializeSharing,
	RuntimeGlobals.loadScript,
	RuntimeGlobals.setAnonymousDefaultName,
	RuntimeGlobals.systemContext,
	RuntimeGlobals.onChunksLoaded,
	RuntimeGlobals.makeOptimizedDeferredNamespaceObject,
	RuntimeGlobals.makeDeferredNamespaceObject
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
	[RuntimeGlobals.shareScopeMap]: [RuntimeGlobals.hasOwnProperty]
};

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
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.definePropertyGetters)
				.tap(PLUGIN_NAME, (chunk) => {
					compilation.addRuntimeModule(
						chunk,
						new DefinePropertyGettersRuntimeModule()
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.makeNamespaceObject)
				.tap(PLUGIN_NAME, (chunk) => {
					compilation.addRuntimeModule(
						chunk,
						new MakeNamespaceObjectRuntimeModule()
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.createFakeNamespaceObject)
				.tap(PLUGIN_NAME, (chunk) => {
					compilation.addRuntimeModule(
						chunk,
						new CreateFakeNamespaceObjectRuntimeModule()
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.makeOptimizedDeferredNamespaceObject)
				.tap("RuntimePlugin", (chunk, runtimeRequirement) => {
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
				.tap("RuntimePlugin", (chunk, runtimeRequirement) => {
					compilation.addRuntimeModule(
						chunk,
						new MakeDeferredNamespaceObjectRuntimeModule(
							runtimeRequirement.has(RuntimeGlobals.asyncModule)
						)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.hasOwnProperty)
				.tap(PLUGIN_NAME, (chunk) => {
					compilation.addRuntimeModule(
						chunk,
						new HasOwnPropertyRuntimeModule()
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.compatGetDefaultExport)
				.tap(PLUGIN_NAME, (chunk) => {
					compilation.addRuntimeModule(
						chunk,
						new CompatGetDefaultExportRuntimeModule()
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.setAnonymousDefaultName)
				.tap(PLUGIN_NAME, (chunk) => {
					compilation.addRuntimeModule(
						chunk,
						new SetAnonymousDefaultNameRuntimeModule()
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.runtimeId)
				.tap(PLUGIN_NAME, (chunk) => {
					compilation.addRuntimeModule(chunk, new RuntimeIdRuntimeModule());
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
						const module = new AutoPublicPathRuntimeModule();
						if (
							scriptType !== "module" &&
							!outputOptions.environment.globalThis
						) {
							set.add(RuntimeGlobals.global);
						}

						compilation.addRuntimeModule(chunk, module);
					} else {
						const module = new PublicPathRuntimeModule(publicPath);

						if (typeof publicPath !== "string" || usesFullHash(publicPath)) {
							module.fullHash = true;
						}

						compilation.addRuntimeModule(chunk, module);
					}
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.global)
				.tap(PLUGIN_NAME, (chunk) => {
					compilation.addRuntimeModule(chunk, new GlobalRuntimeModule());
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.asyncModule)
				.tap(PLUGIN_NAME, (chunk) => {
					const experiments = compilation.options.experiments;
					compilation.addRuntimeModule(
						chunk,
						new AsyncModuleRuntimeModule(experiments.deferImport)
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
					compilation.addRuntimeModule(
						chunk,
						new GetChunkFilenameRuntimeModule(
							"javascript",
							"javascript",
							RuntimeGlobals.getChunkScriptFilename,
							(chunk) => {
								const javascriptModulesPlugin = getJavascriptModulesPlugin();

								return (
									javascriptModulesPlugin.chunkHasJs(chunk, chunkGraph) &&
									javascriptModulesPlugin.getChunkFilenameTemplate(
										chunk,
										compilation.outputOptions
									)
								);
							},
							set.has(RuntimeGlobals.hmrDownloadUpdateHandlers),
							typeof compilation.outputOptions.chunkFilename === "string" &&
								usesFullHashWithDigest(compilation.outputOptions.chunkFilename)
						)
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
				.for(RuntimeGlobals.getUpdateManifestFilename)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (usesFullHash(compilation.outputOptions.hotUpdateMainFilename)) {
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
				.tap(PLUGIN_NAME, (chunk, set) => {
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
				.tap(PLUGIN_NAME, (chunk, set) => {
					set.add(RuntimeGlobals.ensureChunkHandlers);
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.shareScopeMap)
				.tap(PLUGIN_NAME, (chunk, set) => {
					compilation.addRuntimeModule(chunk, new ShareRuntimeModule());
					return true;
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
					compilation.addRuntimeModule(chunk, new CreateScriptRuntimeModule());
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.createScriptUrl)
				.tap(PLUGIN_NAME, (chunk, set) => {
					if (compilation.outputOptions.trustedTypes) {
						set.add(RuntimeGlobals.getTrustedTypesPolicy);
					}
					compilation.addRuntimeModule(
						chunk,
						new CreateScriptUrlRuntimeModule()
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.getTrustedTypesPolicy)
				.tap(PLUGIN_NAME, (chunk, set) => {
					compilation.addRuntimeModule(
						chunk,
						new GetTrustedTypesPolicyRuntimeModule(set)
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.relativeUrl)
				.tap(PLUGIN_NAME, (chunk, _set) => {
					compilation.addRuntimeModule(chunk, new RelativeUrlRuntimeModule());
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.worker)
				.tap(PLUGIN_NAME, (chunk, _set) => {
					compilation.addRuntimeModule(chunk, new WorkerRuntimeModule());
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.onChunksLoaded)
				.tap(PLUGIN_NAME, (chunk, _set) => {
					compilation.addRuntimeModule(
						chunk,
						new OnChunksLoadedRuntimeModule()
					);
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.baseURI)
				.tap(PLUGIN_NAME, (chunk) => {
					if (isChunkLoadingDisabledForChunk(chunk)) {
						compilation.addRuntimeModule(chunk, new BaseUriRuntimeModule());
						return true;
					}
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.scriptNonce)
				.tap(PLUGIN_NAME, (chunk) => {
					compilation.addRuntimeModule(chunk, new NonceRuntimeModule());
					return true;
				});
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.toBinary)
				.tap(PLUGIN_NAME, (chunk) => {
					compilation.addRuntimeModule(chunk, new ToBinaryRuntimeModule());
					return true;
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

export default RuntimePlugin;

export { RuntimePlugin as "module.exports" };
