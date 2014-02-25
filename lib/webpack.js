/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Compiler = require("./Compiler");
var NodeEnvironmentPlugin = require("./node/NodeEnvironmentPlugin");
var WebpackOptionsApply = require("./WebpackOptionsApply");
var WebpackOptionsDefaulter = require("./WebpackOptionsDefaulter");

function webpack(options, callback) {
	new WebpackOptionsDefaulter().process(options);

	var compiler = new Compiler();
	compiler.options = options;
	compiler.options = new WebpackOptionsApply().process(options, compiler);
	new NodeEnvironmentPlugin().apply(compiler);
	if(callback) {
		if(options.watch) {
			return compiler.watch(options.watchDelay, callback);
		} else {
			compiler.run(callback);
		}
	}
	return compiler;
}
exports = module.exports = webpack;

webpack.WebpackOptionsDefaulter = WebpackOptionsDefaulter;
webpack.WebpackOptionsApply = WebpackOptionsApply;
webpack.Compiler = Compiler;
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
	"BannerPlugin",
	"PrefetchPlugin",
	"ProvidePlugin",
	"HotModuleReplacementPlugin",
	"ResolverPlugin",
]);
exportPlugins(exports.optimize = {}, "./optimize", [
	"AggressiveMergingPlugin",
	"CommonsChunkPlugin",
	"DedupePlugin",
	"LimitChunkCountPlugin",
	"MinChunkSizePlugin",
	"OccurenceOrderPlugin",
	"OccurrenceOrderPlugin",
	"UglifyJsPlugin"
]);
exportPlugins(exports.dependencies = {}, "./dependencies", [
	"LabeledModulesPlugin"
]);
