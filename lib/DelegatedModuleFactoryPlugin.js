/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var DelegatedModule = require("./DelegatedModule");

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
	normalModuleFactory.plugin("module", function(module) {
		if(module.libIdent) {
			var request = module.libIdent(this.options);
			if(request && request in this.options.content) {
				var resolved = this.options.content[request];
				return new DelegatedModule(this.options.source, resolved, this.options.type);
			}
		}
		return module;
	}.bind(this));
};
