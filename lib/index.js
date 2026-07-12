/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import nodeUtil from "node:util";
import { ValidationError } from "schema-utils";
import sources from "webpack-sources";
import packageJson from "../package.json" with { type: "json" };
import webpackOptionsSchemaCheck from "../schemas/WebpackOptions.check.js";
import webpackOptionsSchema from "../schemas/WebpackOptions.json" with { type: "json" };
import AsyncDependenciesBlock from "./AsyncDependenciesBlock.js";
import AutomaticPrefetchPlugin from "./AutomaticPrefetchPlugin.js";
import BannerPlugin from "./BannerPlugin.js";
import Cache from "./Cache.js";
import Chunk from "./Chunk.js";
import ChunkGraph from "./ChunkGraph.js";
import CleanPlugin from "./CleanPlugin.js";
import Compilation from "./Compilation.js";
import Compiler from "./Compiler.js";
import ConcatenationScope from "./ConcatenationScope.js";
import ContextExclusionPlugin from "./ContextExclusionPlugin.js";
import ContextReplacementPlugin from "./ContextReplacementPlugin.js";
import DefinePlugin from "./DefinePlugin.js";
import Dependency from "./Dependency.js";
import DotenvPlugin from "./DotenvPlugin.js";
import DynamicEntryPlugin from "./DynamicEntryPlugin.js";
import EntryOptionPlugin from "./EntryOptionPlugin.js";
import EntryPlugin from "./EntryPlugin.js";
import EnvironmentPlugin from "./EnvironmentPlugin.js";
import EvalDevToolModulePlugin from "./EvalDevToolModulePlugin.js";
import EvalSourceMapDevToolPlugin from "./EvalSourceMapDevToolPlugin.js";
import { UsageState } from "./ExportsInfo.js";
import ExternalModule from "./ExternalModule.js";
import ExternalsPlugin from "./ExternalsPlugin.js";
import Generator from "./Generator.js";
import HotModuleReplacementPlugin from "./HotModuleReplacementPlugin.js";
import HotUpdateChunk from "./HotUpdateChunk.js";
import IgnorePlugin from "./IgnorePlugin.js";
import InitFragment from "./InitFragment.js";
import RawLibraryTemplatePlugin from "./LibraryTemplatePlugin.js";
import LoaderOptionsPlugin from "./LoaderOptionsPlugin.js";
import LoaderTargetPlugin from "./LoaderTargetPlugin.js";
import ManifestPlugin from "./ManifestPlugin.js";
import Module from "./Module.js";
import ModuleFactory from "./ModuleFactory.js";
import ModuleFilenameHelpers from "./ModuleFilenameHelpers.js";
import ModuleGraph from "./ModuleGraph.js";
import ModuleGraphConnection from "./ModuleGraphConnection.js";
import MultiCompiler from "./MultiCompiler.js";
import NoEmitOnErrorsPlugin from "./NoEmitOnErrorsPlugin.js";
import NormalModule from "./NormalModule.js";
import NormalModuleReplacementPlugin from "./NormalModuleReplacementPlugin.js";
import * as OptimizationStages from "./OptimizationStages.js";
import Parser from "./Parser.js";
import PlatformPlugin from "./PlatformPlugin.js";
import PrefetchPlugin from "./PrefetchPlugin.js";
import ProgressPlugin from "./ProgressPlugin.js";
import ProvidePlugin from "./ProvidePlugin.js";
import * as RuntimeGlobals from "./RuntimeGlobals.js";
import RuntimeModule from "./RuntimeModule.js";
import SourceMapDevToolPlugin from "./SourceMapDevToolPlugin.js";
import Stats from "./Stats.js";
import Template from "./Template.js";
import WatchIgnorePlugin from "./WatchIgnorePlugin.js";
import WebpackOptionsApply from "./WebpackOptionsApply.js";
import RawWebpackOptionsDefaulter from "./WebpackOptionsDefaulter.js";
import MemoryCachePlugin from "./cache/MemoryCachePlugin.js";
import * as cli from "./cli.js";
import { applyWebpackOptionsDefaults } from "./config/defaults.js";
import defineConfig from "./config/defineConfig.js";
import { getNormalizedWebpackOptions } from "./config/normalization.js";
import ContainerPlugin from "./container/ContainerPlugin.js";
import ContainerReferencePlugin from "./container/ContainerReferencePlugin.js";
import ModuleFederationPlugin from "./container/ModuleFederationPlugin.js";
import { scope } from "./container/options.js";
import CssLoadingRuntimeModule from "./css/CssLoadingRuntimeModule.js";
import CssModulesPlugin from "./css/CssModulesPlugin.js";
import ProfilingPlugin from "./debug/ProfilingPlugin.js";
import ConstDependency from "./dependencies/ConstDependency.js";
import HarmonyImportDependency from "./dependencies/HarmonyImportDependency.js";
import ModuleDependency from "./dependencies/ModuleDependency.js";
import NullDependency from "./dependencies/NullDependency.js";
import DelegatedPlugin from "./dll/DelegatedPlugin.js";
import DllPlugin from "./dll/DllPlugin.js";
import DllReferencePlugin from "./dll/DllReferencePlugin.js";
import LibManifestPlugin from "./dll/LibManifestPlugin.js";
import ElectronTargetPlugin from "./electron/ElectronTargetPlugin.js";
import WebpackError from "./errors/WebpackError.js";
import ModuleChunkLoadingRuntimeModule from "./esm/ModuleChunkLoadingRuntimeModule.js";
import ChunkModuleIdRangePlugin from "./ids/ChunkModuleIdRangePlugin.js";
import DeterministicChunkIdsPlugin from "./ids/DeterministicChunkIdsPlugin.js";
import DeterministicModuleIdsPlugin from "./ids/DeterministicModuleIdsPlugin.js";
import HashedModuleIdsPlugin from "./ids/HashedModuleIdsPlugin.js";
import NamedChunkIdsPlugin from "./ids/NamedChunkIdsPlugin.js";
import NamedModuleIdsPlugin from "./ids/NamedModuleIdsPlugin.js";
import NaturalModuleIdsPlugin from "./ids/NaturalModuleIdsPlugin.js";
import OccurrenceChunkIdsPlugin from "./ids/OccurrenceChunkIdsPlugin.js";
import OccurrenceModuleIdsPlugin from "./ids/OccurrenceModuleIdsPlugin.js";
import SyncModuleIdsPlugin from "./ids/SyncModuleIdsPlugin.js";
import EnableChunkLoadingPlugin from "./javascript/EnableChunkLoadingPlugin.js";
import RawJavascriptModulesPlugin from "./javascript/JavascriptModulesPlugin.js";
import JavascriptParser from "./javascript/JavascriptParser.js";
import AbstractLibraryPlugin from "./library/AbstractLibraryPlugin.js";
import EnableLibraryPlugin from "./library/EnableLibraryPlugin.js";
import NodeEnvironmentPlugin from "./node/NodeEnvironmentPlugin.js";
import NodeSourcePlugin from "./node/NodeSourcePlugin.js";
import NodeTargetPlugin from "./node/NodeTargetPlugin.js";
import NodeTemplatePlugin from "./node/NodeTemplatePlugin.js";
import ReadFileCompileAsyncWasmPlugin from "./node/ReadFileCompileAsyncWasmPlugin.js";
import ReadFileCompileWasmPlugin from "./node/ReadFileCompileWasmPlugin.js";
import AggressiveMergingPlugin from "./optimize/AggressiveMergingPlugin.js";
import RawAggressiveSplittingPlugin from "./optimize/AggressiveSplittingPlugin.js";
import * as InnerGraph from "./optimize/InnerGraph.js";
import LimitChunkCountPlugin from "./optimize/LimitChunkCountPlugin.js";
import MergeDuplicateChunksPlugin from "./optimize/MergeDuplicateChunksPlugin.js";
import MinChunkSizePlugin from "./optimize/MinChunkSizePlugin.js";
import ModuleConcatenationPlugin from "./optimize/ModuleConcatenationPlugin.js";
import RealContentHashPlugin from "./optimize/RealContentHashPlugin.js";
import RuntimeChunkPlugin from "./optimize/RuntimeChunkPlugin.js";
import SideEffectsFlagPlugin from "./optimize/SideEffectsFlagPlugin.js";
import SplitChunksPlugin from "./optimize/SplitChunksPlugin.js";
import ChunkPrefetchPreloadPlugin from "./prefetch/ChunkPrefetchPreloadPlugin.js";
import GetChunkFilenameRuntimeModule from "./runtime/GetChunkFilenameRuntimeModule.js";
import LoadScriptRuntimeModule from "./runtime/LoadScriptRuntimeModule.js";
import HttpUriPlugin from "./schemes/HttpUriPlugin.js";
import VirtualUrlPlugin from "./schemes/VirtualUrlPlugin.js";
import ConsumeSharedPlugin from "./sharing/ConsumeSharedPlugin.js";
import ProvideSharedPlugin from "./sharing/ProvideSharedPlugin.js";
import SharePlugin from "./sharing/SharePlugin.js";
import LazySet from "./util/LazySet.js";
import { cachedCleverMerge } from "./util/cleverMerge.js";
import * as comparators from "./util/comparators.js";
import compileBooleanMatcher from "./util/compileBooleanMatcher.js";
import createHash from "./util/createHash.js";
import * as utilRuntime from "./util/runtime.js";
import serialization from "./util/serialization.js";
import validateSchema from "./validateSchema.js";
import EnableWasmLoadingPlugin from "./wasm/EnableWasmLoadingPlugin.js";
import AsyncWebAssemblyModulesPlugin from "./wasm-async/AsyncWebAssemblyModulesPlugin.js";
import FetchCompileAsyncWasmPlugin from "./web/FetchCompileAsyncWasmPlugin.js";
import FetchCompileWasmPlugin from "./web/FetchCompileWasmPlugin.js";
import JsonpChunkLoadingRuntimeModule from "./web/JsonpChunkLoadingRuntimeModule.js";
import JsonpTemplatePlugin from "./web/JsonpTemplatePlugin.js";
import webpack from "./webpack.js";
import WebWorkerTemplatePlugin from "./webworker/WebWorkerTemplatePlugin.js";

