/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var OptionsApply = require("./OptionsApply");

var LoaderTargetPlugin = require("./LoaderTargetPlugin");
var FunctionModulePlugin = require("./FunctionModulePlugin");
var EvalDevToolModulePlugin = require("./EvalDevToolModulePlugin");
var SourceMapDevToolPlugin = require("./SourceMapDevToolPlugin");
var EvalSourceMapDevToolPlugin = require("./EvalSourceMapDevToolPlugin");

var EntryOptionPlugin = require("./EntryOptionPlugin");
var RecordIdsPlugin = require("./RecordIdsPlugin");

var APIPlugin = require("./APIPlugin");
var ConstPlugin = require("./ConstPlugin");
var RequireJsStuffPlugin = require("./RequireJsStuffPlugin");
var NodeStuffPlugin = require("./NodeStuffPlugin");
var CompatibilityPlugin = require("./CompatibilityPlugin");
var DefinePlugin = require("./DefinePlugin");

var MovedToPluginWarningPlugin = require("./MovedToPluginWarningPlugin");
var TemplatedPathPlugin = require("./TemplatedPathPlugin");
var WarnCaseSensitiveModulesPlugin = require("./WarnCaseSensitiveModulesPlugin");

var LoaderPlugin = require("./dependencies/LoaderPlugin");
var CommonJsPlugin = require("./dependencies/CommonJsPlugin");
var AMDPlugin = require("./dependencies/AMDPlugin");
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
var DirectoryDescriptionFileFieldAliasPlugin = require("enhanced-resolve/lib/DirectoryDescriptionFileFieldAliasPlugin");
var FileAppendPlugin = require("enhanced-resolve/lib/FileAppendPlugin");
var DirectoryResultPlugin = require("enhanced-resolve/lib/DirectoryResultPlugin");
var ResultSymlinkPlugin = require("enhanced-resolve/lib/ResultSymlinkPlugin");

function WebpackOptionsApply() {
	OptionsApply.call(this);
}
module.exports = WebpackOptionsApply;

