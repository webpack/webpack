/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const DelegatedModule = require("./DelegatedModule");

// options.source
// options.type
// options.context
// options.scope
// options.content
class DelegatedModuleFactoryPlugin {
	constructor(options) {
		this.options = options;
		options.type = options.type || "require";
		options.extensions = options.extensions || ["", ".js"];
	}

	apply(normalModuleFactory) {
		const scope = this.options.scope;
		if(scope) {
			normalModuleFactory.plugin("factory", factory => (data, callback) => {
				const dependency = data.dependencies[0];
				const request = dependency.request;
				if(request && request.indexOf(scope + "/") === 0) {
					const innerRequest = "." + request.substr(scope.length);
					let resolved;
					if(innerRequest in this.options.content) {
						resolved = this.options.content[innerRequest];
						return callback(null, new DelegatedModule(this.options.source, resolved, this.options.type, innerRequest));
					}
					for(let i = 0; i < this.options.extensions.length; i++) {
						const requestPlusExt = innerRequest + this.options.extensions[i];
						if(requestPlusExt in this.options.content) {
							resolved = this.options.content[requestPlusExt];
							return callback(null, new DelegatedModule(this.options.source, resolved, this.options.type, requestPlusExt));
						}
					}
				}
				return factory(data, callback);
			});
		} else {
			normalModuleFactory.plugin("module", module => {
				if(module.libIdent) {
					const request = module.libIdent(this.options);
					if(request && request in this.options.content) {
						const resolved = this.options.content[request];
						return new DelegatedModule(this.options.source, resolved, this.options.type, request);
					}
				}
				return module;
			});
		}
	}
}
module.exports = DelegatedModuleFactoryPlugin;