/** @typedef {import("../declarations/WebpackOptions.js").Entry} Entry */
/** @typedef {import("../declarations/WebpackOptions.js").EntryNormalized} EntryNormalized */
/** @typedef {import("../declarations/WebpackOptions.js").EntryObject} EntryObject */
/** @typedef {import("../declarations/WebpackOptions.js").ExternalItem} ExternalItem */
/** @typedef {import("../declarations/WebpackOptions.js").ExternalItemFunction} ExternalItemFunction */
/** @typedef {import("../declarations/WebpackOptions.js").ExternalItemObjectKnown} ExternalItemObjectKnown */
/** @typedef {import("../declarations/WebpackOptions.js").ExternalItemObjectUnknown} ExternalItemObjectUnknown */
/** @typedef {import("../declarations/WebpackOptions.js").ExternalItemValue} ExternalItemValue */
/** @typedef {import("../declarations/WebpackOptions.js").Externals} Externals */
/** @typedef {import("../declarations/WebpackOptions.js").FileCacheOptions} FileCacheOptions */
/** @typedef {import("../declarations/WebpackOptions.js").GeneratorOptionsByModuleTypeKnown} GeneratorOptionsByModuleTypeKnown */
/** @typedef {import("../declarations/WebpackOptions.js").LibraryOptions} LibraryOptions */
/** @typedef {import("../declarations/WebpackOptions.js").MemoryCacheOptions} MemoryCacheOptions */
/** @typedef {import("../declarations/WebpackOptions.js").ModuleOptions} ModuleOptions */
/** @typedef {import("../declarations/WebpackOptions.js").ParserOptionsByModuleTypeKnown} ParserOptionsByModuleTypeKnown */
/** @typedef {import("../declarations/WebpackOptions.js").ResolveOptions} ResolveOptions */
/** @typedef {import("../declarations/WebpackOptions.js").RuleSetCondition} RuleSetCondition */
/** @typedef {import("../declarations/WebpackOptions.js").RuleSetConditionAbsolute} RuleSetConditionAbsolute */
/** @typedef {import("../declarations/WebpackOptions.js").RuleSetRule} RuleSetRule */
/** @typedef {import("../declarations/WebpackOptions.js").RuleSetUse} RuleSetUse */
/** @typedef {import("../declarations/WebpackOptions.js").RuleSetUseFunction} RuleSetUseFunction */
/** @typedef {import("../declarations/WebpackOptions.js").RuleSetUseItem} RuleSetUseItem */
/** @typedef {import("../declarations/WebpackOptions.js").StatsOptions} StatsOptions */
/** @typedef {import("../declarations/WebpackOptions.js").WebpackOptions} Configuration */
/** @typedef {import("../declarations/WebpackOptions.js").WebpackOptionsNormalized} WebpackOptionsNormalized */
/** @typedef {import("../declarations/WebpackOptions.js").WebpackPluginFunction} WebpackPluginFunction */
/** @typedef {import("../declarations/WebpackOptions.js").WebpackPluginInstance} WebpackPluginInstance */
/** @typedef {import("./asset/AssetModule.js").AssetModuleBuildInfo} AssetModuleBuildInfo */
/** @typedef {import("./ChunkGroup.js").default} ChunkGroup */
/** @typedef {import("./Compiler.js").AssetEmittedInfo} AssetEmittedInfo */
/** @typedef {import("./ContextModule.js").ContextModuleBuildInfo} ContextModuleBuildInfo */
/** @typedef {import("./css/CssModule.js").CssModuleBuildInfo} CssModuleBuildInfo */
/** @typedef {import("./css/CssModule.js").CssModuleBuildMeta} CssModuleBuildMeta */
/** @typedef {import("./ExternalModule.js").ExternalModuleBuildInfo} ExternalModuleBuildInfo */
/** @typedef {import("./html/HtmlModule.js").HtmlModuleBuildInfo} HtmlModuleBuildInfo */
/** @typedef {import("./javascript/JavascriptModule.js").JavascriptModuleBuildInfo} JavascriptModuleBuildInfo */
/** @typedef {import("./javascript/JavascriptModule.js").JavascriptModuleBuildMeta} JavascriptModuleBuildMeta */
/** @typedef {import("./json/JsonModule.js").JsonModuleBuildInfo} JsonModuleBuildInfo */
/** @typedef {import("./Module.js").BuildInfo} BuildInfo */
/** @typedef {import("./Module.js").BuildMeta} BuildMeta */
/** @typedef {import("./NormalModule.js").NormalModuleBuildInfo} NormalModuleBuildInfo */
/** @typedef {import("./optimize/ConcatenatedModule.js").ConcatenatedModuleBuildInfo} ConcatenatedModuleBuildInfo */
/** @typedef {import("./wasm-sync/SyncWasmModule.js").SyncWasmModuleBuildMeta} SyncWasmModuleBuildMeta */
/** @typedef {import("./Compilation.js").Asset} Asset */
/** @typedef {import("./Compilation.js").AssetInfo} AssetInfo */
/** @typedef {import("./Compilation.js").EntryOptions} EntryOptions */
/** @typedef {import("./Compilation.js").PathData} PathData */
/** @typedef {import("./Compilation.js").PathDataChunk} PathDataChunk */
/** @typedef {import("./Compilation.js").PathDataModule} PathDataModule */
/** @typedef {import("./CodeGenerationResults.js").default} CodeGenerationResults */
/** @typedef {import("./Entrypoint.js").default} Entrypoint */
/** @typedef {import("./ExternalModuleFactoryPlugin.js").ExternalItemFunctionCallback} ExternalItemFunctionCallback */
/** @typedef {import("./ExternalModuleFactoryPlugin.js").ExternalItemFunctionData} ExternalItemFunctionData */
/** @typedef {import("./ExternalModuleFactoryPlugin.js").ExternalItemFunctionDataGetResolve} ExternalItemFunctionDataGetResolve */
/** @typedef {import("./ExternalModuleFactoryPlugin.js").ExternalItemFunctionDataGetResolveCallbackResult} ExternalItemFunctionDataGetResolveCallbackResult */
/** @typedef {import("./ExternalModuleFactoryPlugin.js").ExternalItemFunctionDataGetResolveResult} ExternalItemFunctionDataGetResolveResult */
/** @typedef {import("./ExternalModuleFactoryPlugin.js").ExternalItemFunctionPromise} ExternalItemFunctionPromise */
/** @typedef {import("./MultiCompiler.js").MultiCompilerOptions} MultiCompilerOptions */
/** @typedef {import("./MultiCompiler.js").MultiWebpackOptions} MultiConfiguration */
/** @typedef {import("./MultiStats.js").default} MultiStats */
/** @typedef {import("./MultiStats.js").MultiStatsOptions} MultiStatsOptions */
/** @typedef {import("./NormalModuleFactory.js").ResolveData} ResolveData */
/** @typedef {import("./Parser.js").ParserState} ParserState */
/** @typedef {import("./ResolverFactory.js").ResolvePluginInstance} ResolvePluginInstance */
/** @typedef {import("./ResolverFactory.js").Resolver} Resolver */
/** @typedef {import("./Template.js").RenderManifestEntry} RenderManifestEntry */
/** @typedef {import("./Template.js").RenderManifestOptions} RenderManifestOptions */
/** @typedef {import("./TemplatedPathPlugin.js").TemplatePath} TemplatePath */
/** @typedef {import("./Watching.js").default} Watching */
/** @typedef {import("./cli.js").Argument} Argument */
/** @typedef {import("./cli.js").Problem} Problem */
/** @typedef {import("./cli.js").Colors} Colors */
/** @typedef {import("./cli.js").ColorsOptions} ColorsOptions */
/** @typedef {import("./config/defineConfig.js").ConfigurationFactory} ConfigurationFactory */
/** @typedef {import("./config/defineConfig.js").DefineConfigInput} DefineConfigInput */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin.js").StatsAsset} StatsAsset */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin.js").StatsChunk} StatsChunk */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin.js").StatsChunkGroup} StatsChunkGroup */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin.js").StatsChunkOrigin} StatsChunkOrigin */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin.js").StatsCompilation} StatsCompilation */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin.js").StatsError} StatsError */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin.js").StatsLogging} StatsLogging */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin.js").StatsLoggingEntry} StatsLoggingEntry */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin.js").StatsModule} StatsModule */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin.js").StatsModuleIssuer} StatsModuleIssuer */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin.js").StatsModuleReason} StatsModuleReason */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin.js").StatsModuleTraceDependency} StatsModuleTraceDependency */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin.js").StatsModuleTraceItem} StatsModuleTraceItem */
/** @typedef {import("./stats/DefaultStatsFactoryPlugin.js").StatsProfile} StatsProfile */
/** @typedef {import("./serialization/ObjectMiddleware.js").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("./serialization/ObjectMiddleware.js").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("./util/fs.js").InputFileSystem} InputFileSystem */
/** @typedef {import("./util/fs.js").OutputFileSystem} OutputFileSystem */

