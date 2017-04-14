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
const webpackOptionsSchema = require("../schemas/webpackOptionsSchema.json");

function webpack(options, callback) {
	const webpackOptionsValidationErrors = validateSchema(webpackOptionsSchema, options);
	if(webpackOptionsValidationErrors.length) {
		throw new WebpackOptionsValidationError(webpackOptionsValidationErrors);
	}
	let compiler;
	if(Array.isArray(options)) {
		compiler = new MultiCompiler(options.map(options => webpack(options)));
	} else if(typeof options === "object") {
		new WebpackOptionsDefaulter().process(options);

		compiler = new Compiler();
		compiler.context = options.context;
		compiler.options = options;
		new NodeEnvironmentPlugin().apply(compiler);
		if(options.plugins && Array.isArray(options.plugins)) {
			compiler.apply.apply(compiler, options.plugins);
		}
		compiler.applyPlugins("environment");
		compiler.applyPlugins("after-environment");
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
}
exports = module.exports = webpack;

webpack.WebpackOptionsDefaulter = WebpackOptionsDefaulter;
webpack.WebpackOptionsApply = WebpackOptionsApply;
webpack.Compiler = Compiler;
webpack.MultiCompiler = MultiCompiler;
webpack.NodeEnvironmentPlugin = NodeEnvironmentPlugin;
webpack.validate = validateSchema.bind(this, webpackOptionsSchema);
webpack.validateSchema = validateSchema;
webpack.WebpackOptionsValidationError = WebpackOptionsValidationError;

function exportPlugins(exports, path, plugins) {
	plugins.forEach(name => {
		Object.defineProperty(exports, name, {
			configurable: false,
			enumerable: true,
			get() {
				return require(`${path}/${name}`);
			}
		});
	});
}

exportPlugins(exports, ".", [
	"DefinePlugin",
	"NormalModuleReplacementPlugin",
	"ContextReplacementPlugin",
	"IgnorePlugin",
	"WatchIgnorePlugin",
	"BannerPlugin",
	"PrefetchPlugin",
	"AutomaticPrefetchPlugin",
	"ProvidePlugin",
	"HotModuleReplacementPlugin",
	"SourceMapDevToolPlugin",
	"EvalSourceMapDevToolPlugin",
	"EvalDevToolModulePlugin",
	"CachePlugin",
	"ExtendedAPIPlugin",
	"ExternalsPlugin",
	"JsonpTemplatePlugin",
	"LibraryTemplatePlugin",
	"LoaderTargetPlugin",
	"MemoryOutputFileSystem",
	"ProgressPlugin",
	"SetVarMainTemplatePlugin",
	"UmdMainTemplatePlugin",
	"NoErrorsPlugin",
	"NoEmitOnErrorsPlugin",
	"NewWatchingPlugin",
	"EnvironmentPlugin",
	"DllPlugin",
	"DllReferencePlugin",
	"LoaderOptionsPlugin",
	"NamedModulesPlugin",
	"NamedChunksPlugin",
	"HashedModuleIdsPlugin",
	"ModuleFilenameHelpers"
]);
exportPlugins(exports.optimize = {}, "./optimize", [
	"AggressiveMergingPlugin",
	"AggressiveSplittingPlugin",
	"CommonsChunkPlugin",
	"ChunkModuleIdRangePlugin",
	"DedupePlugin",
	"LimitChunkCountPlugin",
	"MinChunkSizePlugin",
	"OccurrenceOrderPlugin",
	"UglifyJsPlugin"
]);
exportPlugins(exports.dependencies = {}, "./dependencies", []);
