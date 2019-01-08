/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");
const OptionsDefaulter = require("./OptionsDefaulter");
const Template = require("./Template");

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

		this.set("entry", "./src");

		this.set(
			"devtool",
			"make",
			options => (options.mode === "development" ? "eval" : false)
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
			value = Object.assign({}, value);
			if (value.type === "filesystem") {
				if (value.name === undefined) {
					value.name =
						(options.name || "default") + "-" + (options.mode || "production");
				}
			}
			return value;
		});

		this.set("context", process.cwd());
		this.set("target", "web");

		this.set("module", "call", value => Object.assign({}, value));
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
		this.set("module.defaultRules", "make", options => [
			{
				type: "javascript/auto",
				resolve: {}
			},
			{
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
			{
				test: /\.wasm$/i,
				type: "webassembly/experimental"
			}
		]);

		this.set("output", "call", (value, options) => {
			if (typeof value === "string") {
				return {
					filename: value
				};
			} else if (typeof value !== "object") {
				return {};
			} else {
				return Object.assign({}, value);
			}
		});

		this.set("output.filename", "[name].js");
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
		this.set("output.webassemblyModuleFilename", "[hash].module.wasm");
		this.set("output.library", "");
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
		this.set("output.libraryTarget", "var");
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
		this.set("output.jsonpScriptType", false);
		this.set("output.chunkLoadTimeout", 120000);
		this.set("output.hashFunction", "md4");
		this.set("output.hashDigest", "hex");
		this.set("output.hashDigestLength", 20);
		this.set("output.strictModuleExceptionHandling", false);

		this.set("node", "call", value => {
			if (typeof value === "boolean") {
				return value;
			} else {
				return Object.assign({}, value);
			}
		});
		this.set("node.global", true);
		this.set("node.__filename", "mock");
		this.set("node.__dirname", "mock");

		this.set("performance", "call", (value, options) => {
			if (value === false) return false;
			if (
				value === undefined &&
				(!isProductionLikeMode(options) || !isWebLikeTarget(options))
			)
				return false;
			return Object.assign({}, value);
		});
		this.set("performance.maxAssetSize", 250000);
		this.set("performance.maxEntrypointSize", 250000);
		this.set(
			"performance.hints",
			"make",
			options => (isProductionLikeMode(options) ? "warning" : false)
		);

		this.set("optimization", "call", value => Object.assign({}, value));
		this.set("optimization.removeAvailableModules", true);
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
					const SourceMapDevToolPlugin = require("./SourceMapDevToolPlugin");
					new TerserPlugin({
						cache: true,
						parallel: true,
						sourceMap:
							(options.devtool && /source-?map/.test(options.devtool)) ||
							(options.plugins &&
								options.plugins.some(p => p instanceof SourceMapDevToolPlugin))
					}).apply(compiler);
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

		this.set("resolve", "call", value => Object.assign({}, value));
		this.set("resolve.cache", "make", options => !!options.cache);
		this.set("resolve.modules", ["node_modules"]);
		this.set("resolve.extensions", [".mjs", ".js", ".json", ".wasm"]);
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

		this.set("resolveLoader", "call", value => Object.assign({}, value));
		this.set("resolveLoader.cache", "make", options => !!options.cache);
		this.set("resolveLoader.mainFields", ["loader", "main"]);
		this.set("resolveLoader.extensions", [".js", ".json"]);
		this.set("resolveLoader.mainFiles", ["index"]);
	}
}

module.exports = WebpackOptionsDefaulter;