/**
 * Validates the given webpack options.
 * @param {Configuration | MultiConfiguration} options options
 * @returns {void}
 */
const validate = (options) => {
	if (
		!(
			/** @type {(configuration: Configuration | MultiConfiguration) => boolean} */ (
				webpackOptionsSchemaCheck
			)(options)
		)
	) {
		validateSchema(/** @type {EXPECTED_ANY} */ (webpackOptionsSchema), options);
	}
};

const version = /** @type {string} */ (packageJson.version);

const JavascriptModulesPlugin = nodeUtil.deprecate(
	RawJavascriptModulesPlugin,
	"webpack.JavascriptModulesPlugin has moved to webpack.javascript.JavascriptModulesPlugin",
	"DEP_WEBPACK_JAVASCRIPT_MODULES_PLUGIN"
);

const LibraryTemplatePlugin = nodeUtil.deprecate(
	RawLibraryTemplatePlugin,
	"webpack.LibraryTemplatePlugin is deprecated and has been replaced by compilation.outputOptions.library or compilation.addEntry + passing a library option",
	"DEP_WEBPACK_LIBRARY_TEMPLATE_PLUGIN"
);

const SingleEntryPlugin = nodeUtil.deprecate(
	EntryPlugin,
	"SingleEntryPlugin was renamed to EntryPlugin",
	"DEP_WEBPACK_SINGLE_ENTRY_PLUGIN"
);

