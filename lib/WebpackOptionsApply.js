/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import { createRequire } from "node:module";

import APIPlugin from "./APIPlugin.js";
import CompatibilityPlugin from "./CompatibilityPlugin.js";
import ConstPlugin from "./ConstPlugin.js";
import EntryOptionPlugin from "./EntryOptionPlugin.js";
import ExportsInfoApiPlugin from "./ExportsInfoApiPlugin.js";
import FlagDependencyExportsPlugin from "./FlagDependencyExportsPlugin.js";
import JavascriptMetaInfoPlugin from "./JavascriptMetaInfoPlugin.js";
import NodeStuffPlugin from "./NodeStuffPlugin.js";
import OptionsApply from "./OptionsApply.js";
import RecordIdsPlugin from "./RecordIdsPlugin.js";
import RuntimePlugin from "./RuntimePlugin.js";
import TemplatedPathPlugin from "./TemplatedPathPlugin.js";
import UseStrictPlugin from "./UseStrictPlugin.js";
import WarnCaseSensitiveModulesPlugin from "./WarnCaseSensitiveModulesPlugin.js";
import WebpackIsIncludedPlugin from "./WebpackIsIncludedPlugin.js";
import AssetModulesPlugin from "./asset/AssetModulesPlugin.js";
import InferAsyncModulesPlugin from "./async-modules/InferAsyncModulesPlugin.js";
import ResolverCachePlugin from "./cache/ResolverCachePlugin.js";
import CommonJsPlugin from "./dependencies/CommonJsPlugin.js";
import HarmonyModulesPlugin from "./dependencies/HarmonyModulesPlugin.js";
import ImportMetaContextPlugin from "./dependencies/ImportMetaContextPlugin.js";
import ImportMetaPlugin from "./dependencies/ImportMetaPlugin.js";
import ImportPlugin from "./dependencies/ImportPlugin.js";
import LoaderPlugin from "./dependencies/LoaderPlugin.js";
import RequireContextPlugin from "./dependencies/RequireContextPlugin.js";
import RequireEnsurePlugin from "./dependencies/RequireEnsurePlugin.js";
import RequireIncludePlugin from "./dependencies/RequireIncludePlugin.js";
import SystemPlugin from "./dependencies/SystemPlugin.js";
import URLPlugin from "./dependencies/URLPlugin.js";
import WorkerPlugin from "./dependencies/WorkerPlugin.js";
import JavascriptModulesPlugin from "./javascript/JavascriptModulesPlugin.js";
import JsonModulesPlugin from "./json/JsonModulesPlugin.js";
import ChunkPrefetchPreloadPlugin from "./prefetch/ChunkPrefetchPreloadPlugin.js";
import DataUriPlugin from "./schemes/DataUriPlugin.js";
import FileUriPlugin from "./schemes/FileUriPlugin.js";
import DefaultStatsFactoryPlugin from "./stats/DefaultStatsFactoryPlugin.js";
import DefaultStatsPresetPlugin from "./stats/DefaultStatsPresetPlugin.js";
import DefaultStatsPrinterPlugin from "./stats/DefaultStatsPrinterPlugin.js";
import { cleverMerge } from "./util/cleverMerge.js";

const require = createRequire(import.meta.url);
/** @typedef {import("./webpack.js").WebpackPluginFunction} WebpackPluginFunction */
/** @typedef {import("./config/defaults.js").WebpackOptionsNormalizedWithDefaults} WebpackOptions */
/** @typedef {import("./config/normalization.js").WebpackOptionsInterception} WebpackOptionsInterception */
/** @typedef {import("./Compiler.js").default} Compiler */
/** @typedef {import("./util/fs.js").InputFileSystem} InputFileSystem */
/** @typedef {import("./util/fs.js").IntermediateFileSystem} IntermediateFileSystem */

const CLASS_NAME = "WebpackOptionsApply";

class WebpackOptionsApply extends OptionsApply {
	constructor() {
		super();
	}

