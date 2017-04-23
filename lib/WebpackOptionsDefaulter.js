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

		this
			.set("devtool", false)
			.set("cache", true)

			.set("context", process.cwd())
			.set("target", "web")

			.set("module.unknownContextRequest", ".")
			.set("module.unknownContextRegExp", false)
			.set("module.unknownContextRecursive", true)
			.set("module.unknownContextCritical", true)
			.set("module.exprContextRequest", ".")
			.set("module.exprContextRegExp", false)
			.set("module.exprContextRecursive", true)
			.set("module.exprContextCritical", true)
			.set("module.wrappedContextRegExp", /.*/)
			.set("module.wrappedContextRecursive", true)
			.set("module.wrappedContextCritical", false)
			.set("module.strictExportPresence", false)

			.set("module.unsafeCache", true)

			.set("output", "call", (value, options) => {
				if(typeof value === "string") {
					return {
						filename: value
					};
				} else if(typeof value !== "object") {
					return {};
				} else {
					return value;
				}
			})
			.set("output.filename", "[name].js")
			.set("output.chunkFilename", "make", (options) => {
				const filename = options.output.filename;
				return filename.indexOf("[name]") >= 0 ? filename.replace("[name]", "[id]") : "[id]." + filename;
			})
			.set("output.library", "")
			.set("output.hotUpdateFunction", "make", (options) => {
				return Template.toIdentifier("webpackHotUpdate" + options.output.library);
			})
			.set("output.jsonpFunction", "make", (options) => {
				return Template.toIdentifier("webpackJsonp" + options.output.library);
			})
			.set("output.libraryTarget", "var")
			.set("output.path", process.cwd())
			.set("output.sourceMapFilename", "[file].map[query]")
			.set("output.hotUpdateChunkFilename", "[id].[hash].hot-update.js")
			.set("output.hotUpdateMainFilename", "[hash].hot-update.json")
			.set("output.crossOriginLoading", false)
			.set("output.hashFunction", "md5")
			.set("output.hashDigest", "hex")
			.set("output.hashDigestLength", 20)
			.set("output.devtoolLineToLine", false)
			.set("output.strictModuleExceptionHandling", false)

			.set("node", {})
			.set("node.console", false)
			.set("node.process", true)
			.set("node.global", true)
			.set("node.Buffer", true)
			.set("node.setImmediate", true)
			.set("node.__filename", "mock")
			.set("node.__dirname", "mock")

			.set("performance.maxAssetSize", 250000)
			.set("performance.maxEntrypointSize", 250000)
			.set("performance.hints", false)

			.set("resolve", {})
			.set("resolve.unsafeCache", true)
			.set("resolve.modules", ["node_modules"])
			.set("resolve.extensions", [".js", ".json"])
			.set("resolve.aliasFields", "make", (options) => {
				if(options.target === "web" || options.target === "webworker")
					return ["browser"];
				else
				return [];
			})
			.set("resolve.mainFields", "make", (options) => {
				if(options.target === "web" || options.target === "webworker")
					return ["browser", "module", "main"];
				else
				return ["module", "main"];
			})
			.set("resolveLoader", {})
			.set("resolveLoader.unsafeCache", true)
			.set("resolveLoader.mainFields", ["loader", "main"])
			.set("resolveLoader.extensions", [".js", ".json"]);
	}
}

module.exports = WebpackOptionsDefaulter;
