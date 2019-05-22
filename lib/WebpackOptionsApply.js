/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const OptionsApply = require("./OptionsApply");

const JavascriptModulesPlugin = require("./JavascriptModulesPlugin");
const JsonModulesPlugin = require("./JsonModulesPlugin");
const WebAssemblyModulesPlugin = require("./wasm/WebAssemblyModulesPlugin");

const EvalDevToolModulePlugin = require("./EvalDevToolModulePlugin");
const EvalSourceMapDevToolPlugin = require("./EvalSourceMapDevToolPlugin");
const FunctionModulePlugin = require("./FunctionModulePlugin");
const LoaderTargetPlugin = require("./LoaderTargetPlugin");
const SourceMapDevToolPlugin = require("./SourceMapDevToolPlugin");

const EntryOptionPlugin = require("./EntryOptionPlugin");
const RecordIdsPlugin = require("./RecordIdsPlugin");

const RuntimePlugin = require("./RuntimePlugin");

const APIPlugin = require("./APIPlugin");
const CommonJsStuffPlugin = require("./CommonJsStuffPlugin");
const CompatibilityPlugin = require("./CompatibilityPlugin");
const ConstPlugin = require("./ConstPlugin");

const TemplatedPathPlugin = require("./TemplatedPathPlugin");
const UseStrictPlugin = require("./UseStrictPlugin");
const WarnCaseSensitiveModulesPlugin = require("./WarnCaseSensitiveModulesPlugin");

const ResolverCachePlugin = require("./cache/ResolverCachePlugin");

const CommonJsPlugin = require("./dependencies/CommonJsPlugin");
const HarmonyModulesPlugin = require("./dependencies/HarmonyModulesPlugin");
const ImportPlugin = require("./dependencies/ImportPlugin");
const LoaderPlugin = require("./dependencies/LoaderPlugin");
const RequireContextPlugin = require("./dependencies/RequireContextPlugin");
const RequireEnsurePlugin = require("./dependencies/RequireEnsurePlugin");
const RequireIncludePlugin = require("./dependencies/RequireIncludePlugin");
const SystemPlugin = require("./dependencies/SystemPlugin");

const OccurrenceChunkIdsPlugin = require("./ids/OccurrenceChunkIdsPlugin");

const DefaultStatsFactoryPlugin = require("./stats/DefaultStatsFactoryPlugin");
const DefaultStatsPresetPlugin = require("./stats/DefaultStatsPresetPlugin");
const DefaultStatsPrinterPlugin = require("./stats/DefaultStatsPrinterPlugin");

const { cachedCleverMerge } = require("./util/cleverMerge");

/** @typedef {import("../declarations/WebpackOptions").WebpackOptions} WebpackOptions */
/** @typedef {import("./Compiler")} Compiler */

class WebpackOptionsApply extends OptionsApply {
	constructor() {
		super();
	}

