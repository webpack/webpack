/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const OptionsDefaulter = require("./OptionsDefaulter");
const Template = require("./Template");

class WebpackOptionsDefaulter extends OptionsDefaulter {
	constructor() {
		super();
		this.set("devtool", "make", options => options.mode === "development" ? "eval" : false);
		this.set("cache", "make", options => options.mode === "development");

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
		this.set("module.unsafeCache", "make", options => !!options.cache);
		this.set("module.rules", []);
		this.set("module.defaultRules", [{
			type: "javascript/auto",
			resolve: {}
		}, {
			test: /\.mjs$/i,
			type: "javascript/esm",
			resolve: {
				extensions: [],
				enforceExtension: false
			}
		}, {
			test: /\.json$/i,
			type: "json",
		}, {
			test: /\.wasm$/i,
			type: "webassembly/experimental",
		}]);

		this.set("output", "call", (value, options) => {
			if(typeof value === "string") {
				return {
					filename: value
				};
			} else if(typeof value !== "object") {
				return {};
			} else {
				return Object.assign({}, value);
			}
		});
		this.set("output.filename", "[name].js");
		this.set("output.chunkFilename", "make", (options) => {
			const filename = options.output.filename;
			const hasName = filename.indexOf("[name]") >= 0;
			const hasChunkHash = filename.indexOf("[chunkhash]") >= 0;
			// Anything with [chunkhash] is already fine
			if(hasChunkHash) return filename;
			// Replace [name] with [id] because it doesn't require a name map
			if(hasName) return filename.replace("[name]", "[id]");
			// Prefix "[id]." in front of the basename
			return filename.replace(/(^|\/)([^/]*(?:\?|$))/, "$1[id].$2");
		});
		this.set("output.webassemblyModuleFilename", "[modulehash].module.wasm");
		this.set("output.library", "");
		this.set("output.hotUpdateFunction", "make", (options) => {
			return Template.toIdentifier("webpackHotUpdate" + options.output.library);
		});
		this.set("output.jsonpFunction", "make", (options) => {
			return Template.toIdentifier("webpackJsonp" + Template.toIdentifier(options.output.library));
		});
		this.set("output.devtoolNamespace", "make", (options) => {
			return options.output.library || "";
		});
		this.set("output.libraryTarget", "var");
		this.set("output.path", process.cwd());
		this.set("output.pathinfo", "make", options => options.mode === "development");
		this.set("output.sourceMapFilename", "[file].map[query]");
		this.set("output.hotUpdateChunkFilename", "[id].[hash].hot-update.js");
		this.set("output.hotUpdateMainFilename", "[hash].hot-update.json");
		this.set("output.crossOriginLoading", false);
		this.set("output.chunkLoadTimeout", 120000);
		this.set("output.hashFunction", "md5");
		this.set("output.hashDigest", "hex");
		this.set("output.hashDigestLength", 20);
		this.set("output.devtoolLineToLine", false);
		this.set("output.strictModuleExceptionHandling", false);

		this.set("node", "call", value => {
			if(typeof value === "boolean") {
				return value;
			} else {
				return Object.assign({}, value);
			}
		});
		this.set("node.console", false);
		this.set("node.process", true);
		this.set("node.global", true);
		this.set("node.Buffer", true);
		this.set("node.setImmediate", true);
		this.set("node.__filename", "mock");
		this.set("node.__dirname", "mock");

		this.set("performance", "make", options => options.mode !== "production" ? false : undefined);
		this.set("performance", "call", value => {
			if(typeof value === "boolean") {
				return value;
			} else {
				return Object.assign({}, value);
			}
		});
		this.set("performance.maxAssetSize", 250000);
		this.set("performance.maxEntrypointSize", 250000);
		this.set("performance.hints", "make", options => options.mode === "production" ? "warning" : false);

		this.set("optimization.removeAvailableModules", true);
		this.set("optimization.removeEmptyChunks", true);
		this.set("optimization.mergedDuplicateChunks", true);
		this.set("optimization.flagIncludedChunks", "make", options => options.mode === "production");
		this.set("optimization.occurrenceOrder", "make", options => options.mode === "production");
		this.set("optimization.sideEffects", "make", options => options.mode === "production");
		this.set("optimization.providedExports", true);
		this.set("optimization.usedExports", "make", options => options.mode === "production");
		this.set("optimization.concatenateModules", "make", options => options.mode === "production");
		this.set("optimization.noEmitOnErrors", "make", options => options.mode === "production");
		this.set("optimization.namedModules", "make", options => options.mode === "development");
		this.set("optimization.namedChunks", "make", options => options.mode === "development");
		this.set("optimization.portableRecords", "make", options => !!(options.recordsInputPath || options.recordsOutputPath || options.recordsPath));
		this.set("optimization.nodeEnv", "make", options => options.mode);

		this.set("resolve", "call", value => Object.assign({}, value));
		this.set("resolve.unsafeCache", true);
		this.set("resolve.modules", ["node_modules"]);
		this.set("resolve.extensions", [".wasm", ".mjs", ".js", ".json"]);
		this.set("resolve.mainFiles", ["index"]);
		this.set("resolve.aliasFields", "make", (options) => {
			if(options.target === "web" || options.target === "webworker")
				return ["browser"];
			else
				return [];
		});
		this.set("resolve.mainFields", "make", (options) => {
			if(options.target === "web" || options.target === "webworker")
				return ["browser", "module", "main"];
			else
				return ["module", "main"];
		});
		this.set("resolve.cacheWithContext", "make", (options) => {
			return Array.isArray(options.resolve.plugins) && options.resolve.plugins.length > 0;
		});

		this.set("resolveLoader", "call", value => Object.assign({}, value));
		this.set("resolveLoader.unsafeCache", true);
		this.set("resolveLoader.mainFields", ["loader", "main"]);
		this.set("resolveLoader.extensions", [".js", ".json"]);
		this.set("resolveLoader.mainFiles", ["index"]);
		this.set("resolveLoader.cacheWithContext", "make", (options) => {
			return Array.isArray(options.resolveLoader.plugins) && options.resolveLoader.plugins.length > 0;
		});
	}
}

module.exports = WebpackOptionsDefaulter;
