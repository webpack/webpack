/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var OptionsDefaulter = require("./OptionsDefaulter");
var path = require("path");

function WebpackOptionsDefaulter(str) {
	OptionsDefaulter.call(this);
	this.set("debug", false);
	this.set("devtool", false);
	this.set("minimize", true);
	
	this.set("context", process.cwd());
	this.set("output", {});
	this.set("optimize", {});
	this.set("resolve", {});
	this.set("resolveLoader", {});
	
	this.set("output.libraryTarget", "var");
	this.set("output.path", "");

	this.set("resolve.modulesDirectories", ["web_modules", "node_modules"]);
	this.set("resolveLoader.modulesDirectories", ["web_loaders", "web_modules", "node_loaders", "node_modules"]);

	this.set("resolveLoader.moduleTemplates", ["*-webpack-loader", "*-web-loader", "*-loader", "*"]);

	this.set("resolve.alias", {});
	this.set("resolveLoader.alias", {});
	
	this.set("resolve.extensions", ["", ".webpack.js", ".web.js", ".js"]);
	this.set("resolveLoader.extensions", ["", ".webpack-loader.js", ".web-loader.js", ".loader.js", ".js"]);

	this.set("resolve.packageMains", ["webpack", "browser", "web", "main"]);
	this.set("resolveLoader.packageMains", ["webpackLoader", "webLoader", "loader", "main"]);
}
module.exports = WebpackOptionsDefaulter;

WebpackOptionsDefaulter.prototype = Object.create(OptionsDefaulter.prototype);