	/**
	 * @param {WebpackOptions} options options object
	 * @param {Compiler} compiler compiler object
	 * @returns {WebpackOptions} options object
	 */
	process(options, compiler) {
		compiler.outputPath = options.output.path;
		compiler.recordsInputPath = options.recordsInputPath || options.recordsPath;
		compiler.recordsOutputPath =
			options.recordsOutputPath || options.recordsPath;
		compiler.name = options.name;
		if (typeof options.target === "string") {
			switch (options.target) {
				case "web": {
					const JsonpTemplatePlugin = require("./web/JsonpTemplatePlugin");
					const FetchCompileWasmPlugin = require("./web/FetchCompileWasmPlugin");
					const NodeSourcePlugin = require("./node/NodeSourcePlugin");
					new JsonpTemplatePlugin().apply(compiler);
					new FetchCompileWasmPlugin({
						mangleImports: options.optimization.mangleWasmImports
					}).apply(compiler);
					new FunctionModulePlugin().apply(compiler);
					new NodeSourcePlugin(options.node).apply(compiler);
					new LoaderTargetPlugin(options.target).apply(compiler);
					break;
				}
				case "webworker": {
					const WebWorkerTemplatePlugin = require("./webworker/WebWorkerTemplatePlugin");
					const FetchCompileWasmPlugin = require("./web/FetchCompileWasmPlugin");
					const NodeSourcePlugin = require("./node/NodeSourcePlugin");
					const StartupChunkDependenciesPlugin = require("./runtime/StartupChunkDependenciesPlugin");
					new WebWorkerTemplatePlugin().apply(compiler);
					new FetchCompileWasmPlugin({
						mangleImports: options.optimization.mangleWasmImports
					}).apply(compiler);
					new FunctionModulePlugin().apply(compiler);
					new NodeSourcePlugin(options.node).apply(compiler);
					new LoaderTargetPlugin(options.target).apply(compiler);
					new StartupChunkDependenciesPlugin({
						asyncChunkLoading: true
					}).apply(compiler);
					break;
				}
				case "node":
				case "async-node": {
					const NodeTemplatePlugin = require("./node/NodeTemplatePlugin");
					const ReadFileCompileWasmPlugin = require("./node/ReadFileCompileWasmPlugin");
					const NodeTargetPlugin = require("./node/NodeTargetPlugin");
					const StartupChunkDependenciesPlugin = require("./runtime/StartupChunkDependenciesPlugin");
					new NodeTemplatePlugin({
						asyncChunkLoading: options.target === "async-node"
					}).apply(compiler);
					new ReadFileCompileWasmPlugin({
						mangleImports: options.optimization.mangleWasmImports
					}).apply(compiler);
					new FunctionModulePlugin().apply(compiler);
					new NodeTargetPlugin().apply(compiler);
					new LoaderTargetPlugin("node").apply(compiler);
					new StartupChunkDependenciesPlugin({
						asyncChunkLoading: options.target === "async-node"
					}).apply(compiler);
					break;
				}
				case "universal": {
					const UniversalTemplatePlugin = require("./universal/UniversalTemplatePlugin");
					const JsonpTemplatePlugin = require("./web/JsonpTemplatePlugin");
					const WebWorkerTemplatePlugin = require("./webworker/WebWorkerTemplatePlugin");
					const NodeTemplatePlugin = require("./node/NodeTemplatePlugin");
					const NodeSourcePlugin = require("./node/NodeSourcePlugin");
					const StartupChunkDependenciesPlugin = require("./runtime/StartupChunkDependenciesPlugin");
					new UniversalTemplatePlugin().apply(compiler);
					new JsonpTemplatePlugin().apply(compiler);
					new WebWorkerTemplatePlugin().apply(compiler);
					new NodeTemplatePlugin().apply(compiler);
					// TODO Wasm ?
					new FunctionModulePlugin().apply(compiler);
					new NodeSourcePlugin(options.node).apply(compiler);
					new LoaderTargetPlugin(options.target).apply(compiler);
					new StartupChunkDependenciesPlugin().apply(compiler);
					break;
				}
				case "node-webkit": {
					const JsonpTemplatePlugin = require("./web/JsonpTemplatePlugin");
					const NodeTargetPlugin = require("./node/NodeTargetPlugin");
					const ExternalsPlugin = require("./ExternalsPlugin");
					const StartupChunkDependenciesPlugin = require("./runtime/StartupChunkDependenciesPlugin");
					new JsonpTemplatePlugin().apply(compiler);
					new FunctionModulePlugin().apply(compiler);
					new NodeTargetPlugin().apply(compiler);
					new ExternalsPlugin("commonjs", "nw.gui").apply(compiler);
					new LoaderTargetPlugin(options.target).apply(compiler);
					new StartupChunkDependenciesPlugin({
						asyncChunkLoading: true
					}).apply(compiler);
					break;
				}
				case "electron-main": {
					const NodeTemplatePlugin = require("./node/NodeTemplatePlugin");
					const NodeTargetPlugin = require("./node/NodeTargetPlugin");
					const ExternalsPlugin = require("./ExternalsPlugin");
					const StartupChunkDependenciesPlugin = require("./runtime/StartupChunkDependenciesPlugin");
					new NodeTemplatePlugin({
						asyncChunkLoading: true
					}).apply(compiler);
					new FunctionModulePlugin().apply(compiler);
					new NodeTargetPlugin().apply(compiler);
					new ExternalsPlugin("commonjs", [
						"app",
						"auto-updater",
						"browser-window",
						"clipboard",
						"content-tracing",
						"crash-reporter",
						"dialog",
						"electron",
						"global-shortcut",
						"ipc",
						"ipc-main",
						"menu",
						"menu-item",
						"native-image",
						"original-fs",
						"power-monitor",
						"power-save-blocker",
						"protocol",
						"screen",
						"session",
						"shell",
						"tray",
						"web-contents"
					]).apply(compiler);
					new LoaderTargetPlugin(options.target).apply(compiler);
					new StartupChunkDependenciesPlugin({
						asyncChunkLoading: true
					}).apply(compiler);
					break;
				}
				case "electron-renderer": {
					const JsonpTemplatePlugin = require("./web/JsonpTemplatePlugin");
					const FetchCompileWasmPlugin = require("./web/FetchCompileWasmPlugin");
					const NodeTargetPlugin = require("./node/NodeTargetPlugin");
					const ExternalsPlugin = require("./ExternalsPlugin");
					new JsonpTemplatePlugin().apply(compiler);
					new FetchCompileWasmPlugin({
						mangleImports: options.optimization.mangleWasmImports
					}).apply(compiler);
					new FunctionModulePlugin().apply(compiler);
					new NodeTargetPlugin().apply(compiler);
					new ExternalsPlugin("commonjs", [
						"clipboard",
						"crash-reporter",
						"desktop-capturer",
						"electron",
						"ipc",
						"ipc-renderer",
						"native-image",
						"original-fs",
						"remote",
						"screen",
						"shell",
						"web-frame"
					]).apply(compiler);
					new LoaderTargetPlugin(options.target).apply(compiler);
					break;
				}
				default:
					throw new Error("Unsupported target '" + options.target + "'.");
			}
		}
		// @ts-ignore This is always true, which is good this way
		else if (options.target !== false) {
			options.target(compiler);
		} else {
			throw new Error("Unsupported target '" + options.target + "'.");
		}

		if (options.output.library || options.output.libraryTarget !== "var") {
			const LibraryTemplatePlugin = require("./LibraryTemplatePlugin");
			new LibraryTemplatePlugin(
				options.output.library,
				options.output.libraryTarget,
				options.output.umdNamedDefine,
				options.output.auxiliaryComment || "",
				options.output.libraryExport
			).apply(compiler);
		}
		if (options.externals) {
			const ExternalsPlugin = require("./ExternalsPlugin");
			new ExternalsPlugin(
				options.output.libraryTarget,
				options.externals
			).apply(compiler);
		}

		if (
			options.devtool &&
			(options.devtool.includes("sourcemap") ||
				options.devtool.includes("source-map"))
		) {
			const hidden = options.devtool.includes("hidden");
			const inline = options.devtool.includes("inline");
			const evalWrapped = options.devtool.includes("eval");
			const cheap = options.devtool.includes("cheap");
			const moduleMaps = options.devtool.includes("module");
			const noSources = options.devtool.includes("nosources");
			const legacy = options.devtool.includes("@");
			const modern = options.devtool.includes("#");
			const comment =
				legacy && modern
					? "\n/*\n//@ source" +
					  "MappingURL=[url]\n//# source" +
					  "MappingURL=[url]\n*/"
					: legacy
					? "\n/*\n//@ source" + "MappingURL=[url]\n*/"
					: modern
					? "\n//# source" + "MappingURL=[url]"
					: null;
			const Plugin = evalWrapped
				? EvalSourceMapDevToolPlugin
				: SourceMapDevToolPlugin;
			new Plugin({
				filename: inline ? null : options.output.sourceMapFilename,
				moduleFilenameTemplate: options.output.devtoolModuleFilenameTemplate,
				fallbackModuleFilenameTemplate:
					options.output.devtoolFallbackModuleFilenameTemplate,
				append: hidden ? false : comment,
				module: moduleMaps ? true : cheap ? false : true,
				columns: cheap ? false : true,
				noSources: noSources,
				namespace: options.output.devtoolNamespace
			}).apply(compiler);
		} else if (options.devtool && options.devtool.includes("eval")) {
			const legacy = options.devtool.includes("@");
			const modern = options.devtool.includes("#");
			const comment =
				legacy && modern
					? "\n//@ sourceURL=[url]\n//# sourceURL=[url]"
					: legacy
					? "\n//@ sourceURL=[url]"
					: modern
					? "\n//# sourceURL=[url]"
					: null;
			new EvalDevToolModulePlugin({
				sourceUrlComment: comment,
				moduleFilenameTemplate: options.output.devtoolModuleFilenameTemplate,
				namespace: options.output.devtoolNamespace
			}).apply(compiler);
		}

		new JavascriptModulesPlugin().apply(compiler);
		new JsonModulesPlugin().apply(compiler);
		new WebAssemblyModulesPlugin({
			mangleImports: options.optimization.mangleWasmImports
		}).apply(compiler);

		new EntryOptionPlugin().apply(compiler);
		compiler.hooks.entryOption.call(options.context, options.entry);

		new RuntimePlugin().apply(compiler);

		new CompatibilityPlugin().apply(compiler);
		new HarmonyModulesPlugin(options.module).apply(compiler);
		if (options.amd !== false) {
			const AMDPlugin = require("./dependencies/AMDPlugin");
			const RequireJsStuffPlugin = require("./RequireJsStuffPlugin");
			new AMDPlugin(options.module, options.amd || {}).apply(compiler);
			new RequireJsStuffPlugin().apply(compiler);
		}
		new CommonJsPlugin(options.module).apply(compiler);
		new LoaderPlugin().apply(compiler);
		if (options.node !== false) {
			const NodeStuffPlugin = require("./NodeStuffPlugin");
			new NodeStuffPlugin(options.node).apply(compiler);
		}
		new CommonJsStuffPlugin().apply(compiler);
		new APIPlugin().apply(compiler);
		new ConstPlugin().apply(compiler);
		new UseStrictPlugin().apply(compiler);
		new RequireIncludePlugin().apply(compiler);
		new RequireEnsurePlugin().apply(compiler);
		new RequireContextPlugin(
			options.resolve.modules,
			options.resolve.extensions,
			options.resolve.mainFiles
		).apply(compiler);
		new ImportPlugin(options.module).apply(compiler);
		new SystemPlugin(options.module).apply(compiler);

		new DefaultStatsFactoryPlugin().apply(compiler);
		new DefaultStatsPresetPlugin().apply(compiler);
		new DefaultStatsPrinterPlugin().apply(compiler);

		if (typeof options.mode !== "string") {
			const WarnNoModeSetPlugin = require("./WarnNoModeSetPlugin");
			new WarnNoModeSetPlugin().apply(compiler);
		}

		const EnsureChunkConditionsPlugin = require("./optimize/EnsureChunkConditionsPlugin");
		new EnsureChunkConditionsPlugin().apply(compiler);
		if (options.optimization.removeAvailableModules) {
			const RemoveParentModulesPlugin = require("./optimize/RemoveParentModulesPlugin");
			new RemoveParentModulesPlugin().apply(compiler);
		}
		if (options.optimization.removeEmptyChunks) {
			const RemoveEmptyChunksPlugin = require("./optimize/RemoveEmptyChunksPlugin");
			new RemoveEmptyChunksPlugin().apply(compiler);
		}
		if (options.optimization.mergeDuplicateChunks) {
			const MergeDuplicateChunksPlugin = require("./optimize/MergeDuplicateChunksPlugin");
			new MergeDuplicateChunksPlugin().apply(compiler);
		}
		if (options.optimization.flagIncludedChunks) {
			const FlagIncludedChunksPlugin = require("./optimize/FlagIncludedChunksPlugin");
			new FlagIncludedChunksPlugin().apply(compiler);
		}
		if (options.optimization.sideEffects) {
			const SideEffectsFlagPlugin = require("./optimize/SideEffectsFlagPlugin");
			new SideEffectsFlagPlugin().apply(compiler);
		}
		if (options.optimization.providedExports) {
			const FlagDependencyExportsPlugin = require("./FlagDependencyExportsPlugin");
			new FlagDependencyExportsPlugin().apply(compiler);
		}
		if (options.optimization.usedExports) {
			const FlagDependencyUsagePlugin = require("./FlagDependencyUsagePlugin");
			new FlagDependencyUsagePlugin().apply(compiler);
		}
		if (options.optimization.mangleExports) {
			const MangleExportsPlugin = require("./optimize/MangleExportsPlugin");
			new MangleExportsPlugin().apply(compiler);
		}
		if (options.optimization.concatenateModules) {
			const ModuleConcatenationPlugin = require("./optimize/ModuleConcatenationPlugin");
			new ModuleConcatenationPlugin().apply(compiler);
		}
		if (options.optimization.splitChunks) {
			const SplitChunksPlugin = require("./optimize/SplitChunksPlugin");
			new SplitChunksPlugin(options.optimization.splitChunks).apply(compiler);
		}
		if (options.optimization.runtimeChunk) {
			const RuntimeChunkPlugin = require("./optimize/RuntimeChunkPlugin");
			new RuntimeChunkPlugin(options.optimization.runtimeChunk).apply(compiler);
		}
		if (options.optimization.noEmitOnErrors) {
			const NoEmitOnErrorsPlugin = require("./NoEmitOnErrorsPlugin");
			new NoEmitOnErrorsPlugin().apply(compiler);
		}
		if (options.optimization.checkWasmTypes) {
			const WasmFinalizeExportsPlugin = require("./wasm/WasmFinalizeExportsPlugin");
			new WasmFinalizeExportsPlugin().apply(compiler);
		}
		const moduleIds = options.optimization.moduleIds;
		if (moduleIds) {
			switch (moduleIds) {
				case "natural": {
					const NaturalModuleIdsPlugin = require("./ids/NaturalModuleIdsPlugin");
					new NaturalModuleIdsPlugin().apply(compiler);
					break;
				}
				case "named": {
					const NamedModuleIdsPlugin = require("./ids/NamedModuleIdsPlugin");
					new NamedModuleIdsPlugin().apply(compiler);
					break;
				}
				case "hashed": {
					const WarnDeprecatedOptionPlugin = require("./WarnDeprecatedOptionPlugin");
					const HashedModuleIdsPlugin = require("./ids/HashedModuleIdsPlugin");
					new WarnDeprecatedOptionPlugin(
						"optimization.moduleIds",
						"hashed",
						"deterministic"
					).apply(compiler);
					new HashedModuleIdsPlugin().apply(compiler);
					break;
				}
				case "deterministic": {
					const DeterministicModuleIdsPlugin = require("./ids/DeterministicModuleIdsPlugin");
					new DeterministicModuleIdsPlugin().apply(compiler);
					break;
				}
				case "size": {
					const OccurrenceModuleIdsPlugin = require("./ids/OccurrenceModuleIdsPlugin");
					new OccurrenceModuleIdsPlugin({
						prioritiseInitial: true
					}).apply(compiler);
					break;
				}
				default:
					throw new Error(
						`webpack bug: moduleIds: ${moduleIds} is not implemented`
					);
			}
		}
		const chunkIds = options.optimization.chunkIds;
		if (chunkIds) {
			switch (chunkIds) {
				case "natural": {
					const NaturalChunkIdsPlugin = require("./ids/NaturalChunkIdsPlugin");
					new NaturalChunkIdsPlugin().apply(compiler);
					break;
				}
				case "named": {
					const NamedChunkIdsPlugin = require("./ids/NamedChunkIdsPlugin");
					new NamedChunkIdsPlugin().apply(compiler);
					break;
				}
				case "deterministic": {
					const DeterministicChunkIdsPlugin = require("./ids/DeterministicChunkIdsPlugin");
					new DeterministicChunkIdsPlugin().apply(compiler);
					break;
				}
				case "size":
					new OccurrenceChunkIdsPlugin({
						prioritiseInitial: true
					}).apply(compiler);
					break;
				case "total-size":
					new OccurrenceChunkIdsPlugin({
						prioritiseInitial: false
					}).apply(compiler);
					break;
				default:
					throw new Error(
						`webpack bug: chunkIds: ${chunkIds} is not implemented`
					);
			}
		}
		if (options.optimization.nodeEnv) {
			const DefinePlugin = require("./DefinePlugin");
			new DefinePlugin({
				"process.env.NODE_ENV": JSON.stringify(options.optimization.nodeEnv)
			}).apply(compiler);
		}
		if (options.optimization.minimize) {
			for (const minimizer of options.optimization.minimizer) {
				if (typeof minimizer === "function") {
					minimizer.call(compiler, compiler);
				} else {
					minimizer.apply(compiler);
				}
			}
		}

		if (options.performance) {
			const SizeLimitsPlugin = require("./performance/SizeLimitsPlugin");
			new SizeLimitsPlugin(options.performance).apply(compiler);
		}

		new TemplatedPathPlugin().apply(compiler);

		new RecordIdsPlugin({
			portableIds: options.optimization.portableRecords
		}).apply(compiler);

		new WarnCaseSensitiveModulesPlugin().apply(compiler);

		if (options.cache && typeof options.cache === "object") {
			const cacheOptions = options.cache;
			switch (cacheOptions.type) {
				case "memory": {
					const MemoryCachePlugin = require("./cache/MemoryCachePlugin");
					new MemoryCachePlugin().apply(compiler);
					break;
				}
				case "filesystem": {
					const MemoryCachePlugin = require("./cache/MemoryCachePlugin");
					new MemoryCachePlugin().apply(compiler);
					switch (cacheOptions.store) {
						case "instant": {
							const InstantFileCachePlugin = require("./cache/InstantFileCachePlugin");
							const SeparateFilesCacheStrategy = require("./cache/SeparateFilesCacheStrategy");
							new InstantFileCachePlugin(
								new SeparateFilesCacheStrategy({
									cacheLocation: cacheOptions.cacheLocation,
									version: cacheOptions.version,
									hashAlgorithm: cacheOptions.hashAlgorithm,
									loglevel: cacheOptions.loglevel
								})
							).apply(compiler);
							break;
						}
						case "background": {
							const BackgroundFileCachePlugin = require("./cache/BackgroundFileCachePlugin");
							const SeparateFilesCacheStrategy = require("./cache/SeparateFilesCacheStrategy");
							new BackgroundFileCachePlugin(
								new SeparateFilesCacheStrategy({
									cacheLocation: cacheOptions.cacheLocation,
									version: cacheOptions.version,
									hashAlgorithm: cacheOptions.hashAlgorithm,
									loglevel: cacheOptions.loglevel
								})
							).apply(compiler);
							break;
						}
						case "idle": {
							const IdleFileCachePlugin = require("./cache/IdleFileCachePlugin");
							const SeparateFilesCacheStrategy = require("./cache/SeparateFilesCacheStrategy");
							new IdleFileCachePlugin(
								new SeparateFilesCacheStrategy({
									cacheLocation: cacheOptions.cacheLocation,
									version: cacheOptions.version,
									hashAlgorithm: cacheOptions.hashAlgorithm,
									loglevel: cacheOptions.loglevel
								})
							).apply(compiler);
							break;
						}
						case "pack": {
							const IdleFileCachePlugin = require("./cache/IdleFileCachePlugin");
							const PackFileCacheStrategy = require("./cache/PackFileCacheStrategy");
							new IdleFileCachePlugin(
								new PackFileCacheStrategy({
									cacheLocation: cacheOptions.cacheLocation,
									version: cacheOptions.version,
									loglevel: cacheOptions.loglevel
								})
							).apply(compiler);
							break;
						}
					}
					break;
				}
				default:
					// @ts-ignore never is expected here
					throw new Error(`Unknown cache type ${options.cache.type}`);
			}
		}
		new ResolverCachePlugin().apply(compiler);

		compiler.hooks.afterPlugins.call(compiler);
		if (!compiler.inputFileSystem) {
			throw new Error("No input filesystem provided");
		}
		compiler.resolverFactory.hooks.resolveOptions
			.for("normal")
			.tap("WebpackOptionsApply", resolveOptions => {
				return Object.assign(
					{
						fileSystem: compiler.inputFileSystem
					},
					cachedCleverMerge(options.resolve, resolveOptions)
				);
			});
		compiler.resolverFactory.hooks.resolveOptions
			.for("context")
			.tap("WebpackOptionsApply", resolveOptions => {
				return Object.assign(
					{
						fileSystem: compiler.inputFileSystem,
						resolveToContext: true
					},
					cachedCleverMerge(options.resolve, resolveOptions)
				);
			});
		compiler.resolverFactory.hooks.resolveOptions
			.for("loader")
			.tap("WebpackOptionsApply", resolveOptions => {
				return Object.assign(
					{
						fileSystem: compiler.inputFileSystem
					},
					cachedCleverMerge(options.resolveLoader, resolveOptions)
				);
			});
		compiler.hooks.afterResolvers.call(compiler);
		return options;
	}
}

module.exports = WebpackOptionsApply;
