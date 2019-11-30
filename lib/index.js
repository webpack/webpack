/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const validate = require("schema-utils");
const util = require("util");
const { version } = require("../package.json");
const webpackOptionsSchema = require("../schemas/WebpackOptions.json");
const Compiler = require("./Compiler");
const MultiCompiler = require("./MultiCompiler");
const WebpackOptionsApply = require("./WebpackOptionsApply");
const WebpackOptionsDefaulter = require("./WebpackOptionsDefaulter");
const validateSchema = require("./validateSchema");
const webpack = require("./webpack");

module.exports = webpack;
module.exports.WebpackOptionsApply = WebpackOptionsApply;
module.exports.WebpackOptionsDefaulter = WebpackOptionsDefaulter;
module.exports.WebpackOptionsValidationError = validate.ValidationError;
module.exports.Compiler = Compiler;
module.exports.MultiCompiler = MultiCompiler;
module.exports.validate = validateSchema.bind(null, webpackOptionsSchema);
module.exports.validateSchema = validateSchema;
module.exports.version = version;

const exportPlugins = (obj, mappings) => {
	for (const name of Object.keys(mappings)) {
		Object.defineProperty(obj, name, {
			configurable: false,
			enumerable: true,
			get: mappings[name]
		});
	}
};

exportPlugins(module.exports, {
	AutomaticPrefetchPlugin: () => require("./AutomaticPrefetchPlugin"),
	BannerPlugin: () => require("./BannerPlugin"),
	Cache: () => require("./Cache"),
	Compilation: () => require("./Compilation"),
	ContextExclusionPlugin: () => require("./ContextExclusionPlugin"),
	ContextReplacementPlugin: () => require("./ContextReplacementPlugin"),
	DefinePlugin: () => require("./DefinePlugin"),
	DelegatedPlugin: () => require("./DelegatedPlugin"),
	Dependency: () => require("./Dependency"),
	DllPlugin: () => require("./DllPlugin"),
	DllReferencePlugin: () => require("./DllReferencePlugin"),
	EntryPlugin: () => require("./EntryPlugin"),
	EnvironmentPlugin: () => require("./EnvironmentPlugin"),
	EvalDevToolModulePlugin: () => require("./EvalDevToolModulePlugin"),
	EvalSourceMapDevToolPlugin: () => require("./EvalSourceMapDevToolPlugin"),
	ExternalsPlugin: () => require("./ExternalsPlugin"),
	Generator: () => require("./Generator"),
	HotModuleReplacementPlugin: () => require("./HotModuleReplacementPlugin"),
	IgnorePlugin: () => require("./IgnorePlugin"),
	JavascriptModulesPlugin: util.deprecate(
		() => require("./javascript/JavascriptModulesPlugin"),
		"webpack.JavascriptModulesPlugin has moved to webpack.javascript.JavascriptModulesPlugin",
		"DEP_WEBPACK_JAVASCRIPT_MODULES_PLUGIN"
	),
	LibManifestPlugin: () => require("./LibManifestPlugin"),
	LibraryTemplatePlugin: () => require("./LibraryTemplatePlugin"),
	LoaderOptionsPlugin: () => require("./LoaderOptionsPlugin"),
	LoaderTargetPlugin: () => require("./LoaderTargetPlugin"),
	Module: () => require("./Module"),
	ModuleFilenameHelpers: () => require("./ModuleFilenameHelpers"),
	NoEmitOnErrorsPlugin: () => require("./NoEmitOnErrorsPlugin"),
	NormalModule: () => require("./NormalModule"),
	NormalModuleReplacementPlugin: () =>
		require("./NormalModuleReplacementPlugin"),
	Parser: () => require("./Parser"),
	PrefetchPlugin: () => require("./PrefetchPlugin"),
	ProgressPlugin: () => require("./ProgressPlugin"),
	ProvidePlugin: () => require("./ProvidePlugin"),
	RuntimeGlobals: () => require("./RuntimeGlobals"),
	RuntimeModule: () => require("./RuntimeModule"),
	SingleEntryPlugin: util.deprecate(
		() => require("./EntryPlugin"),
		"SingleEntryPlugin was renamed to EntryPlugin",
		"DEP_WEBPACK_SINGLE_ENTRY_PLUGIN"
	),
	SetVarTemplatePlugin: () => require("./SetVarTemplatePlugin"),
	SourceMapDevToolPlugin: () => require("./SourceMapDevToolPlugin"),
	Stats: () => require("./Stats"),
	Template: () => require("./Template"),
	UmdTemplatePlugin: () => require("./UmdTemplatePlugin"),
	WatchIgnorePlugin: () => require("./WatchIgnorePlugin")
});