const WebpackOptionsDefaulter = nodeUtil.deprecate(
	RawWebpackOptionsDefaulter,
	"webpack.WebpackOptionsDefaulter is deprecated and has been replaced by webpack.config.getNormalizedWebpackOptions and webpack.config.applyWebpackOptionsDefaults",
	"DEP_WEBPACK_OPTIONS_DEFAULTER"
);

const AggressiveSplittingPlugin = nodeUtil.deprecate(
	RawAggressiveSplittingPlugin,
	"AggressiveSplittingPlugin is deprecated in favor of SplitChunksPlugin",
	"DEP_WEBPACK_AGGRESSIVE_SPLITTING_PLUGIN"
);

const cache = Object.freeze({
	MemoryCachePlugin
});

const config = Object.freeze({
	getNormalizedWebpackOptions,
	applyWebpackOptionsDefaults
});

const dependencies = Object.freeze({
	ModuleDependency,
	HarmonyImportDependency,
	ConstDependency,
	NullDependency
});

const ids = Object.freeze({
	ChunkModuleIdRangePlugin,
	NaturalModuleIdsPlugin,
	OccurrenceModuleIdsPlugin,
	NamedModuleIdsPlugin,
	DeterministicChunkIdsPlugin,
	DeterministicModuleIdsPlugin,
	NamedChunkIdsPlugin,
	OccurrenceChunkIdsPlugin,
	HashedModuleIdsPlugin
});

