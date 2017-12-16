/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const OptionsApply = require("./OptionsApply");

const JavascriptModulesPlugin = require("./JavascriptModulesPlugin");
const JsonModulesPlugin = require("./JsonModulesPlugin");
const WebAssemblyModulesPlugin = require("./WebAssemblyModulesPlugin");

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

const WarnNoModeSetPlugin = require("./WarnNoModeSetPlugin");

const EnsureChunkConditionsPlugin = require("./optimize/EnsureChunkConditionsPlugin");
const RemoveParentModulesPlugin = require("./optimize/RemoveParentModulesPlugin");
const RemoveEmptyChunksPlugin = require("./optimize/RemoveEmptyChunksPlugin");
const MergeDuplicateChunksPlugin = require("./optimize/MergeDuplicateChunksPlugin");
const FlagIncludedChunksPlugin = require("./optimize/FlagIncludedChunksPlugin");
const OccurrenceOrderPlugin = require("./optimize/OccurrenceOrderPlugin");
const SideEffectsFlagPlugin = require("./optimize/SideEffectsFlagPlugin");
const FlagDependencyUsagePlugin = require("./FlagDependencyUsagePlugin");
const FlagDependencyExportsPlugin = require("./FlagDependencyExportsPlugin");
const ModuleConcatenationPlugin = require("./optimize/ModuleConcatenationPlugin");
const NoEmitOnErrorsPlugin = require("./NoEmitOnErrorsPlugin");
const NamedModulesPlugin = require("./NamedModulesPlugin");
const NamedChunksPlugin = require("./NamedChunksPlugin");
const DefinePlugin = require("./DefinePlugin");
const SizeLimitsPlugin = require("./performance/SizeLimitsPlugin");

class WebpackOptionsApply extends OptionsApply {
	constructor() {
		super();
	}

