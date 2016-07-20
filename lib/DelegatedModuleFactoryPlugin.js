/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var DelegatedModule = require("./DelegatedModule");

// options.source
// options.type
// options.context
// options.scope
// options.content
function DelegatedModuleFactoryPlugin(options) {
	this.options = options;
	options.type = options.type || "require";
	options.extensions = options.extensions || ["", ".js"];
}
module.exports = DelegatedModuleFactoryPlugin;

DelegatedModuleFactoryPlugin.prototype.apply = function(normalModuleFactory) {
	var scope = this.options.scope;
	if(scope) {
		normalModuleFactory.plugin("factory", function(factory) {
			return function(data, callback) {
				var dependency = data.dependencies[0];
				var request = dependency.request;
				if(request && request.indexOf(scope + "/") === 0) {
					var innerRequest = "." + request.substr(scope.length);
					for(var i = 0; i < this.options.extensions.length; i++) {
						var requestPlusExt = innerRequest + this.options.extensions[i];
						if(requestPlusExt in this.options.content) {
							var resolved = this.options.content[requestPlusExt];
							return callback(null, new DelegatedModule(this.options.source, resolved, this.options.type, requestPlusExt));
						}
					}
				}
				return factory(data, callback);
			}.bind(this);
		}.bind(this));
	} else {
		normalModuleFactory.plugin("module", function(module) {
			if(module.libIdent) {
				var request = module.libIdent(this.options);
				if(request && request in this.options.content) {
					var resolved = this.options.content[request];
					return new DelegatedModule(this.options.source, resolved, this.options.type, request);
				}
			}
			return module;
		}.bind(this));
	}
};
