"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
/* eslint-disable no-case-declarations */
const OptionsApply = require("./OptionsApply");
const LoaderTargetPlugin = require("./LoaderTargetPlugin");
const FunctionModulePlugin = require("./FunctionModulePlugin");
const EvalDevToolModulePlugin = require("./EvalDevToolModulePlugin");
const SourceMapDevToolPlugin = require("./SourceMapDevToolPlugin");
const EvalSourceMapDevToolPlugin = require("./EvalSourceMapDevToolPlugin");
const EntryOptionPlugin = require("./EntryOptionPlugin");
const RecordIdsPlugin = require("./RecordIdsPlugin");
const APIPlugin = require("./APIPlugin");
const ConstPlugin = require("./ConstPlugin");
const RequireJsStuffPlugin = require("./RequireJsStuffPlugin");
const NodeStuffPlugin = require("./NodeStuffPlugin");
const CompatibilityPlugin = require("./CompatibilityPlugin");
const TemplatedPathPlugin = require("./TemplatedPathPlugin");
const WarnCaseSensitiveModulesPlugin = require("./WarnCaseSensitiveModulesPlugin");
const UseStrictPlugin = require("./UseStrictPlugin");
const LoaderPlugin = require("./dependencies/LoaderPlugin");
const CommonJsPlugin = require("./dependencies/CommonJsPlugin");
const HarmonyModulesPlugin = require("./dependencies/HarmonyModulesPlugin");
const SystemPlugin = require("./dependencies/SystemPlugin");
const ImportPlugin = require("./dependencies/ImportPlugin");
const AMDPlugin = require("./dependencies/AMDPlugin");
const RequireContextPlugin = require("./dependencies/RequireContextPlugin");
const RequireEnsurePlugin = require("./dependencies/RequireEnsurePlugin");
const RequireIncludePlugin = require("./dependencies/RequireIncludePlugin");
const EnsureChunkConditionsPlugin = require("./optimize/EnsureChunkConditionsPlugin");
const RemoveParentModulesPlugin = require("./optimize/RemoveParentModulesPlugin");
const RemoveEmptyChunksPlugin = require("./optimize/RemoveEmptyChunksPlugin");
const MergeDuplicateChunksPlugin = require("./optimize/MergeDuplicateChunksPlugin");
const FlagIncludedChunksPlugin = require("./optimize/FlagIncludedChunksPlugin");
const OccurrenceOrderPlugin = require("./optimize/OccurrenceOrderPlugin");
const FlagDependencyUsagePlugin = require("./FlagDependencyUsagePlugin");
const FlagDependencyExportsPlugin = require("./FlagDependencyExportsPlugin");
const SizeLimitsPlugin = require("./performance/SizeLimitsPlugin");
const enhanced_resolve_1 = require("enhanced-resolve");
class WebpackOptionsApply extends OptionsApply {
	process(options, compiler) {
		let ExternalsPlugin;
		compiler.outputPath = options.output.path;
		compiler.recordsInputPath = options.recordsInputPath || options.recordsPath;
		compiler.recordsOutputPath = options.recordsOutputPath || options.recordsPath;
		compiler.name = options.name;
		compiler.dependencies = options.dependencies;
		if(typeof options.target === "string") {
			let JsonpTemplatePlugin;
			let NodeSourcePlugin;
			let NodeTargetPlugin;
			let NodeTemplatePlugin;
			switch(options.target) {
				case "web":
					JsonpTemplatePlugin = require("./JsonpTemplatePlugin");
					NodeSourcePlugin = require("./node/NodeSourcePlugin");
					compiler.apply(new JsonpTemplatePlugin(options.output), new FunctionModulePlugin(options.output), new NodeSourcePlugin(options.node), new LoaderTargetPlugin("web"));
					break;
				case "webworker":
					const WebWorkerTemplatePlugin = require("./webworker/WebWorkerTemplatePlugin");
					NodeSourcePlugin = require("./node/NodeSourcePlugin");
					compiler.apply(
						// todo: no param
						new WebWorkerTemplatePlugin(options.output), new FunctionModulePlugin(options.output), new NodeSourcePlugin(options.node), new LoaderTargetPlugin("webworker"));
					break;
				case "node":
				case "async-node":
					NodeTemplatePlugin = require("./node/NodeTemplatePlugin");
					NodeTargetPlugin = require("./node/NodeTargetPlugin");
					compiler.apply(new NodeTemplatePlugin({
						asyncChunkLoading: options.target === "async-node"
					}), new FunctionModulePlugin(options.output), new NodeTargetPlugin(), new LoaderTargetPlugin("node"));
					break;
				case "node-webkit":
					JsonpTemplatePlugin = require("./JsonpTemplatePlugin");
					NodeTargetPlugin = require("./node/NodeTargetPlugin");
					ExternalsPlugin = require("./ExternalsPlugin");
					compiler.apply(new JsonpTemplatePlugin(options.output), new FunctionModulePlugin(options.output), new NodeTargetPlugin(), new ExternalsPlugin("commonjs", "nw.gui"), new LoaderTargetPlugin("node-webkit"));
					break;
				case "atom":
				case "electron":
				case "electron-main":
					NodeTemplatePlugin = require("./node/NodeTemplatePlugin");
					NodeTargetPlugin = require("./node/NodeTargetPlugin");
					ExternalsPlugin = require("./ExternalsPlugin");
					compiler.apply(new NodeTemplatePlugin({
						asyncChunkLoading: true
					}), new FunctionModulePlugin(options.output), new NodeTargetPlugin(), new ExternalsPlugin("commonjs", [
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
					]), new LoaderTargetPlugin(options.target));
					break;
				case "electron-renderer":
					JsonpTemplatePlugin = require("./JsonpTemplatePlugin");
					NodeTargetPlugin = require("./node/NodeTargetPlugin");
					ExternalsPlugin = require("./ExternalsPlugin");
					compiler.apply(new JsonpTemplatePlugin(options.output), new FunctionModulePlugin(options.output), new NodeTargetPlugin(), new ExternalsPlugin("commonjs", [
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
					]), new LoaderTargetPlugin(options.target));
					break;
				default:
					throw new Error(`Unsupported target '${options.target}'.`);
			}
		} else if(options.target !== false) {
			options.target(compiler);
		} else {
			throw new Error(`Unsupported target '${options.target}'.`);
		}
		if(options.output.library || options.output.libraryTarget !== "var") {
			const LibraryTemplatePlugin = require("./LibraryTemplatePlugin");
			compiler.apply(new LibraryTemplatePlugin(options.output.library, options.output.libraryTarget, options.output.umdNamedDefine, options.output.auxiliaryComment || ""));
		}
		if(options.externals) {
			ExternalsPlugin = require("./ExternalsPlugin");
			compiler.apply(new ExternalsPlugin(options.output.libraryTarget, options.externals));
		}
		if(options.devtool && (options.devtool.indexOf("sourcemap") >= 0 || options.devtool.indexOf("source-map") >= 0)) {
			const hidden = options.devtool.indexOf("hidden") >= 0;
			const inline = options.devtool.indexOf("inline") >= 0;
			const evalWrapped = options.devtool.indexOf("eval") >= 0;
			const cheap = options.devtool.indexOf("cheap") >= 0;
			const moduleMaps = options.devtool.indexOf("module") >= 0;
			let noSources = options.devtool.indexOf("nosources") >= 0;
			let legacy = options.devtool.indexOf("@") >= 0;
			let modern = options.devtool.indexOf("#") >= 0;
			let comment = legacy && modern
				? "\n/*\n//@ sourceMappingURL=[url]\n//# sourceMappingURL=[url]\n*/"
				: legacy
					? "\n/*\n//@ sourceMappingURL=[url]\n*/"
					: modern
						? "\n//# sourceMappingURL=[url]"
						: undefined;
			const Plugin = evalWrapped ? EvalSourceMapDevToolPlugin : SourceMapDevToolPlugin;
			compiler.apply(new Plugin({
				filename: inline ? null : options.output.sourceMapFilename,
				moduleFilenameTemplate: options.output.devtoolModuleFilenameTemplate,
				fallbackModuleFilenameTemplate: options.output.devtoolFallbackModuleFilenameTemplate,
				append: hidden ? false : comment,
				module: moduleMaps ? true : cheap ? false : true,
				columns: cheap ? false : true,
				lineToLine: options.output.devtoolLineToLine,
				noSources
			}));
		} else if(options.devtool && options.devtool.indexOf("eval") >= 0) {
			let legacy = options.devtool.indexOf("@") >= 0;
			let modern = options.devtool.indexOf("#") >= 0;
			let comment = legacy && modern
				? "\n//@ sourceURL=[url]\n//# sourceURL=[url]"
				: legacy
					? "\n//@ sourceURL=[url]"
					: modern
						? "\n//# sourceURL=[url]"
						: undefined;
			compiler.apply(new EvalDevToolModulePlugin(comment, options.output.devtoolModuleFilenameTemplate));
		}
		compiler.apply(new EntryOptionPlugin());
		compiler.applyPluginsBailResult("entry-option", options.context, options.entry);
		compiler.apply(new CompatibilityPlugin(), new LoaderPlugin(), new NodeStuffPlugin(options.node), new RequireJsStuffPlugin(), new APIPlugin(), new ConstPlugin(), new UseStrictPlugin(), new RequireIncludePlugin(), new RequireEnsurePlugin(), new RequireContextPlugin(options.resolve.modules, options.resolve.extensions), new AMDPlugin(options.module, options.amd || {}), new CommonJsPlugin(options.module), new HarmonyModulesPlugin(), new ImportPlugin(options.module), new SystemPlugin(options.module));
		compiler.apply(new EnsureChunkConditionsPlugin(), new RemoveParentModulesPlugin(), new RemoveEmptyChunksPlugin(), new MergeDuplicateChunksPlugin(), new FlagIncludedChunksPlugin(), new OccurrenceOrderPlugin(true), new FlagDependencyExportsPlugin(), new FlagDependencyUsagePlugin());
		if(options.performance) {
			compiler.apply(new SizeLimitsPlugin(options.performance));
		}
		compiler.apply(new TemplatedPathPlugin());
		compiler.apply(new RecordIdsPlugin());
		compiler.apply(new WarnCaseSensitiveModulesPlugin());
		if(options.cache) {
			const CachePlugin = require("./CachePlugin");
			compiler.apply(new CachePlugin(typeof options.cache === "object" ? options.cache : undefined));
		}
		compiler.applyPlugins("after-plugins", compiler);
		if(!compiler.inputFileSystem) {
			throw new Error("No input filesystem provided");
		}
		compiler.resolvers.normal = enhanced_resolve_1.ResolverFactory.createResolver(Object.assign({
			fileSystem: compiler.inputFileSystem
		}, options.resolve));
		compiler.resolvers.context = enhanced_resolve_1.ResolverFactory.createResolver(Object.assign({
			fileSystem: compiler.inputFileSystem,
			resolveToContext: true
		}, options.resolve));
		compiler.resolvers.loader = enhanced_resolve_1.ResolverFactory.createResolver(Object.assign({
			fileSystem: compiler.inputFileSystem
		}, options.resolveLoader));
		compiler.applyPlugins("after-resolvers", compiler);
		return options;
	}
}
module.exports = WebpackOptionsApply;