const javascript = Object.freeze({
	EnableChunkLoadingPlugin,
	JavascriptModulesPlugin: RawJavascriptModulesPlugin,
	JavascriptParser
});

const optimize = Object.freeze({
	AggressiveMergingPlugin,
	AggressiveSplittingPlugin,
	InnerGraph,
	LimitChunkCountPlugin,
	MergeDuplicateChunksPlugin,
	MinChunkSizePlugin,
	ModuleConcatenationPlugin,
	RealContentHashPlugin,
	RuntimeChunkPlugin,
	SideEffectsFlagPlugin,
	SplitChunksPlugin
});

const runtime = Object.freeze({
	GetChunkFilenameRuntimeModule,
	LoadScriptRuntimeModule
});

const prefetch = Object.freeze({
	ChunkPrefetchPreloadPlugin
});

const web = Object.freeze({
	FetchCompileWasmPlugin,
	FetchCompileAsyncWasmPlugin,
	JsonpChunkLoadingRuntimeModule,
	JsonpTemplatePlugin,
	CssLoadingRuntimeModule
});

const esm = Object.freeze({
	ModuleChunkLoadingRuntimeModule
});

const webworker = Object.freeze({
	WebWorkerTemplatePlugin
});

const node = Object.freeze({
	NodeEnvironmentPlugin,
	NodeSourcePlugin,
	NodeTargetPlugin,
	NodeTemplatePlugin,
	ReadFileCompileWasmPlugin,
	ReadFileCompileAsyncWasmPlugin
});

