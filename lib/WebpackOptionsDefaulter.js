/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var OptionsDefaulter = require("./OptionsDefaulter");

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

	this.set("output.libraryTarget", "var");
	this.set("output.path", "");
	this.set("output.sourceMapFilename", "[file].map[query]");
	this.set("output.hotUpdateChunkFilename", "[id].[hash].hot-update.js");
	this.set("output.hotUpdateMainFilename", "[hash].hot-update.json");
	this.set("output.crossOriginLoading", false);
	this.set("output.hashFunction", "md5");
	this.set("output.hashDigest", "hex");
	this.set("output.hashDigestLength", 20);
	this.set("output.sourcePrefix", "\t");
	this.set("output.devtoolLineToLine", false);

	this.set("node.console", false);
	this.set("node.process", true);
	this.set("node.global", true);
	this.set("node.Buffer", true);
	this.set("node.setImmediate", true);
	this.set("node.__filename", "mock");
	this.set("node.__dirname", "mock");

	this.set("resolve.modules", ["node_modules"])
	this.set("resolve.extensions", [".js", ".json"])
	this.set("resolveLoader.mainFields", ["loader", "main"])
	this.set("resolveLoader.extensions", [".js", ".json"])
	this.set("resolveLoader.moduleExtensions", ["-loader"])
}
module.exports = WebpackOptionsDefaulter;

WebpackOptionsDefaulter.prototype = Object.create(OptionsDefaulter.prototype);

WebpackOptionsDefaulter.prototype.constructor = WebpackOptionsDefaulter;

WebpackOptionsDefaulter.prototype.process = function(options) {
	OptionsDefaulter.prototype.process.call(this, options);

	if(options.resolve.aliasFields === undefined) {
		if(options.target === "web" || options.target === "webworker")
			options.resolve.aliasFields = ["browser"];
	}

	if(options.resolve.mainFields === undefined) {
		if(options.target === "web" || options.target === "webworker")
			options.resolve.mainFields = ["browser", "web", "browserify", "main"];
		else
			options.resolve.mainFields = ["main"];
	}
};
