/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var assign = require("object-assign");
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

var TemplatedPathPlugin = require("./TemplatedPathPlugin");
var WarnCaseSensitiveModulesPlugin = require("./WarnCaseSensitiveModulesPlugin");
var UseStrictPlugin = require("./UseStrictPlugin");

var LoaderPlugin = require("./dependencies/LoaderPlugin");
var CommonJsPlugin = require("./dependencies/CommonJsPlugin");
var HarmonyModulesPlugin = require("./dependencies/HarmonyModulesPlugin");
var SystemPlugin = require("./dependencies/SystemPlugin");
var ImportPlugin = require("./dependencies/ImportPlugin");
var AMDPlugin = require("./dependencies/AMDPlugin");
var RequireContextPlugin = require("./dependencies/RequireContextPlugin");
var RequireEnsurePlugin = require("./dependencies/RequireEnsurePlugin");
var RequireIncludePlugin = require("./dependencies/RequireIncludePlugin");

var EnsureChunkConditionsPlugin = require("./optimize/EnsureChunkConditionsPlugin");
var RemoveParentModulesPlugin = require("./optimize/RemoveParentModulesPlugin");
var RemoveEmptyChunksPlugin = require("./optimize/RemoveEmptyChunksPlugin");
var MergeDuplicateChunksPlugin = require("./optimize/MergeDuplicateChunksPlugin");
var FlagIncludedChunksPlugin = require("./optimize/FlagIncludedChunksPlugin");
var OccurrenceOrderPlugin = require("./optimize/OccurrenceOrderPlugin");
var FlagDependencyUsagePlugin = require("./FlagDependencyUsagePlugin");
var FlagDependencyExportsPlugin = require("./FlagDependencyExportsPlugin");
var EmittedAssetSizeLimitPlugin = require("./performance/EmittedAssetSizeLimitPlugin");

var ResolverFactory = require("enhanced-resolve").ResolverFactory;

function WebpackOptionsApply() {
	OptionsApply.call(this);
}
module.exports = WebpackOptionsApply;

WebpackOptionsApply.prototype = Object.create(OptionsApply.prototype);
WebpackOptionsApply.prototype.constructor = WebpackOptionsApply;

