/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var OptionsApply = require("./OptionsApply");

var FunctionModulePlugin = require("./FunctionModulePlugin");
var EvalDevToolModulePlugin = require("./EvalDevToolModulePlugin");
var SourceMapDevToolPlugin = require("./SourceMapDevToolPlugin");

var SingleEntryPlugin = require("./SingleEntryPlugin");
var MultiEntryPlugin = require("./MultiEntryPlugin");
var RecordIdsPlugin = require("./RecordIdsPlugin");

var APIPlugin = require("./APIPlugin");
var ConstPlugin = require("./ConstPlugin");
var RequireJsStuffPlugin = require("./RequireJsStuffPlugin");
var NodeStuffPlugin = require("./NodeStuffPlugin");
var CompatibilityPlugin = require("./CompatibilityPlugin");
var DefinePlugin = require("./DefinePlugin");

var CommonJsPlugin = require("./dependencies/CommonJsPlugin");
var AMDPlugin = require("./dependencies/AMDPlugin");
var LabeledModulesPlugin = require("./dependencies/LabeledModulesPlugin");
var RequireContextPlugin = require("./dependencies/RequireContextPlugin");
var RequireEnsurePlugin = require("./dependencies/RequireEnsurePlugin");
var RequireIncludePlugin = require("./dependencies/RequireIncludePlugin");

var RemoveParentModulesPlugin = require("./optimize/RemoveParentModulesPlugin");
var RemoveEmptyChunksPlugin = require("./optimize/RemoveEmptyChunksPlugin");
var MergeDuplicateChunksPlugin = require("./optimize/MergeDuplicateChunksPlugin");
var FlagIncludedChunksPlugin = require("./optimize/FlagIncludedChunksPlugin");

var UnsafeCachePlugin = require("enhanced-resolve/lib/UnsafeCachePlugin");
var ModulesInDirectoriesPlugin = require("enhanced-resolve/lib/ModulesInDirectoriesPlugin");
var ModulesInRootPlugin = require("enhanced-resolve/lib/ModulesInRootPlugin");
var ModuleTemplatesPlugin = require("enhanced-resolve/lib/ModuleTemplatesPlugin");
var ModuleAsFilePlugin = require("enhanced-resolve/lib/ModuleAsFilePlugin");
var ModuleAsDirectoryPlugin = require("enhanced-resolve/lib/ModuleAsDirectoryPlugin");
var ModuleAliasPlugin = require("enhanced-resolve/lib/ModuleAliasPlugin");
var DirectoryDefaultFilePlugin = require("enhanced-resolve/lib/DirectoryDefaultFilePlugin");
var DirectoryDescriptionFilePlugin = require("enhanced-resolve/lib/DirectoryDescriptionFilePlugin");
var FileAppendPlugin = require("enhanced-resolve/lib/FileAppendPlugin");
var DirectoryResultPlugin = require("enhanced-resolve/lib/DirectoryResultPlugin");


function WebpackOptionsApply() {
	OptionsApply.call(this);
}
module.exports = WebpackOptionsApply;

