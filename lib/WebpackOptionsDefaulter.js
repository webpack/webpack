/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var OptionsDefaulter = require("webpack-core/lib/OptionsDefaulter");

function WebpackOptionsDefaulter() {
	OptionsDefaulter.call(this);
	this.set("debug", false);
	this.set("devtool", false);
	this.set("cache", true);

	this.set("context", process.cwd());
	this.set("target", "web");
	this.set("output", {});
	this.set("node", {});
	this.set("resolve", {});
	this.set("resolveLoader", {});

	this.set("module.unknownContextRequest", ".");
	this.set("module.unknownContextRecursive", true);
	this.set("module.unknownContextRegExp", /^\.\/.*$/);
	this.set("module.unknownContextCritical", true);
	this.set("module.exprContextRequest", ".");
	this.set("module.exprContextRegExp", /^\.\/.*$/);
	this.set("module.exprContextRecursive", true);
	this.set("module.exprContextCritical", true);
	this.set("module.wrappedContextRegExp", /.*/);
	this.set("module.wrappedContextRecursive", true);
	this.set("module.wrappedContextCritical", false);

	this.set("output.libraryTarget", "var");
	this.set("output.path", "");
	this.set("output.sourceMapFilename", "[file].map[query]");
	this.set("output.hotUpdateChunkFilename", "[id].[hash].hot-update.js");
	this.set("output.hotUpdateMainFilename", "[hash].hot-update.json");
	this.set("output.hashFunction", "md5");
	this.set("output.hashDigest", "hex");
	this.set("output.hashDigestLength", 20);
	this.set("output.sourcePrefix", "\t");

	this.set("node.console", false);
	this.set("node.process", true);
	this.set("node.global", true);
	// TODO: add this in next major version
	// this.set("node.Buffer", true);
	this.set("node.setImmediate", true);
	this.set("node.__filename", "mock");
	this.set("node.__dirname", "mock");

	this.set("resolve.fastUnsafe", []);
	this.set("resolveLoader.fastUnsafe", []);

	this.set("resolve.alias", {});
	this.set("resolveLoader.alias", {});

	this.set("optimize.occurenceOrderPreferEntry", true);
}
module.exports = WebpackOptionsDefaulter;

WebpackOptionsDefaulter.prototype = Object.create(OptionsDefaulter.prototype);

WebpackOptionsDefaulter.prototype.constructor = WebpackOptionsDefaulter;

WebpackOptionsDefaulter.prototype.process = function(options) {
	OptionsDefaulter.prototype.process.call(this, options);

	if(options.resolve.packageAlias === undefined) {
		if(options.target === "web" || options.target === "webworker")
			options.resolve.packageAlias = "browser";
	}

	function defaultByTarget(value, web, webworker, node, nodeWebkit, def) {
		if(value !== undefined) return value;
		switch(options.target) {
		case "web": return web;
		case "webworker": return webworker;
		case "node": case "async-node": return node;
		case "node-webkit": return nodeWebkit;
		default: return def;
		}
	}

	options.resolve.modulesDirectories = defaultByTarget(options.resolve.modulesDirectories,
		["web_modules", "node_modules"],
		["webworker_modules", "web_modules", "node_modules"],
		["node_modules"],
		["node_modules", "web_modules"],
		["node_modules"]);

	options.resolveLoader.modulesDirectories = defaultByTarget(options.resolveLoader.modulesDirectories,
		["web_loaders", "web_modules", "node_loaders", "node_modules"],
		["webworker_loaders", "web_loaders", "web_modules", "node_loaders", "node_modules"],
		["node_loaders", "node_modules"],
		["node_loaders", "web_loaders", "node_modules", "web_modules"],
		["node_modules"]);

	options.resolve.packageMains = defaultByTarget(options.resolve.packageMains,
		["webpack", "browser", "web", "browserify", ["jam", "main"], "main"],
		["webpackWorker", "webworker", "webpack", "browser", "web", "browserify", ["jam", "main"], "main"],
		["webpackNode", "node", "main"],
		["webpackNodeWebkit", "webpackNode", "node", "main", "web"],
		["main"]);

	options.resolve.packageAlias = defaultByTarget(options.resolve.packageAlias,
		"browser",
		"browser",
		false,
		"node-webkit",
		false);

	options.resolveLoader.packageMains = defaultByTarget(options.resolveLoader.packageMains,
		["webpackLoader", "webLoader", "loader", "main"],
		["webpackWorkerLoader", "webworkerLoader", "webLoader", "loader", "main"],
		["webpackNodeLoader", "nodeLoader", "loader", "main"],
		["webpackNodeWebkitLoader", "webpackNodeLoader", "nodeLoader", "loader", "webLoader", "main"],
		["loader", "main"]);

	options.resolve.extensions = defaultByTarget(options.resolve.extensions,
		["", ".webpack.js", ".web.js", ".js", ".json"],
		["", ".webpack-worker.js", ".webworker.js", ".web.js", ".js", ".json"],
		["", ".webpack-node.js", ".js", ".json", ".node"],
		["", ".webpack-node-webkit.js", ".webpack-node.js", ".js", ".json", ".node", ".web.js"],
		["", ".js", ".json"]);

	options.resolveLoader.extensions = defaultByTarget(options.resolveLoader.extensions,
		["", ".webpack-loader.js", ".web-loader.js", ".loader.js", ".js"],
		["", ".webpack-worker-loader.js", ".webpack-loader.js", ".webworker-loader.js", ".web-loader.js", ".loader.js", ".js"],
		["", ".webpack-node-loader.js", ".loader.js", ".js"],
		["", ".webpack-node-webkit-loader.js", ".webpack-node-loader.js", ".loader.js", ".web-loader.js", ".js"],
		["", ".js"]);

	options.resolveLoader.moduleTemplates = defaultByTarget(options.resolveLoader.moduleTemplates,
		["*-webpack-loader", "*-web-loader", "*-loader", "*"],
		["*-webpack-worker-loader", "*-webworker-loader", "*-web-loader", "*-loader", "*"],
		["*-webpack-node-loader", "*-node-loader", "*-loader", "*"],
		["*-webpack-node-webkit-loader", "*-webpack-node-loader", "*-node-loader", "*-loader", "*-web-loader", "*"],
		["*-loader", "*"]);
};
