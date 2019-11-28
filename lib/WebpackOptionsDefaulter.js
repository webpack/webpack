/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");
const pkgDir = require("pkg-dir");
const OptionsDefaulter = require("./OptionsDefaulter");
const Template = require("./Template");
const normalizeEcmaVersion = require("./util/normalizeEcmaVersion");

const NODE_MODULES_REGEXP = /[\\/]node_modules[\\/]/i;

const isProductionLikeMode = options => {
	return options.mode === "production" || !options.mode;
};

const isWebLikeTarget = options => {
	return options.target === "web" || options.target === "webworker";
};

const getDevtoolNamespace = library => {
	// if options.output.library is a string
	if (Array.isArray(library)) {
		return library.join(".");
	} else if (typeof library === "object") {
		return getDevtoolNamespace(library.root);
	}
	return library || "";
};

class WebpackOptionsDefaulter extends OptionsDefaulter {
	constructor() {
		super();

		this.set("experiments", "call", value => ({ ...value }));
		this.set("experiments.asset", false);
		this.set("experiments.mjs", false);
		this.set("experiments.importAwait", false);
		this.set("experiments.importAsync", false);
		this.set("experiments.topLevelAwait", false);
		this.set("experiments.syncWebAssembly", false);
		this.set("experiments.asyncWebAssembly", false);
		this.set("experiments.outputModule", false);

		this.set("entry", "./src");

		this.set("devtool", "make", options =>
			options.mode === "development" ? "eval" : false
		);
		this.set("cache", "call", (value, options) => {
			if (value === undefined) {
				value = options.mode === "development";
			}
			if (value === true) {
				return {
					type: "memory"
				};
			}
			if (!value) {
				return false;
			}
			value = { ...value };
			if (value.type === "filesystem") {
				if (value.name === undefined) {
					value.name =
						(options.name || "default") + "-" + (options.mode || "production");
				}
				if (value.version === undefined) {
					value.version = "";
				}
				if (value.cacheDirectory === undefined) {
					const cwd = process.cwd();
					const dir = pkgDir.sync(cwd);
					if (!dir) {
						value.cacheDirectory = path.resolve(cwd, ".cache/webpack");
						// @ts-ignore
					} else if (process.versions.pnp) {
						value.cacheDirectory = path.resolve(dir, ".pnp/.cache/webpack");
					} else {
						value.cacheDirectory = path.resolve(
							dir,
							"node_modules/.cache/webpack"
						);
					}
				}
				if (value.cacheLocation === undefined) {
					value.cacheLocation = path.resolve(value.cacheDirectory, value.name);
				}
				if (value.hashAlgorithm === undefined) {
					value.hashAlgorithm = "md4";
				}
				if (value.store === undefined) {
					value.store = "pack";
				}
				if (value.idleTimeout === undefined) {
					value.idleTimeout = 60000;
				}
				if (value.idleTimeoutForInitialStore === undefined) {
					value.idleTimeoutForInitialStore = 0;
				}
				value.buildDependencies = Object.assign({}, value.buildDependencies);
				if (value.buildDependencies.defaultWebpack === undefined) {
					value.buildDependencies.defaultWebpack = [__dirname + path.sep];
				}
			}
			return value;
		});
		this.set("cache.managedPaths", "make", () => {
			const match = /^(.+?[\\/]node_modules)[\\/]/.exec(
				// eslint-disable-next-line node/no-extraneous-require
				require.resolve("watchpack")
			);
			if (match) {
				return [match[1]];
			}
		});
		this.set("cache.immutablePaths", "make", () => {
			// @ts-ignore
			if (process.versions.pnp === "1") {
				const match = /^(.+?[\\/]v4)[\\/]npm-watchpack-[^\\/]+-[\da-f]{40}[\\/]node_modules[\\/]/.exec(
					require.resolve("watchpack")
				);
				if (match) {
					return [match[1]];
				}
			}
		});

		this.set("context", process.cwd());
		this.set("target", "web");

		this.set("module", "call", value => ({ ...value }));
		this.set("module.unknownContextRequest", ".");
		this.set("module.unknownContextRegExp", false);
		this.set("module.unknownContextRecursive", true);
		this.set("module.unknownContextCritical", true);
		this.set("module.exprContextRequest", ".");
		this.set("module.exprContextRegExp", false);
		this.set("module.exprContextRecursive", true);
		this.set("module.exprContextCritical", true);
		this.set("module.wrappedContextRegExp", /.*/);
		this.set("module.wrappedContextRecursive", true);
		this.set("module.wrappedContextCritical", false);
		this.set("module.strictExportPresence", false);
		this.set("module.strictThisContextOnImports", false);
		this.set("module.unsafeCache", "make", options => {
			if (options.cache) {
				return module => {
					const name = module.nameForCondition();
					return name && NODE_MODULES_REGEXP.test(name);
				};
			}
		});
		this.set("module.rules", []);
		this.set("module.defaultRules", "make", options =>
			[
				{
					type: "javascript/auto",
					resolve: {}
				},
				options.experiments.mjs && {
					test: /\.mjs$/i,
					type: "javascript/esm",
					resolve: {
						mainFields:
							options.target === "web" ||
							options.target === "webworker" ||
							options.target === "electron-renderer"
								? ["browser", "main"]
								: ["main"]
					}
				},
				{
					test: /\.json$/i,
					type: "json"
				},
				options.experiments.syncWebAssembly && {
					test: /\.wasm$/i,
					type: "webassembly/sync"
				},
				options.experiments.asyncWebAssembly && {
					test: /\.wasm$/i,
					type: "webassembly/async"
				}
			].filter(Boolean)
		);

		this.set("output", "call", (value, options) => {
			if (typeof value === "string") {
				return {
					filename: value
				};
			} else if (typeof value !== "object") {
				return {};
			} else {
				return { ...value };
			}
		});

		this.set("output.filename", "[name].js");
		this.set(
			"output.module",
			"make",
			options => options.experiments.outputModule
		);
		this.set("output.iife", "make", options => !options.output.module);
		this.set("output.ecmaVersion", "call", value => {
			if (value) {
				return normalizeEcmaVersion(value);
			}

			return 6;
		});
		this.set("output.chunkFilename", "make", options => {
			const filename = options.output.filename;
			if (typeof filename !== "function") {
				const hasName = filename.includes("[name]");
				const hasId = filename.includes("[id]");
				const hasChunkHash = filename.includes("[chunkhash]");
				const hasContentHash = filename.includes("[contenthash]");
				// Anything changing depending on chunk is fine
				if (hasChunkHash || hasContentHash || hasName || hasId) return filename;
				// Elsewise prefix "[id]." in front of the basename to make it changing
				return filename.replace(/(^|\/)([^/]*(?:\?|$))/, "$1[id].$2");
			}
			return "[id].js";
		});
		this.set("output.assetModuleFilename", "[hash][ext]");
		this.set("output.webassemblyModuleFilename", "[hash].module.wasm");
		this.set("output.library", "");
		this.set("output.publicPath", "");
		this.set("output.compareBeforeEmit", true);
		this.set("output.hotUpdateFunction", "make", options => {
			return Template.toIdentifier(
				"webpackHotUpdate" + Template.toIdentifier(options.output.library)
			);
		});
		this.set("output.jsonpFunction", "make", options => {
			return Template.toIdentifier(
				"webpackJsonp" + Template.toIdentifier(options.output.library)
			);
		});
		this.set("output.chunkCallbackName", "make", options => {
			return Template.toIdentifier(
				"webpackChunk" + Template.toIdentifier(options.output.library)
			);
		});
		this.set("output.globalObject", "make", options => {
			switch (options.target) {
				case "web":
				case "electron-renderer":
				case "node-webkit":
					return "window";
				case "webworker":
					return "self";
				case "node":
				case "async-node":
				case "electron-main":
					return "global";
				default:
					return "self";
			}
		});
		this.set("output.devtoolNamespace", "make", options => {
			return getDevtoolNamespace(options.output.library);
		});
		this.set("output.libraryTarget", "make", options => {
			return options.output.module ? "module" : "var";
		});
		this.set("output.path", path.join(process.cwd(), "dist"));
		this.set(
			"output.pathinfo",
			"make",
			options => options.mode === "development"
		);
		this.set("output.sourceMapFilename", "[file].map[query]");
		this.set("output.hotUpdateChunkFilename", "[id].[fullhash].hot-update.js");
		this.set("output.hotUpdateMainFilename", "[fullhash].hot-update.json");
		this.set("output.crossOriginLoading", false);
		this.set("output.jsonpScriptType", "make", options => {
			return options.output.module ? "module" : false;
		});
		this.set("output.chunkLoadTimeout", 120000);
		this.set("output.hashFunction", "md4");
		this.set("output.hashDigest", "hex");
		this.set("output.hashDigestLength", 20);
		this.set("output.strictModuleExceptionHandling", false);

		this.set("node", "call", value => {
			if (typeof value === "boolean") {
				return value;
			} else {
				return { ...value };
			}
		});
		this.set("node.global", "make", options => {
			switch (options.target) {
				case "node":
				case "async-node":
				case "electron-main":
					return false;
				default:
					return true;
			}
		});
		this.set("node.__filename", "make", options => {
			switch (options.target) {
				case "node":
				case "async-node":
				case "electron-main":
					return false;
				default:
					return "mock";
			}
		});
		this.set("node.__dirname", "make", options => {
			switch (options.target) {
				case "node":
				case "async-node":
				case "electron-main":
					return false;
				default:
					return "mock";
			}
		});

		this.set("performance", "call", (value, options) => {
			if (value === false) return false;
			if (
				value === undefined &&
				(!isProductionLikeMode(options) || !isWebLikeTarget(options))
			)
				return false;
			return { ...value };
		});
		this.set("performance.maxAssetSize", 250000);
		this.set("performance.maxEntrypointSize", 250000);
		this.set("performance.hints", "make", options =>
			isProductionLikeMode(options) ? "warning" : false
		);

		this.set("optimization", "call", value => ({ ...value }));
		this.set("optimization.removeAvailableModules", false);
		this.set("optimization.removeEmptyChunks", true);
		this.set("optimization.mergeDuplicateChunks", true);
		this.set("optimization.flagIncludedChunks", "make", options =>
			isProductionLikeMode(options)
		);
		this.set("optimization.moduleIds", "make", options => {
			if (isProductionLikeMode(options)) return "deterministic";
			if (options.mode === "development") return "named";
			return "natural";
		});
		this.set("optimization.chunkIds", "make", options => {
			if (isProductionLikeMode(options)) return "deterministic";
			if (options.mode === "development") return "named";
			return "natural";
		});
		this.set("optimization.sideEffects", "make", options =>
			isProductionLikeMode(options)
		);
		this.set("optimization.providedExports", true);
		this.set("optimization.usedExports", "make", options =>
			isProductionLikeMode(options)
		);
		this.set("optimization.innerGraph", "make", options =>
			isProductionLikeMode(options)
		);
		this.set("optimization.mangleExports", "make", options =>
			isProductionLikeMode(options)
		);
		this.set("optimization.concatenateModules", "make", options =>
			isProductionLikeMode(options)
		);
		this.set("optimization.splitChunks", {});
		this.set("optimization.splitChunks.hidePathInfo", "make", options => {
			return isProductionLikeMode(options);
		});
		this.set("optimization.splitChunks.chunks", "async");
		this.set("optimization.splitChunks.minChunks", 1);
		this.set("optimization.splitChunks.minSize", "make", options => {
			return isProductionLikeMode(options) ? 30000 : 10000;
		});
		this.set("optimization.splitChunks.minRemainingSize", "make", options => {
			return options.mode === "development" ? 0 : undefined;
		});
		this.set("optimization.splitChunks.maxAsyncRequests", "make", options => {
			return isProductionLikeMode(options) ? 6 : Infinity;
		});
		this.set("optimization.splitChunks.automaticNameDelimiter", "-");
		this.set("optimization.splitChunks.maxInitialRequests", "make", options => {
			return isProductionLikeMode(options) ? 4 : Infinity;
		});
		this.set("optimization.splitChunks.cacheGroups", {});
		this.set("optimization.splitChunks.cacheGroups.default", {
			idHint: "",
			reuseExistingChunk: true,
			minChunks: 2,
			priority: -20
		});
		this.set("optimization.splitChunks.cacheGroups.defaultVendors", {
			idHint: "vendors",
			reuseExistingChunk: true,
			test: NODE_MODULES_REGEXP,
			priority: -10
		});
		this.set("optimization.runtimeChunk", "call", value => {
			if (value === "single") {
				return {
					name: "runtime"
				};
			}
			if (value === true || value === "multiple") {
				return {
					name: entrypoint => `runtime~${entrypoint.name}`
				};
			}
			return value;
		});
		this.set("optimization.noEmitOnErrors", "make", options =>
			isProductionLikeMode(options)
		);
		this.set("optimization.checkWasmTypes", "make", options =>
			isProductionLikeMode(options)
		);
		this.set("optimization.mangleWasmImports", false);
		this.set(
			"optimization.portableRecords",
			"make",
			options =>
				!!(
					options.recordsInputPath ||
					options.recordsOutputPath ||
					options.recordsPath
				)
		);
		this.set("optimization.minimize", "make", options =>
			isProductionLikeMode(options)
		);
		this.set("optimization.minimizer", "make", options => [
			{
				apply: compiler => {
					// Lazy load the Terser plugin
					const TerserPlugin = require("terser-webpack-plugin");
					new TerserPlugin().apply(compiler);
				}
			}
		]);
		this.set("optimization.nodeEnv", "make", options => {
			if (options.mode === "none") {
				return false;
			} else {
				return options.mode || "production";
			}
		});

		this.set("resolve", "call", value => ({ ...value }));
		this.set("resolve.cache", "make", options => !!options.cache);
		this.set("resolve.modules", ["node_modules"]);
		this.set("resolve.extensions", "make", options =>
			[options.experiments.mjs && ".mjs", ".js", ".json", ".wasm"].filter(
				Boolean
			)
		);
		this.set("resolve.mainFiles", ["index"]);
		this.set("resolve.aliasFields", "make", options => {
			if (
				options.target === "web" ||
				options.target === "webworker" ||
				options.target === "electron-renderer"
			) {
				return ["browser"];
			} else {
				return [];
			}
		});
		this.set("resolve.mainFields", "make", options => {
			if (
				options.target === "web" ||
				options.target === "webworker" ||
				options.target === "electron-renderer"
			) {
				return ["browser", "module", "main"];
			} else {
				return ["module", "main"];
			}
		});

		this.set("resolveLoader", "call", value => ({ ...value }));
		this.set("resolveLoader.cache", "make", options => !!options.cache);
		this.set("resolveLoader.mainFields", ["loader", "main"]);
		this.set("resolveLoader.extensions", [".js"]);
		this.set("resolveLoader.mainFiles", ["index"]);

		this.set("infrastructureLogging", "call", value =>
			Object.assign({}, value)
		);
		this.set("infrastructureLogging.level", "info");
		this.set("infrastructureLogging.debug", false);
	}
}

module.exports = WebpackOptionsDefaulter;