WebpackOptionsApply.prototype = Object.create(OptionsApply.prototype);
WebpackOptionsApply.prototype.process = function(options, compiler) {
	compiler.context = options.context;
	if(options.plugins && Array.isArray(options.plugins)) {
		compiler.apply.apply(compiler, options.plugins);
	}
	compiler.outputPath = options.output.path;
	compiler.recordsInputPath = options.recordsInputPath || options.recordsPath;
	compiler.recordsOutputPath = options.recordsOutputPath || options.recordsPath;
	compiler.name = options.name;
	if(typeof options.target === "string") {
		switch(options.target) {
			case "web":
				var JsonpTemplatePlugin = require("./JsonpTemplatePlugin");
				var NodeSourcePlugin = require("./node/NodeSourcePlugin");
				compiler.apply(
					new JsonpTemplatePlugin(options.output),
					new FunctionModulePlugin(options.output),
					new NodeSourcePlugin(options.node),
					new LoaderTargetPlugin("web")
				);
				break;
			case "webworker":
				var WebWorkerTemplatePlugin = require("./webworker/WebWorkerTemplatePlugin");
				var NodeSourcePlugin = require("./node/NodeSourcePlugin");
				compiler.apply(
					new WebWorkerTemplatePlugin(options.output),
					new FunctionModulePlugin(options.output),
					new NodeSourcePlugin(options.node),
					new LoaderTargetPlugin("webworker")
				);
				break;
			case "node":
			case "async-node":
				var NodeTemplatePlugin = require("./node/NodeTemplatePlugin");
				var NodeTargetPlugin = require("./node/NodeTargetPlugin");
				compiler.apply(
					new NodeTemplatePlugin(options.output, options.target === "async-node"),
					new FunctionModulePlugin(options.output),
					new NodeTargetPlugin(),
					new LoaderTargetPlugin("node")
				);
				break;
			case "node-webkit":
				var JsonpTemplatePlugin = require("./JsonpTemplatePlugin");
				var NodeTargetPlugin = require("./node/NodeTargetPlugin");
				var ExternalsPlugin = require("./ExternalsPlugin");
				compiler.apply(
					new JsonpTemplatePlugin(options.output),
					new FunctionModulePlugin(options.output),
					new NodeTargetPlugin(),
					new ExternalsPlugin("commonjs", "nw.gui"),
					new LoaderTargetPlugin("node-webkit")
				);
				break;
			case "atom":
			case "electron":
				var NodeTemplatePlugin = require("./node/NodeTemplatePlugin");
				var NodeTargetPlugin = require("./node/NodeTargetPlugin");
				var ExternalsPlugin = require("./ExternalsPlugin");
				compiler.apply(
					new NodeTemplatePlugin(options.output, true),
					new FunctionModulePlugin(options.output),
					new NodeTargetPlugin(),
					new ExternalsPlugin("commonjs", [
						"app",
						"auto-updater",
						"browser-window",
						"content-tracing",
						"dialog",
						"global-shortcut",
						"ipc",
						"menu",
						"menu-item",
						"power-monitor",
						"protocol",
						"tray",
						"remote",
						"web-view",
						"clipboard",
						"crash-reporter",
						"screen",
						"shell"
					]),
					new LoaderTargetPlugin(options.target)
				);
				break;
			default:
				throw new Error("Unsupported target '" + options.target + "'.");
		}
	} else if(options.target !== false) {
		options.target(compiler);
	} else {
		throw new Error("Unsupported target '" + options.target + "'.");
	}
	if(options.output.library || options.output.libraryTarget !== "var") {
		var LibraryTemplatePlugin = require("./LibraryTemplatePlugin");
		compiler.apply(new LibraryTemplatePlugin(options.output.library, options.output.libraryTarget));
	}
	if(options.externals) {
		var ExternalsPlugin = require("./ExternalsPlugin");
		compiler.apply(new ExternalsPlugin(options.output.libraryTarget, options.externals));
	}

	if(options.hot) {
		compiler.apply(new MovedToPluginWarningPlugin("hot", "HotModuleReplacementPlugin"));
		var HotModuleReplacementPlugin = require("./HotModuleReplacementPlugin");
		compiler.apply(new HotModuleReplacementPlugin(options.output));
	}

	if(options.devtool && (options.devtool.indexOf("sourcemap") >= 0 || options.devtool.indexOf("source-map") >= 0)) {
		var hidden = options.devtool.indexOf("hidden") >= 0;
		var inline = options.devtool.indexOf("inline") >= 0;
		var evalWrapped = options.devtool.indexOf("eval") >= 0;
		var cheap = options.devtool.indexOf("cheap") >= 0;
		var moduleMaps = options.devtool.indexOf("module") >= 0;
		var legacy = options.devtool.indexOf("@") >= 0;
		var modern = options.devtool.indexOf("#") >= 0;
		var comment = legacy && modern ? "\n/*\n//@ sourceMappingURL=[url]\n//# sourceMappingURL=[url]\n*/" :
			legacy ? "\n/*\n//@ sourceMappingURL=[url]\n*/" :
			modern ? "\n//# sourceMappingURL=[url]" :
			null;
		var Plugin = evalWrapped ? EvalSourceMapDevToolPlugin : SourceMapDevToolPlugin;
		compiler.apply(new Plugin({
			filename: inline ? null : options.output.sourceMapFilename,
			moduleFilenameTemplate: options.output.devtoolModuleFilenameTemplate,
			fallbackModuleFilenameTemplate: options.output.devtoolFallbackModuleFilenameTemplate,
			append: hidden ? false : comment,
			module: moduleMaps ? true : cheap ? false : true,
			columns: cheap ? false : true,
			lineToLine: options.output.devtoolLineToLine
		}));
	} else if(options.devtool && options.devtool.indexOf("eval") >= 0) {
		var legacy = options.devtool.indexOf("@") >= 0;
		var modern = options.devtool.indexOf("#") >= 0;
		var comment = legacy && modern ? "//@ sourceURL=[url]\n//# sourceURL=[url]" :
			legacy ? "//@ sourceURL=[url]" :
			modern ? "//# sourceURL=[url]" :
			null;
		compiler.apply(new EvalDevToolModulePlugin(comment, options.output.devtoolModuleFilenameTemplate));
	}

	compiler.apply(new EntryOptionPlugin());
	compiler.applyPluginsBailResult("entry-option", options.context, options.entry);

	if(options.prefetch) {
		compiler.apply(new MovedToPluginWarningPlugin("prefetch", "PrefetchPlugin"));
		var PrefetchPlugin = require("./PrefetchPlugin");
		options.prefetch.map(function(request) {
			compiler.apply(new PrefetchPlugin(options.context, request));
		});
	}
	compiler.apply(
		new CompatibilityPlugin(),
		new LoaderPlugin(),
		new NodeStuffPlugin(options.node),
		new RequireJsStuffPlugin(),
		new APIPlugin(),
		new ConstPlugin(),
		new RequireIncludePlugin(),
		new RequireEnsurePlugin(),
		new RequireContextPlugin(options.resolve.modulesDirectories, options.resolve.extensions),
		new AMDPlugin(options.module, options.amd || {}),
		new CommonJsPlugin(options.module)
	);

	compiler.apply(
		new RemoveParentModulesPlugin(),
		new RemoveEmptyChunksPlugin(),
		new MergeDuplicateChunksPlugin(),
		new FlagIncludedChunksPlugin()
	);

	compiler.apply(new TemplatedPathPlugin());

	compiler.apply(new RecordIdsPlugin());

	compiler.apply(new WarnCaseSensitiveModulesPlugin());

	if(options.optimize && options.optimize.occurenceOrder) {
		compiler.apply(new MovedToPluginWarningPlugin("optimize.occurenceOrder", "optimize.OccurrenceOrderPlugin"));
		var OccurrenceOrderPlugin = require("./optimize/OccurrenceOrderPlugin");
		compiler.apply(new OccurrenceOrderPlugin(options.optimize.occurenceOrderPreferEntry));
	}

	if(options.optimize && options.optimize.minChunkSize) {
		compiler.apply(new MovedToPluginWarningPlugin("optimize.minChunkSize", "optimize.MinChunkSizePlugin"));
		var MinChunkSizePlugin = require("./optimize/MinChunkSizePlugin");
		compiler.apply(new MinChunkSizePlugin(options.optimize));
	}

	if(options.optimize && options.optimize.maxChunks) {
		compiler.apply(new MovedToPluginWarningPlugin("optimize.maxChunks", "optimize.LimitChunkCountPlugin"));
		var LimitChunkCountPlugin = require("./optimize/LimitChunkCountPlugin");
		compiler.apply(new LimitChunkCountPlugin(options.optimize));
	}

	if(options.optimize.minimize) {
		compiler.apply(new MovedToPluginWarningPlugin("optimize.minimize", "optimize.UglifyJsPlugin"));
		var UglifyJsPlugin = require("./optimize/UglifyJsPlugin");
		if(options.optimize.minimize === true)
			compiler.apply(new UglifyJsPlugin());
		else
			compiler.apply(new UglifyJsPlugin(options.optimize.minimize));
	}

	if(options.cache === undefined ? options.watch : options.cache) {
		var CachePlugin = require("./CachePlugin");
		compiler.apply(new CachePlugin(typeof options.cache === "object" ? options.cache : null));
	}

	if(typeof options.provide === "object") {
		compiler.apply(new MovedToPluginWarningPlugin("provide", "ProvidePlugin"));
		var ProvidePlugin = require("./ProvidePlugin");
		compiler.apply(new ProvidePlugin(options.provide));
	}

	if(options.define) {
		compiler.apply(new MovedToPluginWarningPlugin("define", "DefinePlugin"));
		var defineObject = {};
		if(typeof options.define === "object") {
			Object.keys(options.define).forEach(function(key) {
				defineObject[key] = options.define[key];
			});
		}
		compiler.apply(new DefinePlugin(defineObject));
	}
	if(options.defineDebug !== false)
		compiler.apply(new DefinePlugin({
			DEBUG: !!options.debug
		}));

	compiler.applyPlugins("after-plugins", compiler);
	compiler.resolvers.normal.apply(
		new UnsafeCachePlugin(options.resolve.unsafeCache),
		options.resolve.packageAlias ? new DirectoryDescriptionFileFieldAliasPlugin("package.json", options.resolve.packageAlias) : function() {},
		new ModuleAliasPlugin(options.resolve.alias),
		makeRootPlugin("module", options.resolve.root),
		new ModulesInDirectoriesPlugin("module", options.resolve.modulesDirectories),
		makeRootPlugin("module", options.resolve.fallback),
		new ModuleAsFilePlugin("module"),
		new ModuleAsDirectoryPlugin("module"),
		new DirectoryDescriptionFilePlugin("package.json", options.resolve.packageMains),
		new DirectoryDefaultFilePlugin(["index"]),
		new FileAppendPlugin(options.resolve.extensions),
		new ResultSymlinkPlugin()
	);
	compiler.resolvers.context.apply(
		new UnsafeCachePlugin(options.resolve.unsafeCache),
		new ModuleAliasPlugin(options.resolve.alias),
		makeRootPlugin("module", options.resolve.root),
		new ModulesInDirectoriesPlugin("module", options.resolve.modulesDirectories),
		makeRootPlugin("module", options.resolve.fallback),
		new ModuleAsFilePlugin("module"),
		new ModuleAsDirectoryPlugin("module"),
		new DirectoryResultPlugin(),
		new ResultSymlinkPlugin()
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
		new DirectoryDescriptionFilePlugin("package.json", options.resolveLoader.packageMains),
		new DirectoryDefaultFilePlugin(["index"]),
		new FileAppendPlugin(options.resolveLoader.extensions),
		new ResultSymlinkPlugin()
	);
	compiler.applyPlugins("after-resolvers", compiler);
	return options;
};

function makeRootPlugin(name, root) {
	if(typeof root === "string")
		return new ModulesInRootPlugin(name, root);
	else if(Array.isArray(root)) {
		return function() {
			root.forEach(function(root) {
				this.apply(new ModulesInRootPlugin(name, root));
			}, this);
		};
	}
	return function() {};
}
