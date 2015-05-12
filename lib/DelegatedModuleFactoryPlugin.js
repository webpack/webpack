/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var DelegatedModule = require("./DelegatedModule");
var path = require("path");

function DelegatedModuleFactoryPlugin(options) {
	this.options = options;
	options.type = options.type || "require";
	// this.source = source;
	// this.type = type;
	// this.scope = scope;
	// this.context = context;
	// this.content = content;
}
module.exports = DelegatedModuleFactoryPlugin;

DelegatedModuleFactoryPlugin.prototype.apply = function(normalModuleFactory) {
	normalModuleFactory.plugin("create-module", function(data) {
		var request = DelegatedModuleFactoryPlugin.contextify(this.options.context, data.userRequest);
		if(request in this.options.content) {
			var resolved = this.options.content[request];
			return new DelegatedModule(this.options.source, resolved, this.options.type);
		}
	}.bind(this));
};

DelegatedModuleFactoryPlugin.contextify = function(context, request) {
	return request.split("!").map(function(r) {
		var rp = path.relative(context, r);
		if(path.sep === "\\")
			rp = rp.replace(/\\/g, "/");
		if(rp.indexOf("../") !== 0)
			rp = "./" + rp;
		return rp;
	}).join("!");
};