const electron = Object.freeze({
	ElectronTargetPlugin
});

const wasm = Object.freeze({
	AsyncWebAssemblyModulesPlugin,
	EnableWasmLoadingPlugin
});

const css = Object.freeze({
	CssModulesPlugin
});

const library = Object.freeze({
	AbstractLibraryPlugin,
	EnableLibraryPlugin
});

const dll = Object.freeze({
	DelegatedPlugin,
	DllPlugin,
	DllReferencePlugin,
	LibManifestPlugin
});

const container = Object.freeze({
	ContainerPlugin,
	ContainerReferencePlugin,
	ModuleFederationPlugin,
	scope
});

const sharing = Object.freeze({
	ConsumeSharedPlugin,
	ProvideSharedPlugin,
	SharePlugin,
	scope
});

const debug = Object.freeze({
	ProfilingPlugin
});

const util = Object.freeze({
	createHash,
	comparators,
	runtime: utilRuntime,
	serialization,
	cleverMerge: cachedCleverMerge,
	LazySet,
	compileBooleanMatcher
});

const experiments = Object.freeze({
	schemes: Object.freeze({
		HttpUriPlugin,
		VirtualUrlPlugin
	}),
	ids: Object.freeze({
		SyncModuleIdsPlugin
	})
});

const exportsObject = Object.assign(webpack, {
	webpack,
	defineConfig,
	validate,
	validateSchema,
	version,
	cli,
	AutomaticPrefetchPlugin,
	AsyncDependenciesBlock,
	BannerPlugin,
	Cache,
	Chunk,
	ChunkGraph,
	CleanPlugin,
	Compilation,
	Compiler,
	ConcatenationScope,
	ContextExclusionPlugin,
	ContextReplacementPlugin,
	DefinePlugin,
	Dependency,
	DynamicEntryPlugin,
	DotenvPlugin,
	EntryOptionPlugin,
	EntryPlugin,
	EnvironmentPlugin,
	EvalDevToolModulePlugin,
	EvalSourceMapDevToolPlugin,
	ExternalModule,
	ExternalsPlugin,
	Generator,
	HotUpdateChunk,
	HotModuleReplacementPlugin,
	InitFragment,
	IgnorePlugin,
	JavascriptModulesPlugin,
	LibraryTemplatePlugin,
	LoaderOptionsPlugin,
	LoaderTargetPlugin,
	Module,
	ModuleFactory,
	ModuleFilenameHelpers,
	ModuleGraph,
	ModuleGraphConnection,
	NoEmitOnErrorsPlugin,
	NormalModule,
	NormalModuleReplacementPlugin,
	MultiCompiler,
	OptimizationStages,
	Parser,
	PlatformPlugin,
	PrefetchPlugin,
	ProgressPlugin,
	ProvidePlugin,
	RuntimeGlobals,
	RuntimeModule,
	SingleEntryPlugin,
	SourceMapDevToolPlugin,
	Stats,
	ManifestPlugin,
	Template,
	UsageState,
	WatchIgnorePlugin,
	WebpackError,
	WebpackOptionsApply,
	WebpackOptionsDefaulter,
	// TODO webpack 6 remove
	WebpackOptionsValidationError: ValidationError,
	ValidationError,
	cache,
	config,
	dependencies,
	ids,
	javascript,
	optimize,
	runtime,
	prefetch,
	web,
	esm,
	webworker,
	node,
	electron,
	wasm,
	css,
	library,
	// TODO remove in webpack 6 in favor of `dll` scope
	DelegatedPlugin,
	DllPlugin,
	DllReferencePlugin,
	LibManifestPlugin,
	dll,
	container,
	sharing,
	debug,
	util,
	sources,
	experiments
});

