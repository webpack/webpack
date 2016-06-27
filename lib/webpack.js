/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Compiler = require("./Compiler");
var MultiCompiler = require("./MultiCompiler");
var NodeEnvironmentPlugin = require("./node/NodeEnvironmentPlugin");
var WebpackOptionsApply = require("./WebpackOptionsApply");
var WebpackOptionsDefaulter = require("./WebpackOptionsDefaulter");

function webpack(options, callback) {
	var compiler;
	if(Array.isArray(options)) {
		compiler = new MultiCompiler(options.map(function(options) {
			return webpack(options);
		}));
	} else if(typeof options === "object") {
		if(!options.entry && !options.plugins) {
			throw new Error("Passed 'options' object does not look like a valid webpack configuration");
		}
		new WebpackOptionsDefaulter().process(options);

		compiler = new Compiler();
		compiler.options = options;
		compiler.options = new WebpackOptionsApply().process(options, compiler);
		new NodeEnvironmentPlugin().apply(compiler);
		compiler.applyPlugins("environment");
		compiler.applyPlugins("after-environment");
	} else {
		throw new Error("Invalid argument: options");
	}
	if(callback) {
		if(typeof callback !== "function") throw new Error("Invalid argument: callback");
		if(options.watch === true || (Array.isArray(options) &&
				options.some(function(o) {
					return o.watch;
				}))) {
			var watchOptions = (!Array.isArray(options) ? options : options[0]).watchOptions || {};
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

function exportPlugins(exports, path, plugins) {
	plugins.forEach(function(name) {
		Object.defineProperty(exports, name, {
			configurable: false,
			enumerable: true,
			get: function() {
				return require(path + "/" + name);
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
	"NewWatchingPlugin",
	"EnvironmentPlugin",
	"DllPlugin",
	"DllReferencePlugin",
	"LoaderOptionsPlugin",
	"NamedModulesPlugin",
	"HashedModuleIdsPlugin"
]);
exportPlugins(exports.optimize = {}, "./optimize", [
	"AggressiveMergingPlugin",
	"CommonsChunkPlugin",
	"DedupePlugin",
	"LimitChunkCountPlugin",
	"MinChunkSizePlugin",
	"OccurrenceOrderPlugin",
	"UglifyJsPlugin"
]);
exportPlugins(exports.dependencies = {}, "./dependencies", [
	"LabeledModulesPlugin"
]);