exportPlugins((module.exports.cache = {}), {
	MemoryCachePlugin: () => require("./cache/MemoryCachePlugin")
});

exportPlugins((module.exports.ids = {}), {
	ChunkModuleIdRangePlugin: () => require("./ids/ChunkModuleIdRangePlugin"),
	NaturalModuleIdsPlugin: () => require("./ids/NaturalModuleIdsPlugin"),
	OccurrenceModuleIdsPlugin: () => require("./ids/OccurrenceModuleIdsPlugin"),
	NamedModuleIdsPlugin: () => require("./ids/NamedModuleIdsPlugin"),
	DeterministicModuleIdsPlugin: () =>
		require("./ids/DeterministicModuleIdsPlugin"),
	NamedChunkIdsPlugin: () => require("./ids/NamedChunkIdsPlugin"),
	OccurrenceChunkIdsPlugin: () => require("./ids/OccurrenceChunkIdsPlugin"),
	HashedModuleIdsPlugin: () => require("./ids/HashedModuleIdsPlugin")
});

exportPlugins((module.exports.javascript = {}), {
	JavascriptModulesPlugin: () => require("./javascript/JavascriptModulesPlugin")
});

exportPlugins((module.exports.optimize = {}), {
	AggressiveMergingPlugin: () => require("./optimize/AggressiveMergingPlugin"),
	AggressiveSplittingPlugin: util.deprecate(
		() => require("./optimize/AggressiveSplittingPlugin"),
		"AggressiveSplittingPlugin is deprecated in favor of SplitChunksPlugin",
		"DEP_WEBPACK_AGGRESSIVE_SPLITTING_PLUGIN"
	),
	LimitChunkCountPlugin: () => require("./optimize/LimitChunkCountPlugin"),
	MinChunkSizePlugin: () => require("./optimize/MinChunkSizePlugin"),
	ModuleConcatenationPlugin: () =>
		require("./optimize/ModuleConcatenationPlugin"),
	RuntimeChunkPlugin: () => require("./optimize/RuntimeChunkPlugin"),
	SideEffectsFlagPlugin: () => require("./optimize/SideEffectsFlagPlugin"),
	SplitChunksPlugin: () => require("./optimize/SplitChunksPlugin")
});

exportPlugins((module.exports.web = {}), {
	FetchCompileWasmPlugin: () => require("./web/FetchCompileWasmPlugin"),
	JsonpTemplatePlugin: () => require("./web/JsonpTemplatePlugin")
});

exportPlugins((module.exports.webworker = {}), {
	WebWorkerTemplatePlugin: () => require("./webworker/WebWorkerTemplatePlugin")
});

exportPlugins((module.exports.node = {}), {
	NodeEnvironmentPlugin: () => require("./node/NodeEnvironmentPlugin"),
	NodeTemplatePlugin: () => require("./node/NodeTemplatePlugin"),
	ReadFileCompileWasmPlugin: () => require("./node/ReadFileCompileWasmPlugin")
});

exportPlugins((module.exports.wasm = {}), {
	AsyncWebAssemblyModulesPlugin: () =>
		require("./wasm-async/AsyncWebAssemblyModulesPlugin")
});

exportPlugins((module.exports.debug = {}), {
	ProfilingPlugin: () => require("./debug/ProfilingPlugin")
});

exportPlugins((module.exports.util = {}), {
	createHash: () => require("./util/createHash"),
	comparators: () => require("./util/comparators"),
	serialization: () => require("./util/serialization")
});