// TODO webpack 6 remove `WebpackOptionsValidationError`
export {
	ValidationError,
	ValidationError as WebpackOptionsValidationError
} from "schema-utils";
export { default as sources } from "webpack-sources";
export { default as AsyncDependenciesBlock } from "./AsyncDependenciesBlock.js";
export { default as AutomaticPrefetchPlugin } from "./AutomaticPrefetchPlugin.js";
export { default as BannerPlugin } from "./BannerPlugin.js";
export { default as Cache } from "./Cache.js";
export { default as Chunk } from "./Chunk.js";
export { default as ChunkGraph } from "./ChunkGraph.js";
export { default as CleanPlugin } from "./CleanPlugin.js";
export { default as Compilation } from "./Compilation.js";
export { default as Compiler } from "./Compiler.js";
export { default as ConcatenationScope } from "./ConcatenationScope.js";
export { default as ContextExclusionPlugin } from "./ContextExclusionPlugin.js";
export { default as ContextReplacementPlugin } from "./ContextReplacementPlugin.js";
export { default as DefinePlugin } from "./DefinePlugin.js";
export { default as Dependency } from "./Dependency.js";
export { default as DotenvPlugin } from "./DotenvPlugin.js";
export { default as DynamicEntryPlugin } from "./DynamicEntryPlugin.js";
export { default as EntryOptionPlugin } from "./EntryOptionPlugin.js";
export { default as EntryPlugin } from "./EntryPlugin.js";
export { default as EnvironmentPlugin } from "./EnvironmentPlugin.js";
export { default as EvalDevToolModulePlugin } from "./EvalDevToolModulePlugin.js";
export { default as EvalSourceMapDevToolPlugin } from "./EvalSourceMapDevToolPlugin.js";
export { UsageState } from "./ExportsInfo.js";
export { default as ExternalModule } from "./ExternalModule.js";
export { default as ExternalsPlugin } from "./ExternalsPlugin.js";
export { default as Generator } from "./Generator.js";
export { default as HotModuleReplacementPlugin } from "./HotModuleReplacementPlugin.js";
export { default as HotUpdateChunk } from "./HotUpdateChunk.js";
export { default as IgnorePlugin } from "./IgnorePlugin.js";
export { default as InitFragment } from "./InitFragment.js";
export { default as LoaderOptionsPlugin } from "./LoaderOptionsPlugin.js";
export { default as LoaderTargetPlugin } from "./LoaderTargetPlugin.js";
export { default as ManifestPlugin } from "./ManifestPlugin.js";
export { default as Module } from "./Module.js";
export { default as ModuleFactory } from "./ModuleFactory.js";
export { default as ModuleFilenameHelpers } from "./ModuleFilenameHelpers.js";
export { default as ModuleGraph } from "./ModuleGraph.js";
export { default as ModuleGraphConnection } from "./ModuleGraphConnection.js";
export { default as MultiCompiler } from "./MultiCompiler.js";
export { default as NoEmitOnErrorsPlugin } from "./NoEmitOnErrorsPlugin.js";
export { default as NormalModule } from "./NormalModule.js";
export { default as NormalModuleReplacementPlugin } from "./NormalModuleReplacementPlugin.js";
export * as OptimizationStages from "./OptimizationStages.js";
export { default as Parser } from "./Parser.js";
export { default as PlatformPlugin } from "./PlatformPlugin.js";
export { default as PrefetchPlugin } from "./PrefetchPlugin.js";
export { default as ProgressPlugin } from "./ProgressPlugin.js";
export { default as ProvidePlugin } from "./ProvidePlugin.js";
export * as RuntimeGlobals from "./RuntimeGlobals.js";
export { default as RuntimeModule } from "./RuntimeModule.js";
export { default as SourceMapDevToolPlugin } from "./SourceMapDevToolPlugin.js";
export { default as Stats } from "./Stats.js";
export { default as Template } from "./Template.js";
export { default as WatchIgnorePlugin } from "./WatchIgnorePlugin.js";
export { default as WebpackOptionsApply } from "./WebpackOptionsApply.js";
export * as cli from "./cli.js";
export { default as defineConfig } from "./config/defineConfig.js";
// TODO remove in webpack 6 in favor of `dll` scope
export { default as DelegatedPlugin } from "./dll/DelegatedPlugin.js";
export { default as DllPlugin } from "./dll/DllPlugin.js";
export { default as DllReferencePlugin } from "./dll/DllReferencePlugin.js";
export { default as LibManifestPlugin } from "./dll/LibManifestPlugin.js";
export { default as WebpackError } from "./errors/WebpackError.js";
export { default as validateSchema } from "./validateSchema.js";
export { default as webpack } from "./webpack.js";

export {
	JavascriptModulesPlugin,
	LibraryTemplatePlugin,
	SingleEntryPlugin,
	WebpackOptionsDefaulter,
	cache,
	config,
	container,
	css,
	debug,
	dependencies,
	dll,
	electron,
	esm,
	experiments,
	ids,
	javascript,
	library,
	node,
	optimize,
	prefetch,
	runtime,
	sharing,
	util,
	validate,
	version,
	wasm,
	web,
	webworker
};

export default exportsObject;

export { exportsObject as "module.exports" };