WebpackOptionsApply.prototype.process = function(options, compiler) {
	var ExternalsPlugin;
	compiler.context = options.context;
	if(options.plugins && Array.isArray(options.plugins)) {
		compiler.apply.apply(compiler, options.plugins);
	}
	compiler.outputPath = options.output.path;
	compiler.recordsInputPath = options.recordsInputPath || options.recordsPath;
	compiler.recordsOutputPath = options.recordsOutputPath || options.recordsPath;
	compiler.name = options.name;
	compiler.dependencies = options.dependencies;
	if(typeof options.target === "string") {
		var JsonpTemplatePlugin;
		var NodeSourcePlugin;
		var NodeTargetPlugin;
		var NodeTemplatePlugin;

		switch(options.target) {
			case "web":
				JsonpTemplatePlugin = require("./JsonpTemplatePlugin");
				NodeSourcePlugin = require("./node/NodeSourcePlugin");
				compiler.apply(
					new JsonpTemplatePlugin(options.output),
					new FunctionModulePlugin(options.output),
					new NodeSourcePlugin(options.node),
					new LoaderTargetPlugin("web")
				);
				break;
			case "webworker":
				var WebWorkerTemplatePlugin = require("./webworker/WebWorkerTemplatePlugin");
				NodeSourcePlugin = require("./node/NodeSourcePlugin");
				compiler.apply(
					new WebWorkerTemplatePlugin(options.output),
					new FunctionModulePlugin(options.output),
					new NodeSourcePlugin(options.node),
					new LoaderTargetPlugin("webworker")
				);
				break;
			case "node":
			case "async-node":
				NodeTemplatePlugin = require("./node/NodeTemplatePlugin");
				NodeTargetPlugin = require("./node/NodeTargetPlugin");
				compiler.apply(
					new NodeTemplatePlugin({
						asyncChunkLoading: options.target === "async-node"
					}),
					new FunctionModulePlugin(options.output),
					new NodeTargetPlugin(),
					new LoaderTargetPlugin("node")
				);
				break;
			case "node-webkit":
				JsonpTemplatePlugin = require("./JsonpTemplatePlugin");
				NodeTargetPlugin = require("./node/NodeTargetPlugin");
				ExternalsPlugin = require("./ExternalsPlugin");
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
			case "electron-main":
				NodeTemplatePlugin = require("./node/NodeTemplatePlugin");
				NodeTargetPlugin = require("./node/NodeTargetPlugin");
				ExternalsPlugin = require("./ExternalsPlugin");
				compiler.apply(
					new NodeTemplatePlugin({
						asyncChunkLoading: true
					}),
					new FunctionModulePlugin(options.output),
					new NodeTargetPlugin(),
					new ExternalsPlugin("commonjs", [
						"app",
						"auto-updater",
						"browser-window",
						"content-tracing",
						"dialog",
						"electron",
						"global-shortcut",
						"ipc",
						"ipc-main",
						"menu",
						"menu-item",
						"power-monitor",
						"power-save-blocker",
						"protocol",
						"session",
						"web-contents",
						"tray",
						"clipboard",
						"crash-reporter",
						"native-image",
						"screen",
						"shell"
					]),
					new LoaderTargetPlugin(options.target)
				);
				break;
			case "electron-renderer":
				JsonpTemplatePlugin = require("./JsonpTemplatePlugin");
				NodeTargetPlugin = require("./node/NodeTargetPlugin");
				ExternalsPlugin = require("./ExternalsPlugin");
				compiler.apply(
					new JsonpTemplatePlugin(options.output),
					new FunctionModulePlugin(options.output),
					new NodeTargetPlugin(),
					new ExternalsPlugin("commonjs", [
						"desktop-capturer",
						"electron",
						"ipc",
						"ipc-renderer",
						"remote",
						"web-frame",
						"clipboard",
						"crash-reporter",
						"native-image",
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
		compiler.apply(new LibraryTemplatePlugin(options.output.library, options.output.libraryTarget, options.output.umdNamedDefine, options.output.auxiliaryComment || ""));
	}
	if(options.externals) {
		ExternalsPlugin = require("./ExternalsPlugin");
		compiler.apply(new ExternalsPlugin(options.output.libraryTarget, options.externals));
	}
	var noSources;
	var legacy;
	var modern;
	var comment;
	if(options.devtool && (options.devtool.indexOf("sourcemap") >= 0 || options.devtool.indexOf("source-map") >= 0)) {
		var hidden = options.devtool.indexOf("hidden") >= 0;
		var inline = options.devtool.indexOf("inline") >= 0;
		var evalWrapped = options.devtool.indexOf("eval") >= 0;
		var cheap = options.devtool.indexOf("cheap") >= 0;
		var moduleMaps = options.devtool.indexOf("module") >= 0;
		noSources = options.devtool.indexOf("nosources") >= 0;
		legacy = options.devtool.indexOf("@") >= 0;
		modern = options.devtool.indexOf("#") >= 0;
		comment = legacy && modern ? "\n/*\n//@ sourceMappingURL=[url]\n//# sourceMappingURL=[url]\n*/" :
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
			lineToLine: options.output.devtoolLineToLine,
			noSources: noSources,
		}));
	} else if(options.devtool && options.devtool.indexOf("eval") >= 0) {
		legacy = options.devtool.indexOf("@") >= 0;
		modern = options.devtool.indexOf("#") >= 0;
		comment = legacy && modern ? "\n//@ sourceURL=[url]\n//# sourceURL=[url]" :
			legacy ? "\n//@ sourceURL=[url]" :
			modern ? "\n//# sourceURL=[url]" :
			null;
		compiler.apply(new EvalDevToolModulePlugin(comment, options.output.devtoolModuleFilenameTemplate));
	}

	compiler.apply(new EntryOptionPlugin());
	compiler.applyPluginsBailResult("entry-option", options.context, options.entry);

	compiler.apply(
		new CompatibilityPlugin(),
		new LoaderPlugin(),
		new NodeStuffPlugin(options.node),
		new RequireJsStuffPlugin(),
		new APIPlugin(),
		new ConstPlugin(),
		new UseStrictPlugin(),
		new RequireIncludePlugin(),
		new RequireEnsurePlugin(),
		new RequireContextPlugin(options.resolve.modules, options.resolve.extensions),
		new AMDPlugin(options.module, options.amd || {}),
		new CommonJsPlugin(options.module),
		new HarmonyModulesPlugin(options.module),
		new ImportPlugin(options.module),
		new SystemPlugin(options.module)
	);

	compiler.apply(
		new EnsureChunkConditionsPlugin(),
		new RemoveParentModulesPlugin(),
		new RemoveEmptyChunksPlugin(),
		new MergeDuplicateChunksPlugin(),
		new FlagIncludedChunksPlugin(),
		new OccurrenceOrderPlugin(true),
		new FlagDependencyExportsPlugin(),
		new FlagDependencyUsagePlugin()
	);

	compiler.apply(new EmittedAssetSizeLimitPlugin(options.performance));

	compiler.apply(new TemplatedPathPlugin());

	compiler.apply(new RecordIdsPlugin());

	compiler.apply(new WarnCaseSensitiveModulesPlugin());

	if(options.cache) {
		var CachePlugin = require("./CachePlugin");
		compiler.apply(new CachePlugin(typeof options.cache === "object" ? options.cache : null));
	}

	compiler.applyPlugins("after-plugins", compiler);
	compiler.resolvers.normal = ResolverFactory.createResolver(assign({
		resolver: compiler.resolvers.normal
	}, options.resolve));
	compiler.resolvers.context = ResolverFactory.createResolver(assign({
		resolver: compiler.resolvers.context,
		resolveToContext: true
	}, options.resolve));
	compiler.resolvers.loader = ResolverFactory.createResolver(assign({
		resolver: compiler.resolvers.loader
	}, options.resolveLoader));
	compiler.applyPlugins("after-resolvers", compiler);
	return options;
};