	/**
	 * Returns options object.
	 * @param {WebpackOptions} options options object
	 * @param {Compiler} compiler compiler object
	 * @param {WebpackOptionsInterception=} interception intercepted options
	 * @returns {WebpackOptions} options object
	 */
	process(options, compiler, interception) {
		compiler.outputPath = options.output.path;
		compiler.recordsInputPath = options.recordsInputPath || null;
		compiler.recordsOutputPath = options.recordsOutputPath || null;
		compiler.name = options.name;

		if (options.externals) {
			const ExternalsPlugin =
				/** @type {typeof import("./ExternalsPlugin.js").default} */ (
					require("./ExternalsPlugin.js")
				);

			new ExternalsPlugin(options.externalsType, options.externals).apply(
				compiler
			);
		}

		if (options.externalsPresets.node) {
			const NodeTargetPlugin =
				/** @type {typeof import("./node/NodeTargetPlugin.js").default} */ (
					require("./node/NodeTargetPlugin.js")
				);

			// Some older versions of Node.js don't support all built-in modules via import, only via `require`,
			// but it seems like there shouldn't be a warning here since these versions are rarely used in real applications
			new NodeTargetPlugin(
				options.output.module ? "module-import" : "node-commonjs"
			).apply(compiler);

			// Handle external CSS `@import` and `url()`
			if (options.experiments.css) {
				const ExternalsPlugin =
					/** @type {typeof import("./ExternalsPlugin.js").default} */ (
						require("./ExternalsPlugin.js")
					);

				new ExternalsPlugin(
					"module",
					({ request, dependencyType, contextInfo }, callback) => {
						if (
							/\.css(?:\?|$)/.test(contextInfo.issuer) &&
							/^(?:\/\/|https?:\/\/|#)/.test(request)
						) {
							if (dependencyType === "url") {
								return callback(null, `asset ${request}`);
							} else if (
								(dependencyType === "css-import" ||
									dependencyType === "css-import-local-module" ||
									dependencyType === "css-import-global-module") &&
								options.experiments.css
							) {
								return callback(null, `css-import ${request}`);
							}
						}

						callback();
					}
				).apply(compiler);
			}
		}
		if (options.externalsPresets.deno) {
			const DenoTargetPlugin =
				/** @type {typeof import("./deno/DenoTargetPlugin.js").default} */ (
					require("./deno/DenoTargetPlugin.js")
				);

			new DenoTargetPlugin().apply(compiler);
		}
		if (options.externalsPresets.bun) {
			const BunTargetPlugin =
				/** @type {typeof import("./bun/BunTargetPlugin.js").default} */ (
					require("./bun/BunTargetPlugin.js")
				);

			new BunTargetPlugin().apply(compiler);
		}
		if (options.externalsPresets.webAsync || options.externalsPresets.web) {
			const type = options.externalsPresets.webAsync ? "import" : "module";

			const ExternalsPlugin =
				/** @type {typeof import("./ExternalsPlugin.js").default} */ (
					require("./ExternalsPlugin.js")
				);

			new ExternalsPlugin(type, ({ request, dependencyType }, callback) => {
				if (/^(?:\/\/|https?:\/\/|#|std:|jsr:|npm:)/.test(request)) {
					if (dependencyType === "url") {
						return callback(null, `asset ${request}`);
					} else if (
						(dependencyType === "css-import" ||
							dependencyType === "css-import-local-module" ||
							dependencyType === "css-import-global-module") &&
						options.experiments.css
					) {
						return callback(null, `css-import ${request}`);
					} else if (/^(?:\/\/|https?:\/\/|std:|jsr:|npm:)/.test(request)) {
						return callback(null, `${type} ${request}`);
					}
				}

				callback();
			}).apply(compiler);
		}
		if (options.externalsPresets.electron) {
			// Use ESM imports only when the targeted electron version supports them
			const type =
				options.output.module && options.output.environment.module
					? "module-import"
					: "node-commonjs";

			// Warn when ESM output is requested but the electron version lacks it (added in electron 28)
			if (options.output.module && !options.output.environment.module) {
				const WebpackError =
					/** @type {typeof import("./WebpackError.js").default} */ (
						require("./WebpackError.js")
					);

				compiler.hooks.thisCompilation.tap(CLASS_NAME, (compilation) => {
					compilation.warnings.push(
						new WebpackError(
							"'output.module' is enabled, but the targeted electron version does not support ECMAScript modules (added in electron 28). Electron built-in modules are externalized as 'node-commonjs'."
						)
					);
				});
			}

			if (options.externalsPresets.electronMain) {
				const ElectronTargetPlugin =
					/** @type {typeof import("./electron/ElectronTargetPlugin.js").default} */ (
						require("./electron/ElectronTargetPlugin.js")
					);

				new ElectronTargetPlugin("main", type).apply(compiler);
			}
			if (options.externalsPresets.electronPreload) {
				const ElectronTargetPlugin =
					/** @type {typeof import("./electron/ElectronTargetPlugin.js").default} */ (
						require("./electron/ElectronTargetPlugin.js")
					);

				new ElectronTargetPlugin("preload", type).apply(compiler);
			}
			if (options.externalsPresets.electronRenderer) {
				const ElectronTargetPlugin =
					/** @type {typeof import("./electron/ElectronTargetPlugin.js").default} */ (
						require("./electron/ElectronTargetPlugin.js")
					);

				new ElectronTargetPlugin("renderer", type).apply(compiler);
			}
			if (
				!options.externalsPresets.electronMain &&
				!options.externalsPresets.electronPreload &&
				!options.externalsPresets.electronRenderer
			) {
				const ElectronTargetPlugin =
					/** @type {typeof import("./electron/ElectronTargetPlugin.js").default} */ (
						require("./electron/ElectronTargetPlugin.js")
					);

				new ElectronTargetPlugin(undefined, type).apply(compiler);
			}
		}
		if (options.externalsPresets.nwjs) {
			const ExternalsPlugin =
				/** @type {typeof import("./ExternalsPlugin.js").default} */ (
					require("./ExternalsPlugin.js")
				);

			new ExternalsPlugin("node-commonjs", "nw.gui").apply(compiler);
		}

		new ChunkPrefetchPreloadPlugin().apply(compiler);

		if (typeof options.output.chunkFormat === "string") {
			switch (options.output.chunkFormat) {
				case "array-push": {
					const ArrayPushCallbackChunkFormatPlugin =
						/** @type {typeof import("./javascript/ArrayPushCallbackChunkFormatPlugin.js").default} */ (
							require("./javascript/ArrayPushCallbackChunkFormatPlugin.js")
						);

					new ArrayPushCallbackChunkFormatPlugin().apply(compiler);
					break;
				}
				case "commonjs": {
					const CommonJsChunkFormatPlugin =
						/** @type {typeof import("./javascript/CommonJsChunkFormatPlugin.js").default} */ (
							require("./javascript/CommonJsChunkFormatPlugin.js")
						);

					new CommonJsChunkFormatPlugin().apply(compiler);
					break;
				}
				case "module": {
					const ModuleChunkFormatPlugin =
						/** @type {typeof import("./esm/ModuleChunkFormatPlugin.js").default} */ (
							require("./esm/ModuleChunkFormatPlugin.js")
						);

					new ModuleChunkFormatPlugin().apply(compiler);
					break;
				}
				default:
					throw new Error(
						`Unsupported chunk format '${options.output.chunkFormat}'.`
					);
			}
		}

		const enabledChunkLoadingTypes =
			/** @type {NonNullable<WebpackOptions["output"]["enabledChunkLoadingTypes"]>} */
			(options.output.enabledChunkLoadingTypes);

		if (enabledChunkLoadingTypes.length > 0) {
			for (const type of enabledChunkLoadingTypes) {
				const EnableChunkLoadingPlugin =
					/** @type {typeof import("./javascript/EnableChunkLoadingPlugin.js").default} */ (
						require("./javascript/EnableChunkLoadingPlugin.js")
					);

				new EnableChunkLoadingPlugin(type).apply(compiler);
			}
		}

		const enabledWasmLoadingTypes =
			/** @type {NonNullable<WebpackOptions["output"]["enabledWasmLoadingTypes"]>} */
			(options.output.enabledWasmLoadingTypes);

		if (enabledWasmLoadingTypes.length > 0) {
			for (const type of enabledWasmLoadingTypes) {
				const EnableWasmLoadingPlugin =
					/** @type {typeof import("./wasm/EnableWasmLoadingPlugin.js").default} */ (
						require("./wasm/EnableWasmLoadingPlugin.js")
					);

				new EnableWasmLoadingPlugin(type).apply(compiler);
			}
		}

		const enabledLibraryTypes =
			/** @type {NonNullable<WebpackOptions["output"]["enabledLibraryTypes"]>} */
			(options.output.enabledLibraryTypes);

		if (enabledLibraryTypes.length > 0) {
			let once = true;
			for (const type of enabledLibraryTypes) {
				const EnableLibraryPlugin =
					/** @type {typeof import("./library/EnableLibraryPlugin.js").default} */ (
						require("./library/EnableLibraryPlugin.js")
					);

				new EnableLibraryPlugin(type, {
					// eslint-disable-next-line no-loop-func
					additionalApply: () => {
						if (!once) return;
						once = false;
						// We rely on `exportInfo` to generate the `export statement` in certain library bundles.
						// Therefore, we ignore the disabling of `optimization.providedExport` and continue to apply `FlagDependencyExportsPlugin`.
						if (
							["module", "commonjs-static", "modern-module"].includes(type) &&
							!options.optimization.providedExports
						) {
							new FlagDependencyExportsPlugin().apply(compiler);
						}
					}
				}).apply(compiler);
			}
		}

		if (options.output.pathinfo) {
			const ModuleInfoHeaderPlugin =
				/** @type {typeof import("./ModuleInfoHeaderPlugin.js").default} */ (
					require("./ModuleInfoHeaderPlugin.js")
				);

			new ModuleInfoHeaderPlugin(options.output.pathinfo !== true).apply(
				compiler
			);
		}

		if (options.output.clean) {
			const CleanPlugin =
				/** @type {typeof import("./CleanPlugin.js").default} */ (
					require("./CleanPlugin.js")
				);

			new CleanPlugin(
				options.output.clean === true ? {} : options.output.clean
			).apply(compiler);
		}

		if (options.dotenv) {
			const DotenvPlugin =
				/** @type {typeof import("./DotenvPlugin.js").default} */ (
					require("./DotenvPlugin.js")
				);

			new DotenvPlugin(
				typeof options.dotenv === "boolean" ? {} : options.dotenv
			).apply(compiler);
		}

		let devtool =
			interception === undefined ? options.devtool : interception.devtool;
		devtool = Array.isArray(devtool)
			? devtool
			: typeof devtool === "string"
				? [{ type: "all", use: devtool }]
				: [];

		for (const item of devtool) {
			const { type, use } = item;

			if (use) {
				if (use.includes("source-map")) {
					const hidden = use.includes("hidden");
					const inline = use.includes("inline");
					const evalWrapped = use.includes("eval");
					const cheap = use.includes("cheap");
					const moduleMaps = use.includes("module");
					const noSources = use.includes("nosources");
					const debugIds = use.includes("debugids");
					const Plugin = evalWrapped
						? /** @type {typeof import("./EvalSourceMapDevToolPlugin.js").default} */ (
								require("./EvalSourceMapDevToolPlugin.js")
							)
						: /** @type {typeof import("./SourceMapDevToolPlugin.js").default} */ (
								require("./SourceMapDevToolPlugin.js")
							);
					const assetExt =
						type === "javascript"
							? /\.((c|m)?js)($|\?)/i
							: type === "css"
								? /\.(css)($|\?)/i
								: /\.((c|m)?js|css)($|\?)/i;

					new Plugin({
						test: evalWrapped ? undefined : assetExt,
						filename: inline ? null : options.output.sourceMapFilename,
						moduleFilenameTemplate:
							options.output.devtoolModuleFilenameTemplate,
						fallbackModuleFilenameTemplate:
							options.output.devtoolFallbackModuleFilenameTemplate,
						append: hidden ? false : undefined,
						module: moduleMaps ? true : !cheap,
						columns: !cheap,
						noSources,
						namespace: options.output.devtoolNamespace,
						debugIds
					}).apply(compiler);
				} else if (use.includes("eval")) {
					const EvalDevToolModulePlugin =
						/** @type {typeof import("./EvalDevToolModulePlugin.js").default} */ (
							require("./EvalDevToolModulePlugin.js")
						);

					new EvalDevToolModulePlugin({
						moduleFilenameTemplate:
							options.output.devtoolModuleFilenameTemplate,
						namespace: options.output.devtoolNamespace
					}).apply(compiler);
				}
			}
		}

		new JavascriptModulesPlugin().apply(compiler);

		new JsonModulesPlugin().apply(compiler);
		new AssetModulesPlugin({
			sideEffectFree: options.experiments.futureDefaults
		}).apply(compiler);

		if (!options.experiments.outputModule) {
			if (options.output.module) {
				throw new Error(
					"'output.module: true' is only allowed when 'experiments.outputModule' is enabled"
				);
			}
			if (options.output.enabledLibraryTypes.includes("module")) {
				throw new Error(
					"library type \"module\" is only allowed when 'experiments.outputModule' is enabled"
				);
			}
			if (options.output.enabledLibraryTypes.includes("modern-module")) {
				throw new Error(
					"library type \"modern-module\" is only allowed when 'experiments.outputModule' is enabled"
				);
			}
			if (
				options.externalsType === "module" ||
				options.externalsType === "module-import"
			) {
				throw new Error(
					"'externalsType: \"module\"' is only allowed when 'experiments.outputModule' is enabled"
				);
			}
		}

		if (options.experiments.syncWebAssembly) {
			const WebAssemblyModulesPlugin =
				/** @type {typeof import("./wasm-sync/WebAssemblyModulesPlugin.js").default} */ (
					require("./wasm-sync/WebAssemblyModulesPlugin.js")
				);

			new WebAssemblyModulesPlugin({
				mangleImports: options.optimization.mangleWasmImports
			}).apply(compiler);
		}

		if (options.experiments.asyncWebAssembly) {
			const AsyncWebAssemblyModulesPlugin =
				/** @type {typeof import("./wasm-async/AsyncWebAssemblyModulesPlugin.js").default} */ (
					require("./wasm-async/AsyncWebAssemblyModulesPlugin.js")
				);

			new AsyncWebAssemblyModulesPlugin({
				mangleImports: options.optimization.mangleWasmImports
			}).apply(compiler);
		}

		if (options.experiments.css) {
			const CssModulesPlugin =
				/** @type {typeof import("./css/CssModulesPlugin.js").default} */ (
					require("./css/CssModulesPlugin.js")
				);

			new CssModulesPlugin().apply(compiler);
		}

		if (options.experiments.html) {
			const HtmlModulesPlugin =
				/** @type {typeof import("./html/HtmlModulesPlugin.js").default} */ (
					require("./html/HtmlModulesPlugin.js")
				);

			new HtmlModulesPlugin().apply(compiler);
		}

		if (options.experiments.typescript) {
			const TypeScriptPlugin =
				/** @type {typeof import("./typescript/TypeScriptPlugin.js").default} */ (
					require("./typescript/TypeScriptPlugin.js")
				);

			new TypeScriptPlugin().apply(compiler);
		}

		if (options.experiments.lazyCompilation) {
			const LazyCompilationPlugin =
				/** @type {typeof import("./hmr/LazyCompilationPlugin.js").default} */ (
					require("./hmr/LazyCompilationPlugin.js")
				);

			const lazyOptions =
				typeof options.experiments.lazyCompilation === "object"
					? options.experiments.lazyCompilation
					: {};
			const isUniversalTarget =
				options.output.module &&
				compiler.platform.node === null &&
				compiler.platform.web === null;

			if (isUniversalTarget) {
				const emitter = require.resolve("../hot/emitter-event-target.js");

				const NormalModuleReplacementPlugin =
					/** @type {typeof import("./NormalModuleReplacementPlugin.js").default} */ (
						require("./NormalModuleReplacementPlugin.js")
					);

				// Override emitter that using `EventEmitter` to `EventTarget`
				// TODO webpack 6 - migrate to `EventTarget` by default
				new NormalModuleReplacementPlugin(/emitter(\.js)?$/, (result) => {
					if (
						/webpack[/\\]hot|webpack-dev-server[/\\]client|webpack-hot-middleware[/\\]client/.test(
							result.context
						)
					) {
						result.request = emitter;
					}

					return result;
				}).apply(compiler);
			}

			const backend = require.resolve(
				isUniversalTarget
					? "../hot/lazy-compilation-universal.js"
					: `../hot/lazy-compilation-${
							options.externalsPresets.node ? "node" : "web"
						}.js`
			);

			new LazyCompilationPlugin({
				backend:
					typeof lazyOptions.backend === "function"
						? lazyOptions.backend
						: /** @type {typeof import("./hmr/lazyCompilationBackend.js").default} */ (
								require("./hmr/lazyCompilationBackend.js")
							)({
								...lazyOptions.backend,
								client:
									(lazyOptions.backend && lazyOptions.backend.client) || backend
							}),
				entries: !lazyOptions || lazyOptions.entries !== false,
				imports: !lazyOptions || lazyOptions.imports !== false,
				test: (lazyOptions && lazyOptions.test) || undefined
			}).apply(compiler);
		}

		if (options.experiments.buildHttp) {
			const HttpUriPlugin =
				/** @type {typeof import("./schemes/HttpUriPlugin.js").default} */ (
					require("./schemes/HttpUriPlugin.js")
				);

			const httpOptions = options.experiments.buildHttp;
			new HttpUriPlugin(httpOptions).apply(compiler);
		}

		new EntryOptionPlugin().apply(compiler);
		compiler.hooks.entryOption.call(options.context, options.entry);

		new RuntimePlugin().apply(compiler);

		new InferAsyncModulesPlugin().apply(compiler);

		new DataUriPlugin().apply(compiler);
		new FileUriPlugin().apply(compiler);

		new CompatibilityPlugin().apply(compiler);
		new HarmonyModulesPlugin({
			deferImport: options.experiments.deferImport
		}).apply(compiler);
		if (options.amd !== false) {
			const AMDPlugin =
				/** @type {typeof import("./dependencies/AMDPlugin.js").default} */ (
					require("./dependencies/AMDPlugin.js")
				);
			const RequireJsStuffPlugin =
				/** @type {typeof import("./dependencies/RequireJsStuffPlugin.js").default} */ (
					require("./dependencies/RequireJsStuffPlugin.js")
				);

			new AMDPlugin(options.amd || {}).apply(compiler);
			new RequireJsStuffPlugin().apply(compiler);
		}
		new CommonJsPlugin().apply(compiler);
		new LoaderPlugin().apply(compiler);
		new NodeStuffPlugin({
			global: options.node ? options.node.global : false,
			__dirname: options.node ? options.node.__dirname : false,
			__filename: options.node ? options.node.__filename : false
		}).apply(compiler);
		new APIPlugin().apply(compiler);
		new ExportsInfoApiPlugin().apply(compiler);
		new WebpackIsIncludedPlugin().apply(compiler);
		new ConstPlugin().apply(compiler);
		new UseStrictPlugin().apply(compiler);
		new RequireIncludePlugin().apply(compiler);
		new RequireEnsurePlugin().apply(compiler);
		new RequireContextPlugin().apply(compiler);
		new ImportPlugin().apply(compiler);
		new ImportMetaContextPlugin().apply(compiler);
		new SystemPlugin().apply(compiler);
		new ImportMetaPlugin().apply(compiler);
		new URLPlugin().apply(compiler);
		new WorkerPlugin(
			options.output.workerChunkLoading,
			options.output.workerWasmLoading,
			options.output.module,
			options.output.workerPublicPath
		).apply(compiler);

		new DefaultStatsFactoryPlugin().apply(compiler);
		new DefaultStatsPresetPlugin().apply(compiler);
		new DefaultStatsPrinterPlugin().apply(compiler);

		new JavascriptMetaInfoPlugin().apply(compiler);

		if (typeof options.mode !== "string") {
			const WarnNoModeSetPlugin =
				/** @type {typeof import("./WarnNoModeSetPlugin.js").default} */ (
					require("./WarnNoModeSetPlugin.js")
				);

			new WarnNoModeSetPlugin().apply(compiler);
		}

		const EnsureChunkConditionsPlugin =
			/** @type {typeof import("./optimize/EnsureChunkConditionsPlugin.js").default} */ (
				require("./optimize/EnsureChunkConditionsPlugin.js")
			);

		new EnsureChunkConditionsPlugin().apply(compiler);
		if (options.optimization.removeAvailableModules) {
			const RemoveParentModulesPlugin =
				/** @type {typeof import("./optimize/RemoveParentModulesPlugin.js").default} */ (
					require("./optimize/RemoveParentModulesPlugin.js")
				);

			new RemoveParentModulesPlugin().apply(compiler);
		}
		if (options.optimization.removeEmptyChunks) {
			const RemoveEmptyChunksPlugin =
				/** @type {typeof import("./optimize/RemoveEmptyChunksPlugin.js").default} */ (
					require("./optimize/RemoveEmptyChunksPlugin.js")
				);

			new RemoveEmptyChunksPlugin().apply(compiler);
		}
		if (options.optimization.mergeDuplicateChunks) {
			const MergeDuplicateChunksPlugin =
				/** @type {typeof import("./optimize/MergeDuplicateChunksPlugin.js").default} */ (
					require("./optimize/MergeDuplicateChunksPlugin.js")
				);

			new MergeDuplicateChunksPlugin().apply(compiler);
		}
		if (options.optimization.flagIncludedChunks) {
			const FlagIncludedChunksPlugin =
				/** @type {typeof import("./optimize/FlagIncludedChunksPlugin.js").default} */ (
					require("./optimize/FlagIncludedChunksPlugin.js")
				);

			new FlagIncludedChunksPlugin().apply(compiler);
		}
		if (options.optimization.sideEffects) {
			const SideEffectsFlagPlugin =
				/** @type {typeof import("./optimize/SideEffectsFlagPlugin.js").default} */ (
					require("./optimize/SideEffectsFlagPlugin.js")
				);

			new SideEffectsFlagPlugin(
				options.optimization.sideEffects === true
			).apply(compiler);
		}
		if (options.optimization.providedExports) {
			new FlagDependencyExportsPlugin().apply(compiler);
		}
		if (options.optimization.usedExports) {
			const FlagDependencyUsagePlugin =
				/** @type {typeof import("./FlagDependencyUsagePlugin.js").default} */ (
					require("./FlagDependencyUsagePlugin.js")
				);

			new FlagDependencyUsagePlugin(
				options.optimization.usedExports === "global",
				// Keep an escaping module's exports mangleable when mangling is on.
				Boolean(options.optimization.mangleExports)
			).apply(compiler);
		}
		if (options.optimization.innerGraph) {
			const InnerGraphPlugin =
				/** @type {typeof import("./optimize/InnerGraphPlugin.js").default} */ (
					require("./optimize/InnerGraphPlugin.js")
				);

			new InnerGraphPlugin().apply(compiler);
		}

		if (options.mode === "production") {
			const CircularModulesPlugin =
				/** @type {typeof import("./CircularModulesPlugin.js").default} */ (
					require("./CircularModulesPlugin.js")
				);

			new CircularModulesPlugin().apply(compiler);
		}

		const ConstExportsPlugin =
			/** @type {typeof import("./optimize/ConstExportsPlugin.js").default} */ (
				require("./optimize/ConstExportsPlugin.js")
			);

		new ConstExportsPlugin({
			inlineExports: options.optimization.inlineExports
		}).apply(compiler);

		if (options.optimization.mangleExports) {
			const MangleExportsPlugin =
				/** @type {typeof import("./optimize/MangleExportsPlugin.js").default} */ (
					require("./optimize/MangleExportsPlugin.js")
				);

			new MangleExportsPlugin(
				options.optimization.mangleExports !== "size"
			).apply(compiler);
		}
		if (options.optimization.concatenateModules) {
			const ModuleConcatenationPlugin =
				/** @type {typeof import("./optimize/ModuleConcatenationPlugin.js").default} */ (
					require("./optimize/ModuleConcatenationPlugin.js")
				);

			new ModuleConcatenationPlugin().apply(compiler);
		}
		if (options.optimization.splitChunks) {
			const SplitChunksPlugin =
				/** @type {typeof import("./optimize/SplitChunksPlugin.js").default} */ (
					require("./optimize/SplitChunksPlugin.js")
				);

			new SplitChunksPlugin(options.optimization.splitChunks).apply(compiler);
		}
		if (options.optimization.runtimeChunk) {
			const RuntimeChunkPlugin =
				/** @type {typeof import("./optimize/RuntimeChunkPlugin.js").default} */ (
					require("./optimize/RuntimeChunkPlugin.js")
				);

			new RuntimeChunkPlugin(options.optimization.runtimeChunk).apply(compiler);
		}
		if (!options.optimization.emitOnErrors) {
			const NoEmitOnErrorsPlugin =
				/** @type {typeof import("./NoEmitOnErrorsPlugin.js").default} */ (
					require("./NoEmitOnErrorsPlugin.js")
				);

			new NoEmitOnErrorsPlugin().apply(compiler);
		}
		if (options.optimization.realContentHash) {
			const RealContentHashPlugin =
				/** @type {typeof import("./optimize/RealContentHashPlugin.js").default} */ (
					require("./optimize/RealContentHashPlugin.js")
				);

			new RealContentHashPlugin({
				hashFunction:
					/** @type {NonNullable<WebpackOptions["output"]["hashFunction"]>} */
					(options.output.hashFunction),
				hashDigest:
					/** @type {NonNullable<WebpackOptions["output"]["hashDigest"]>} */
					(options.output.hashDigest)
			}).apply(compiler);
		}
		if (options.optimization.checkWasmTypes) {
			const WasmFinalizeExportsPlugin =
				/** @type {typeof import("./wasm-sync/WasmFinalizeExportsPlugin.js").default} */ (
					require("./wasm-sync/WasmFinalizeExportsPlugin.js")
				);

			new WasmFinalizeExportsPlugin().apply(compiler);
		}
		const moduleIds = options.optimization.moduleIds;
		if (moduleIds) {
			switch (moduleIds) {
				case "natural": {
					const NaturalModuleIdsPlugin =
						/** @type {typeof import("./ids/NaturalModuleIdsPlugin.js").default} */ (
							require("./ids/NaturalModuleIdsPlugin.js")
						);

					new NaturalModuleIdsPlugin().apply(compiler);
					break;
				}
				case "named": {
					const NamedModuleIdsPlugin =
						/** @type {typeof import("./ids/NamedModuleIdsPlugin.js").default} */ (
							require("./ids/NamedModuleIdsPlugin.js")
						);

					new NamedModuleIdsPlugin().apply(compiler);
					break;
				}
				case "hashed": {
					const WarnDeprecatedOptionPlugin =
						/** @type {typeof import("./WarnDeprecatedOptionPlugin.js").default} */ (
							require("./WarnDeprecatedOptionPlugin.js")
						);
					const HashedModuleIdsPlugin =
						/** @type {typeof import("./ids/HashedModuleIdsPlugin.js").default} */ (
							require("./ids/HashedModuleIdsPlugin.js")
						);

					new WarnDeprecatedOptionPlugin(
						"optimization.moduleIds",
						"hashed",
						"deterministic"
					).apply(compiler);
					new HashedModuleIdsPlugin({
						hashFunction: options.output.hashFunction
					}).apply(compiler);
					break;
				}
				case "deterministic": {
					const DeterministicModuleIdsPlugin =
						/** @type {typeof import("./ids/DeterministicModuleIdsPlugin.js").default} */ (
							require("./ids/DeterministicModuleIdsPlugin.js")
						);

					new DeterministicModuleIdsPlugin().apply(compiler);
					break;
				}
				case "size": {
					const OccurrenceModuleIdsPlugin =
						/** @type {typeof import("./ids/OccurrenceModuleIdsPlugin.js").default} */ (
							require("./ids/OccurrenceModuleIdsPlugin.js")
						);

					new OccurrenceModuleIdsPlugin({
						prioritiseInitial: true
					}).apply(compiler);
					break;
				}
				default:
					throw new Error(
						`webpack bug: moduleIds: ${moduleIds} is not implemented`
					);
			}
		}
		const chunkIds = options.optimization.chunkIds;
		if (chunkIds) {
			switch (chunkIds) {
				case "natural": {
					const NaturalChunkIdsPlugin =
						/** @type {typeof import("./ids/NaturalChunkIdsPlugin.js").default} */ (
							require("./ids/NaturalChunkIdsPlugin.js")
						);

					new NaturalChunkIdsPlugin().apply(compiler);
					break;
				}
				case "named": {
					const NamedChunkIdsPlugin =
						/** @type {typeof import("./ids/NamedChunkIdsPlugin.js").default} */ (
							require("./ids/NamedChunkIdsPlugin.js")
						);

					new NamedChunkIdsPlugin().apply(compiler);
					break;
				}
				case "deterministic": {
					const DeterministicChunkIdsPlugin =
						/** @type {typeof import("./ids/DeterministicChunkIdsPlugin.js").default} */ (
							require("./ids/DeterministicChunkIdsPlugin.js")
						);

					new DeterministicChunkIdsPlugin().apply(compiler);
					break;
				}
				case "size": {
					const OccurrenceChunkIdsPlugin =
						/** @type {typeof import("./ids/OccurrenceChunkIdsPlugin.js").default} */ (
							require("./ids/OccurrenceChunkIdsPlugin.js")
						);

					new OccurrenceChunkIdsPlugin({
						prioritiseInitial: true
					}).apply(compiler);
					break;
				}
				case "total-size": {
					const OccurrenceChunkIdsPlugin =
						/** @type {typeof import("./ids/OccurrenceChunkIdsPlugin.js").default} */ (
							require("./ids/OccurrenceChunkIdsPlugin.js")
						);

					new OccurrenceChunkIdsPlugin({
						prioritiseInitial: false
					}).apply(compiler);
					break;
				}
				default:
					throw new Error(
						`webpack bug: chunkIds: ${chunkIds} is not implemented`
					);
			}
		}
		if (options.optimization.nodeEnv) {
			const DefinePlugin =
				/** @type {typeof import("./DefinePlugin.js").default} */ (
					require("./DefinePlugin.js")
				);

			const defValue = JSON.stringify(options.optimization.nodeEnv);

			new DefinePlugin({
				"process.env.NODE_ENV": defValue,
				"import.meta.env.NODE_ENV": defValue
			}).apply(compiler);
		}
		if (options.optimization.minimize) {
			for (const minimizer of options.optimization.minimizer) {
				if (typeof minimizer === "function") {
					/** @type {WebpackPluginFunction} */
					(minimizer).call(compiler, compiler);
				} else if (minimizer !== "..." && minimizer) {
					minimizer.apply(compiler);
				}
			}
		}

		if (options.performance) {
			const SizeLimitsPlugin =
				/** @type {typeof import("./performance/SizeLimitsPlugin.js").default} */ (
					require("./performance/SizeLimitsPlugin.js")
				);

			new SizeLimitsPlugin(options.performance).apply(compiler);
		}

		new TemplatedPathPlugin().apply(compiler);

		new RecordIdsPlugin({
			portableIds: options.optimization.portableRecords
		}).apply(compiler);

		new WarnCaseSensitiveModulesPlugin().apply(compiler);

		const AddManagedPathsPlugin =
			/** @type {typeof import("./cache/AddManagedPathsPlugin.js").default} */ (
				require("./cache/AddManagedPathsPlugin.js")
			);

		new AddManagedPathsPlugin(
			/** @type {NonNullable<WebpackOptions["snapshot"]["managedPaths"]>} */
			(options.snapshot.managedPaths),
			/** @type {NonNullable<WebpackOptions["snapshot"]["managedPaths"]>} */
			(options.snapshot.immutablePaths),
			/** @type {NonNullable<WebpackOptions["snapshot"]["managedPaths"]>} */
			(options.snapshot.unmanagedPaths)
		).apply(compiler);

		if (options.cache && typeof options.cache === "object") {
			const cacheOptions = options.cache;
			switch (cacheOptions.type) {
				case "memory": {
					if (Number.isFinite(cacheOptions.maxGenerations)) {
						const MemoryWithGcCachePlugin =
							/** @type {typeof import("./cache/MemoryWithGcCachePlugin.js").default} */ (
								require("./cache/MemoryWithGcCachePlugin.js")
							);

						new MemoryWithGcCachePlugin({
							maxGenerations:
								/** @type {number} */
								(cacheOptions.maxGenerations)
						}).apply(compiler);
					} else {
						const MemoryCachePlugin =
							/** @type {typeof import("./cache/MemoryCachePlugin.js").default} */ (
								require("./cache/MemoryCachePlugin.js")
							);

						new MemoryCachePlugin().apply(compiler);
					}
					if (cacheOptions.cacheUnaffected) {
						if (!options.experiments.cacheUnaffected) {
							throw new Error(
								"'cache.cacheUnaffected: true' is only allowed when 'experiments.cacheUnaffected' is enabled"
							);
						}
						compiler.moduleMemCaches = new Map();
					}
					break;
				}
				case "filesystem": {
					const AddBuildDependenciesPlugin =
						/** @type {typeof import("./cache/AddBuildDependenciesPlugin.js").default} */ (
							require("./cache/AddBuildDependenciesPlugin.js")
						);

					for (const key in cacheOptions.buildDependencies) {
						const list = cacheOptions.buildDependencies[key];
						new AddBuildDependenciesPlugin(list).apply(compiler);
					}
					if (!Number.isFinite(cacheOptions.maxMemoryGenerations)) {
						const MemoryCachePlugin =
							/** @type {typeof import("./cache/MemoryCachePlugin.js").default} */ (
								require("./cache/MemoryCachePlugin.js")
							);

						new MemoryCachePlugin().apply(compiler);
					} else if (cacheOptions.maxMemoryGenerations !== 0) {
						const MemoryWithGcCachePlugin =
							/** @type {typeof import("./cache/MemoryWithGcCachePlugin.js").default} */ (
								require("./cache/MemoryWithGcCachePlugin.js")
							);

						new MemoryWithGcCachePlugin({
							maxGenerations:
								/** @type {number} */
								(cacheOptions.maxMemoryGenerations)
						}).apply(compiler);
					}
					if (cacheOptions.memoryCacheUnaffected) {
						if (!options.experiments.cacheUnaffected) {
							throw new Error(
								"'cache.memoryCacheUnaffected: true' is only allowed when 'experiments.cacheUnaffected' is enabled"
							);
						}
						compiler.moduleMemCaches = new Map();
					}
					switch (cacheOptions.store) {
						case "pack": {
							const IdleFileCachePlugin =
								/** @type {typeof import("./cache/IdleFileCachePlugin.js").default} */ (
									require("./cache/IdleFileCachePlugin.js")
								);
							const PackFileCacheStrategy =
								/** @type {typeof import("./cache/PackFileCacheStrategy.js").default} */ (
									require("./cache/PackFileCacheStrategy.js")
								);

							new IdleFileCachePlugin(
								new PackFileCacheStrategy({
									compiler,
									fs:
										/** @type {IntermediateFileSystem} */
										(compiler.intermediateFileSystem),
									context: options.context,
									cacheLocation:
										/** @type {string} */
										(cacheOptions.cacheLocation),
									version: /** @type {string} */ (cacheOptions.version),
									logger: compiler.getInfrastructureLogger(
										"webpack.cache.PackFileCacheStrategy"
									),
									snapshot: options.snapshot,
									maxAge: /** @type {number} */ (cacheOptions.maxAge),
									profile: cacheOptions.profile,
									allowCollectingMemory: cacheOptions.allowCollectingMemory,
									compression: cacheOptions.compression,
									readonly: cacheOptions.readonly
								}),
								/** @type {number} */
								(cacheOptions.idleTimeout),
								/** @type {number} */
								(cacheOptions.idleTimeoutForInitialStore),
								/** @type {number} */
								(cacheOptions.idleTimeoutAfterLargeChanges)
							).apply(compiler);
							break;
						}
						default:
							throw new Error("Unhandled value for cache.store");
					}
					break;
				}
				default:
					// @ts-expect-error Property 'type' does not exist on type 'never'. ts(2339)
					throw new Error(`Unknown cache type ${cacheOptions.type}`);
			}
		}
		new ResolverCachePlugin().apply(compiler);

		if (options.ignoreWarnings && options.ignoreWarnings.length > 0) {
			const IgnoreWarningsPlugin =
				/** @type {typeof import("./IgnoreWarningsPlugin.js").default} */ (
					require("./IgnoreWarningsPlugin.js")
				);

			new IgnoreWarningsPlugin(options.ignoreWarnings).apply(compiler);
		}

		compiler.hooks.afterPlugins.call(compiler);
		if (!compiler.inputFileSystem) {
			throw new Error("No input filesystem provided");
		}
		compiler.resolverFactory.hooks.resolveOptions
			.for("normal")
			.tap(CLASS_NAME, (resolveOptions) => {
				resolveOptions = cleverMerge(options.resolve, resolveOptions);
				resolveOptions.fileSystem =
					/** @type {InputFileSystem} */
					(compiler.inputFileSystem);
				return resolveOptions;
			});
		compiler.resolverFactory.hooks.resolveOptions
			.for("context")
			.tap(CLASS_NAME, (resolveOptions) => {
				resolveOptions = cleverMerge(options.resolve, resolveOptions);
				resolveOptions.fileSystem =
					/** @type {InputFileSystem} */
					(compiler.inputFileSystem);
				resolveOptions.resolveToContext = true;
				return resolveOptions;
			});
		compiler.resolverFactory.hooks.resolveOptions
			.for("loader")
			.tap(CLASS_NAME, (resolveOptions) => {
				resolveOptions = cleverMerge(options.resolveLoader, resolveOptions);
				resolveOptions.fileSystem =
					/** @type {InputFileSystem} */
					(compiler.inputFileSystem);
				return resolveOptions;
			});
		compiler.hooks.afterResolvers.call(compiler);
		return options;
	}
}

export default WebpackOptionsApply;

export { WebpackOptionsApply as "module.exports" };
