/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var OptionsDefaulter = require("webpack-core/lib/OptionsDefaulter");

function WebpackOptionsDefaulter() {
	OptionsDefaulter.call(this);
	this.set("debug", false);
	this.set("devtool", false);

	this.set("context", process.cwd());
	this.set("target", "web");
	this.set("output", {});
	this.set("node", {});
	this.set("optimize", {});
	this.set("resolve", {});
	this.set("resolveLoader", {});

	this.set("output.libraryTarget", "var");
	this.set("output.path", "");
	this.set("output.sourceMapFilename", "[file].map");
	this.set("output.hashFunction", "md5");
	this.set("output.hashDigest", "hex");
	this.set("output.hashDigestLength", 20);

	this.set("node.console", false);
	this.set("node.process", true);
	this.set("node.global", true);
	this.set("node.buffer", true);
	this.set("node.__filename", "mock");
	this.set("node.__dirname", "mock");

	this.set("resolve.modulesDirectories", ["web_modules", "node_modules"]);
	this.set("resolveLoader.modulesDirectories", ["web_loaders", "web_modules", "node_loaders", "node_modules"]);

	this.set("resolveLoader.moduleTemplates", ["*-webpack-loader", "*-web-loader", "*-loader", "*"]);

	this.set("resolve.alias", {});
	this.set("resolveLoader.alias", {});

	this.set("resolve.extensions", ["", ".webpack.js", ".web.js", ".js"]);
	this.set("resolveLoader.extensions", ["", ".webpack-loader.js", ".web-loader.js", ".loader.js", ".js"]);

	this.set("resolve.packageMains", ["webpack", "browser", "web", "main"]);
	this.set("resolveLoader.packageMains", ["webpackLoader", "webLoader", "loader", "main"]);

	this.set("optimize.occurenceOrderPreferEntry", true);
}
module.exports = WebpackOptionsDefaulter;

WebpackOptionsDefaulter.prototype = Object.create(OptionsDefaulter.prototype);
