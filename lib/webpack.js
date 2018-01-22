/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Compiler = require("./Compiler");
const MultiCompiler = require("./MultiCompiler");
const NodeEnvironmentPlugin = require("./node/NodeEnvironmentPlugin");
const WebpackOptionsApply = require("./WebpackOptionsApply");
const WebpackOptionsDefaulter = require("./WebpackOptionsDefaulter");
const validateSchema = require("./validateSchema");
const WebpackOptionsValidationError = require("./WebpackOptionsValidationError");
const webpackOptionsSchema = require("../schemas/WebpackOptions.json");

const webpack = (options, callback) => {
	const webpackOptionsValidationErrors = validateSchema(webpackOptionsSchema, options);
	if(webpackOptionsValidationErrors.length) {
		throw new WebpackOptionsValidationError(webpackOptionsValidationErrors);
	}
	let compiler;
	if(Array.isArray(options)) {
		compiler = new MultiCompiler(options.map(options => webpack(options)));
	} else if(typeof options === "object") {
		options = new WebpackOptionsDefaulter().process(options);

		compiler = new Compiler(options.context);
		compiler.options = options;
		new NodeEnvironmentPlugin().apply(compiler);
		if(options.plugins && Array.isArray(options.plugins)) {
			for(const plugin of options.plugins) {
				plugin.apply(compiler);
			}
		}
		compiler.hooks.environment.call();
		compiler.hooks.afterEnvironment.call();
		compiler.options = new WebpackOptionsApply().process(options, compiler);
	} else {
		throw new Error("Invalid argument: options");
	}
	if(callback) {
		if(typeof callback !== "function") throw new Error("Invalid argument: callback");
		if(options.watch === true || (Array.isArray(options) && options.some(o => o.watch))) {
			const watchOptions = Array.isArray(options) ? options.map(o => o.watchOptions || {}) : (options.watchOptions || {});
			return compiler.watch(watchOptions, callback);
		}
		compiler.run(callback);
	}
	return compiler;
};

exports = module.exports = webpack;

webpack.WebpackOptionsDefaulter = WebpackOptionsDefaulter;
webpack.WebpackOptionsApply = WebpackOptionsApply;
webpack.Compiler = Compiler;
webpack.MultiCompiler = MultiCompiler;
webpack.NodeEnvironmentPlugin = NodeEnvironmentPlugin;
webpack.validate = validateSchema.bind(this, webpackOptionsSchema);
webpack.validateSchema = validateSchema;
webpack.WebpackOptionsValidationError = WebpackOptionsValidationError;

const exportPlugins = (obj, mappings) => {
	for(const name of Object.keys(mappings)) {
		Object.defineProperty(obj, name, {
			configurable: false,
			enumerable: true,
			get: mappings[name]
		});
	}
};

exportPlugins(exports, {
	"Stats": () => require("./Stats"),
	"DefinePlugin": () => require("./DefinePlugin"),
	"NormalModuleReplacementPlugin": () => require("./NormalModuleReplacementPlugin"),
	"ContextReplacementPlugin": () => require("./ContextReplacementPlugin"),
	"ContextExclusionPlugin": () => require("./ContextExclusionPlugin"),
	"IgnorePlugin": () => require("./IgnorePlugin"),
	"WatchIgnorePlugin": () => require("./WatchIgnorePlugin"),
	"BannerPlugin": () => require("./BannerPlugin"),
	"PrefetchPlugin": () => require("./PrefetchPlugin"),
	"AutomaticPrefetchPlugin": () => require("./AutomaticPrefetchPlugin"),
	"ProvidePlugin": () => require("./ProvidePlugin"),
	"HotModuleReplacementPlugin": () => require("./HotModuleReplacementPlugin"),
	"SourceMapDevToolPlugin": () => require("./SourceMapDevToolPlugin"),
	"EvalSourceMapDevToolPlugin": () => require("./EvalSourceMapDevToolPlugin"),
	"EvalDevToolModulePlugin": () => require("./EvalDevToolModulePlugin"),
	"CachePlugin": () => require("./CachePlugin"),
	"ExtendedAPIPlugin": () => require("./ExtendedAPIPlugin"),
	"ExternalsPlugin": () => require("./ExternalsPlugin"),
	"LibraryTemplatePlugin": () => require("./LibraryTemplatePlugin"),
	"LoaderTargetPlugin": () => require("./LoaderTargetPlugin"),
	"MemoryOutputFileSystem": () => require("./MemoryOutputFileSystem"),
	"ProgressPlugin": () => require("./ProgressPlugin"),
	"SetVarMainTemplatePlugin": () => require("./SetVarMainTemplatePlugin"),
	"UmdMainTemplatePlugin": () => require("./UmdMainTemplatePlugin"),
	"NoEmitOnErrorsPlugin": () => require("./NoEmitOnErrorsPlugin"),
	"EnvironmentPlugin": () => require("./EnvironmentPlugin"),
	"DllPlugin": () => require("./DllPlugin"),
	"DllReferencePlugin": () => require("./DllReferencePlugin"),
	"LoaderOptionsPlugin": () => require("./LoaderOptionsPlugin"),
	"NamedModulesPlugin": () => require("./NamedModulesPlugin"),
	"NamedChunksPlugin": () => require("./NamedChunksPlugin"),
	"HashedModuleIdsPlugin": () => require("./HashedModuleIdsPlugin"),
	"ModuleFilenameHelpers": () => require("./ModuleFilenameHelpers")
});
exportPlugins(exports.optimize = {}, {
	"AggressiveMergingPlugin": () => require("./optimize/AggressiveMergingPlugin"),
	"AggressiveSplittingPlugin": () => require("./optimize/AggressiveSplittingPlugin"),
	"SplitChunksPlugin": () => require("./optimize/SplitChunksPlugin"),
	"RuntimeChunkPlugin": () => require("./optimize/RuntimeChunkPlugin"),
	"ChunkModuleIdRangePlugin": () => require("./optimize/ChunkModuleIdRangePlugin"),
	"LimitChunkCountPlugin": () => require("./optimize/LimitChunkCountPlugin"),
	"MinChunkSizePlugin": () => require("./optimize/MinChunkSizePlugin"),
	"ModuleConcatenationPlugin": () => require("./optimize/ModuleConcatenationPlugin"),
	"SideEffectsFlagPlugin": () => require("./optimize/SideEffectsFlagPlugin"),
	"OccurrenceOrderPlugin": () => require("./optimize/OccurrenceOrderPlugin")
});
exportPlugins(exports.web = {}, {
	"JsonpTemplatePlugin": () => require("./web/JsonpTemplatePlugin"),
	"FetchCompileWasmTemplatePlugin": () => require("./web/FetchCompileWasmTemplatePlugin"),
});
exportPlugins(exports.node = {}, {
	"NodeTemplatePlugin": () => require("./node/NodeTemplatePlugin"),
	"ReadFileCompileWasmTemplatePlugin": () => require("./node/ReadFileCompileWasmTemplatePlugin"),
});

exportPlugins(exports.debug = {}, {
	"ProfilingPlugin": () => require("./debug/ProfilingPlugin")
});