	process(options, compiler) {
		let ExternalsPlugin;
		compiler.outputPath = options.output.path;
		compiler.recordsInputPath = options.recordsInputPath || options.recordsPath;
		compiler.recordsOutputPath = options.recordsOutputPath || options.recordsPath;
		compiler.name = options.name;
		compiler.dependencies = options.dependencies;
		if(typeof options.target === "string") {
			let JsonpTemplatePlugin;
			let FetchCompileWasmTemplatePlugin;
			let ReadFileCompileWasmTemplatePlugin;
			let NodeSourcePlugin;
			let NodeTargetPlugin;
			let NodeTemplatePlugin;

			switch(options.target) {
				case "web":
					JsonpTemplatePlugin = require("./web/JsonpTemplatePlugin");
					FetchCompileWasmTemplatePlugin = require("./web/FetchCompileWasmTemplatePlugin");
					NodeSourcePlugin = require("./node/NodeSourcePlugin");
					compiler.apply(
						new JsonpTemplatePlugin(options.output),
						new FetchCompileWasmTemplatePlugin(options.output),
						new FunctionModulePlugin(options.output),
						new NodeSourcePlugin(options.node),
						new LoaderTargetPlugin(options.target)
					);
					break;
				case "webworker":
					{
						let WebWorkerTemplatePlugin = require("./webworker/WebWorkerTemplatePlugin");
						FetchCompileWasmTemplatePlugin = require("./web/FetchCompileWasmTemplatePlugin");
						NodeSourcePlugin = require("./node/NodeSourcePlugin");
						compiler.apply(
							new WebWorkerTemplatePlugin(),
							new FetchCompileWasmTemplatePlugin(options.output),
							new FunctionModulePlugin(options.output),
							new NodeSourcePlugin(options.node),
							new LoaderTargetPlugin(options.target)
						);
						break;
					}
				case "node":
				case "async-node":
					NodeTemplatePlugin = require("./node/NodeTemplatePlugin");
					ReadFileCompileWasmTemplatePlugin = require("./node/ReadFileCompileWasmTemplatePlugin");
					NodeTargetPlugin = require("./node/NodeTargetPlugin");
					compiler.apply(
						new NodeTemplatePlugin({
							asyncChunkLoading: options.target === "async-node"
						}),
						new ReadFileCompileWasmTemplatePlugin(options.output),
						new FunctionModulePlugin(options.output),
						new NodeTargetPlugin(),
						new LoaderTargetPlugin("node")
					);
					break;
				case "node-webkit":
					JsonpTemplatePlugin = require("./web/JsonpTemplatePlugin");
					NodeTargetPlugin = require("./node/NodeTargetPlugin");
					ExternalsPlugin = require("./ExternalsPlugin");
					compiler.apply(
						new JsonpTemplatePlugin(options.output),
						new FunctionModulePlugin(options.output),
						new NodeTargetPlugin(),
						new ExternalsPlugin("commonjs", "nw.gui"),
						new LoaderTargetPlugin(options.target)
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
					JsonpTemplatePlugin = require("./web/JsonpTemplatePlugin");
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
			let LibraryTemplatePlugin = require("./LibraryTemplatePlugin");
			compiler.apply(new LibraryTemplatePlugin(options.output.library, options.output.libraryTarget, options.output.umdNamedDefine, options.output.auxiliaryComment || "", options.output.libraryExport));
		}
		if(options.externals) {
			ExternalsPlugin = require("./ExternalsPlugin");
			compiler.apply(new ExternalsPlugin(options.output.libraryTarget, options.externals));
		}

		let noSources;
		let legacy;
		let modern;
		let comment;
		if(options.devtool && (options.devtool.indexOf("sourcemap") >= 0 || options.devtool.indexOf("source-map") >= 0)) {
			const hidden = options.devtool.indexOf("hidden") >= 0;
			const inline = options.devtool.indexOf("inline") >= 0;
			const evalWrapped = options.devtool.indexOf("eval") >= 0;
			const cheap = options.devtool.indexOf("cheap") >= 0;
			const moduleMaps = options.devtool.indexOf("module") >= 0;
			noSources = options.devtool.indexOf("nosources") >= 0;
			legacy = options.devtool.indexOf("@") >= 0;
			modern = options.devtool.indexOf("#") >= 0;
			comment = legacy && modern ? "\n/*\n//@ source" + "MappingURL=[url]\n//# source" + "MappingURL=[url]\n*/" :
				legacy ? "\n/*\n//@ source" + "MappingURL=[url]\n*/" :
				modern ? "\n//# source" + "MappingURL=[url]" :
				null;
			let Plugin = evalWrapped ? EvalSourceMapDevToolPlugin : SourceMapDevToolPlugin;
			compiler.apply(new Plugin({
				filename: inline ? null : options.output.sourceMapFilename,
				moduleFilenameTemplate: options.output.devtoolModuleFilenameTemplate,
				fallbackModuleFilenameTemplate: options.output.devtoolFallbackModuleFilenameTemplate,
				append: hidden ? false : comment,
				module: moduleMaps ? true : cheap ? false : true,
				columns: cheap ? false : true,
				lineToLine: options.output.devtoolLineToLine,
				noSources: noSources,
				namespace: options.output.devtoolNamespace
			}));
		} else if(options.devtool && options.devtool.indexOf("eval") >= 0) {
			legacy = options.devtool.indexOf("@") >= 0;
			modern = options.devtool.indexOf("#") >= 0;
			comment = legacy && modern ? "\n//@ sourceURL=[url]\n//# sourceURL=[url]" :
				legacy ? "\n//@ sourceURL=[url]" :
				modern ? "\n//# sourceURL=[url]" :
				null;
			compiler.apply(new EvalDevToolModulePlugin({
				sourceUrlComment: comment,
				moduleFilenameTemplate: options.output.devtoolModuleFilenameTemplate,
				namespace: options.output.devtoolNamespace
			}));
		}
		compiler.apply(
			new JavascriptModulesPlugin(),
			new JsonModulesPlugin(),
			new WebAssemblyModulesPlugin()
		);

		compiler.apply(new EntryOptionPlugin());
		compiler.hooks.entryOption.call(options.context, options.entry);

		compiler.apply(
			new CompatibilityPlugin(),
			new HarmonyModulesPlugin(options.module),
			new AMDPlugin(options.module, options.amd || {}),
			new CommonJsPlugin(options.module),
			new LoaderPlugin(),
			new NodeStuffPlugin(options.node),
			new RequireJsStuffPlugin(),
			new APIPlugin(),
			new ConstPlugin(),
			new UseStrictPlugin(),
			new RequireIncludePlugin(),
			new RequireEnsurePlugin(),
			new RequireContextPlugin(options.resolve.modules, options.resolve.extensions, options.resolve.mainFiles),
			new ImportPlugin(options.module),
			new SystemPlugin(options.module)
		);

		if(typeof options.mode !== "string")
			compiler.apply(new WarnNoModeSetPlugin());

		compiler.apply(new EnsureChunkConditionsPlugin());
		if(options.optimization.removeAvailableModules)
			compiler.apply(new RemoveParentModulesPlugin());
		if(options.optimization.removeEmptyChunks)
			compiler.apply(new RemoveEmptyChunksPlugin());
		if(options.optimization.mergedDuplicateChunks)
			compiler.apply(new MergeDuplicateChunksPlugin());
		if(options.optimization.flagIncludedChunks)
			compiler.apply(new FlagIncludedChunksPlugin());
		if(options.optimization.occurrenceOrder)
			compiler.apply(new OccurrenceOrderPlugin(true));
		if(options.optimization.sideEffects)
			compiler.apply(new SideEffectsFlagPlugin());
		if(options.optimization.providedExports)
			compiler.apply(new FlagDependencyExportsPlugin());
		if(options.optimization.usedExports)
			compiler.apply(new FlagDependencyUsagePlugin());
		if(options.optimization.concatenateModules)
			compiler.apply(new ModuleConcatenationPlugin());
		if(options.optimization.noEmitOnErrors)
			compiler.apply(new NoEmitOnErrorsPlugin());
		if(options.optimization.namedModules)
			compiler.apply(new NamedModulesPlugin());
		if(options.optimization.namedChunks)
			compiler.apply(new NamedChunksPlugin());
		if(options.optimization.nodeEnv) {
			compiler.apply(new DefinePlugin({
				"process.env.NODE_ENV": JSON.stringify(options.optimization.nodeEnv)
			}));
		}

		if(options.performance) {
			compiler.apply(new SizeLimitsPlugin(options.performance));
		}

		compiler.apply(new TemplatedPathPlugin());

		compiler.apply(new RecordIdsPlugin({
			portableIds: options.optimization.portableRecords
		}));

		compiler.apply(new WarnCaseSensitiveModulesPlugin());

		if(options.cache) {
			let CachePlugin = require("./CachePlugin");
			compiler.apply(new CachePlugin(typeof options.cache === "object" ? options.cache : null));
		}

		compiler.hooks.afterPlugins.call(compiler);
		if(!compiler.inputFileSystem) throw new Error("No input filesystem provided");
		compiler.resolverFactory.plugin("resolve-options normal", resolveOptions => {
			return Object.assign({
				fileSystem: compiler.inputFileSystem
			}, options.resolve, resolveOptions);
		});
		compiler.resolverFactory.plugin("resolve-options context", resolveOptions => {
			return Object.assign({
				fileSystem: compiler.inputFileSystem,
				resolveToContext: true
			}, options.resolve, resolveOptions);
		});
		compiler.resolverFactory.plugin("resolve-options loader", resolveOptions => {
			return Object.assign({
				fileSystem: compiler.inputFileSystem
			}, options.resolveLoader, resolveOptions);
		});
		compiler.hooks.afterResolvers.call(compiler);
		return options;
	}
}

module.exports = WebpackOptionsApply;