WebpackOptionsApply.prototype = Object.create(OptionsApply.prototype);
WebpackOptionsApply.prototype.process = function(options, compiler) {
	if(options.plugins && Array.isArray(options.plugins)) {
		compiler.apply.apply(compiler, options.plugins);
	}
	compiler.outputPath = options.output.path;
	compiler.recordsInputPath = options.recordsInputPath || options.recordsPath;
	compiler.recordsOutputPath = options.recordsOutputPath || options.recordsPath;
	switch(options.target) {
	case "web":
		var JsonpTemplatePlugin = require("./JsonpTemplatePlugin");
		var NodeSourcePlugin = require("./node/NodeSourcePlugin");
		compiler.apply(
			new JsonpTemplatePlugin(options.output),
			new FunctionModulePlugin(options.context, options.output),
			new NodeSourcePlugin(options.node)
		);
		break;
	case "webworker":
		var WebWorkerTemplatePlugin = require("./webworker/WebWorkerTemplatePlugin");
		var NodeSourcePlugin = require("./node/NodeSourcePlugin");
		compiler.apply(
			new WebWorkerTemplatePlugin(options.output),
			new FunctionModulePlugin(options.context, options.output),
			new NodeSourcePlugin(options.node)
		);
		break;
	case "node":
		var NodeTemplatePlugin = require("./node/NodeTemplatePlugin");
		var NodeTargetPlugin = require("./node/NodeTargetPlugin");
		compiler.apply(
			new NodeTemplatePlugin(options.output),
			new FunctionModulePlugin(options.context, options.output),
			new NodeTargetPlugin()
		);
		break;
	}
	if(options.output.library || options.output.libraryTarget != "var") {
		var LibraryTemplatePlugin = require("./LibraryTemplatePlugin");
		compiler.apply(new LibraryTemplatePlugin(options.output.library, options.output.libraryTarget));
	}

	if(options.hot) {
		var HotModuleReplacementPlugin = require("./HotModuleReplacementPlugin");
		compiler.apply(new HotModuleReplacementPlugin(options.output));
	} else {
		var NoHotModuleReplacementPlugin = require("./NoHotModuleReplacementPlugin");
		compiler.apply(new NoHotModuleReplacementPlugin());
	}

	if(options.devtool == "eval")
		compiler.apply(new EvalDevToolModulePlugin());
	else if(options.devtool == "@eval")
		compiler.apply(new EvalDevToolModulePlugin("//@ sourceURL=[url]"));
	else if(options.devtool == "#eval")
		compiler.apply(new EvalDevToolModulePlugin("//# sourceURL=[url]"));
	else if(options.devtool == "#@eval")
		compiler.apply(new EvalDevToolModulePlugin("//@ sourceURL=[url]\n//# sourceURL=[url]"));
	else if(options.devtool == "sourcemap" || options.devtool == "source-map")
		compiler.apply(new SourceMapDevToolPlugin(options.context, options.output.sourceMapFilename));
	else if(options.devtool == "@sourcemap" || options.devtool == "@source-map")
		compiler.apply(new SourceMapDevToolPlugin(options.context, options.output.sourceMapFilename, "\n/*\n//@ sourceMappingURL=[url]\n*/"));
	else if(options.devtool == "#sourcemap" || options.devtool == "#source-map")
		compiler.apply(new SourceMapDevToolPlugin(options.context, options.output.sourceMapFilename, "\n//# sourceMappingURL=[url]"));
	else if(options.devtool == "#@sourcemap" || options.devtool == "#@source-map")
		compiler.apply(new SourceMapDevToolPlugin(options.context, options.output.sourceMapFilename, "\n/*\n//@ sourceMappingURL=[url]\n//# sourceMappingURL=[url]\n*/"));
	else if(options.devtool == "inlinesourcemap" ||
			options.devtool == "inline-sourcemap" ||
			options.devtool == "inline-source-map")
		compiler.apply(new SourceMapDevToolPlugin(options.context));
	else if(options.devtool == "@inlinesourcemap" ||
			options.devtool == "@inline-sourcemap" ||
			options.devtool == "@inline-source-map")
		compiler.apply(new SourceMapDevToolPlugin(options.context, null, "\n/*\n//@ sourceMappingURL=[url]\n*/"));
	else if(options.devtool == "#inlinesourcemap" ||
			options.devtool == "#inline-sourcemap" ||
			options.devtool == "#inline-source-map")
		compiler.apply(new SourceMapDevToolPlugin(options.context, null, "\n//# sourceMappingURL=[url]"));
	else if(options.devtool == "#@inlinesourcemap" ||
			options.devtool == "#@inline-sourcemap" ||
			options.devtool == "#@inline-source-map")
		compiler.apply(new SourceMapDevToolPlugin(options.context, null, "\n/*\n//@ sourceMappingURL=[url]\n//# sourceMappingURL=[url]\n*/"));

	function itemToPlugin(item, name) {
		if(Array.isArray(item))
			return new MultiEntryPlugin(options.context, item, name);
		else
			return new SingleEntryPlugin(options.context, item, name)
	}
	if(typeof options.entry == "string" || Array.isArray(options.entry)) {
		compiler.apply(itemToPlugin(options.entry, "main"));
	} else if(typeof options.entry == "object") {
		Object.keys(options.entry).forEach(function(name) {
			compiler.apply(itemToPlugin(options.entry[name], name));
		});
	}

	if(options.prefetch) {
		var PrefetchPlugin = require("./PrefetchPlugin");
		options.prefetch.map(function(request) {
			compiler.apply(new PrefetchPlugin(options.context, request));
		});
	}
	compiler.apply(
		new CompatibilityPlugin(),
		new NodeStuffPlugin(options.node),
		new RequireJsStuffPlugin(),
		new APIPlugin(),
		new ConstPlugin(),
		new RequireIncludePlugin(),
		new RequireEnsurePlugin(),
		new RequireContextPlugin(options.resolve.modulesDirectories, options.resolve.extensions),
		new AMDPlugin(options.amd || {}),
		new CommonJsPlugin(),
		new LabeledModulesPlugin()
	);

	compiler.apply(
		new RemoveParentModulesPlugin(),
		new RemoveEmptyChunksPlugin(),
		new MergeDuplicateChunksPlugin(),
		new FlagIncludedChunksPlugin()
	);

	compiler.apply(new RecordIdsPlugin());

	if(options.optimize && options.optimize.occurenceOrder) {
		var OccurenceOrderPlugin = require("./optimize/OccurenceOrderPlugin");
		compiler.apply(new OccurenceOrderPlugin(options.optimize.occurenceOrderPreferEntry));
	}

	if(options.optimize && options.optimize.minChunkSize) {
		var MinChunkSizePlugin = require("./optimize/MinChunkSizePlugin");
		compiler.apply(new MinChunkSizePlugin(options.optimize));
	}

	if(options.optimize && options.optimize.maxChunks) {
		var LimitChunkCountPlugin = require("./optimize/LimitChunkCountPlugin");
		compiler.apply(new LimitChunkCountPlugin(options.optimize));
	}

	if(options.optimize.minimize) {
		var UglifyJsPlugin = require("./optimize/UglifyJsPlugin");
		if(options.optimize.minimize === true)
			compiler.apply(new UglifyJsPlugin());
		else
			compiler.apply(new UglifyJsPlugin(options.optimize.minimize));
	}

	if(options.optimize.dedupe === true) {
		var DedupePlugin = require("./optimize/DedupePlugin");
		compiler.apply(new DedupePlugin());
	}

	if(options.cache === undefined ? options.watch : options.cache) {
		var CachePlugin = require("./CachePlugin");
		compiler.apply(new CachePlugin(typeof options.cache == "object" ? options.cache : null));
	}

	if(typeof options.provide === "object") {
		var ProvidePlugin = require("./ProvidePlugin");
		for(var name in options.provide) {
			compiler.apply(new ProvidePlugin(name, options.provide[name]));
		}
	}

	if(options.define !== false) {
		var defineObject = {};
		if(typeof options.define === "object") {
			Object.keys(options.define).forEach(function(key) {
				defineObject[key] = options.define[key];
			});
		}
		if(defineObject.DEBUG === undefined)
			defineObject.DEBUG = !!options.debug;
		compiler.apply(new DefinePlugin(defineObject));
	}

	compiler.applyPlugins("after-plugins", compiler);
	compiler.resolvers.normal.apply(
		new UnsafeCachePlugin(options.resolve.unsafeCache),
		new ModuleAliasPlugin(options.resolve.alias),
		makeRootPlugin("module", options.resolve.root),
		new ModulesInDirectoriesPlugin("module", options.resolve.modulesDirectories),
		makeRootPlugin("module", options.resolve.fallback),
		new ModuleAsFilePlugin("module"),
		new ModuleAsDirectoryPlugin("module"),
		new DirectoryDescriptionFilePlugin("package.json", ["webpack", "browserify", "web", ["jam", "main"], "main"]),
		new DirectoryDefaultFilePlugin(["index"]),
		new FileAppendPlugin(options.resolve.extensions)
	);
	compiler.resolvers.context.apply(
		new UnsafeCachePlugin(options.resolve.unsafeCache),
		new ModuleAliasPlugin(options.resolve.alias),
		makeRootPlugin("module", options.resolve.root),
		new ModulesInDirectoriesPlugin("module", options.resolve.modulesDirectories),
		makeRootPlugin("module", options.resolve.fallback),
		new ModuleAsFilePlugin("module"),
		new ModuleAsDirectoryPlugin("module"),
		new DirectoryResultPlugin()
	);
	compiler.resolvers.loader.apply(
		new UnsafeCachePlugin(options.resolve.unsafeCache),
		new ModuleAliasPlugin(options.resolveLoader.alias),
		makeRootPlugin("loader-module", options.resolveLoader.root),
		new ModulesInDirectoriesPlugin("loader-module", options.resolveLoader.modulesDirectories),
		makeRootPlugin("loader-module", options.resolveLoader.fallback),
		new ModuleTemplatesPlugin("loader-module", options.resolveLoader.moduleTemplates, "module"),
		new ModuleAsFilePlugin("module"),
		new ModuleAsDirectoryPlugin("module"),
		new DirectoryDescriptionFilePlugin("package.json", ["webpackLoader", "webLoader", "loader", "main"]),
		new DirectoryDefaultFilePlugin(["index"]),
		new FileAppendPlugin(options.resolveLoader.extensions)
	);
	compiler.applyPlugins("after-resolvers", compiler);
	return options;
}

function makeRootPlugin(name, root) {
	if(typeof root === "string")
		return new ModulesInRootPlugin(name, root);
	else if(Array.isArray(root)) {
		return function() {
			root.forEach(function(root) {
				this.apply(new ModulesInRootPlugin(name, root));
			}, this);
		}
	}
	return function() {};
}
