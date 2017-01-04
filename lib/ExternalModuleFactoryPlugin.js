"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ExternalModule = require("./ExternalModule");
class ExternalModuleFactoryPlugin {
	constructor(type, externals) {
		this.type = type;
		this.externals = externals;
	}

	apply(normalModuleFactory) {
		const globalType = this.type;
		normalModuleFactory.plugin("factory", factory => (data, outterCallback) => {
			const context = data.context;
			const dependency = data.dependencies[0];

			function handleExternal(value, type, externalCallback) {
				if(typeof type === "function") {
					externalCallback = type;
					type = undefined;
				}
				if(value === false) {
					return factory(data, externalCallback);
				}
				if(value === true) {
					value = dependency.request;
				}
				if(typeof type === "undefined" && typeof value === "string" && /^[a-z0-9]+ /.test(value)) {
					const idx = value.indexOf(" ");
					type = value.substr(0, idx);
					value = value.substr(idx + 1);
				}
				externalCallback(null, new ExternalModule(value, type || globalType));
				return true;
			}

			// todo: need to be refactor
			(function handleExternals(externals, innerCallback) {
				if(typeof externals === "string") {
					if(externals === dependency.request) {
						return handleExternal(dependency.request, innerCallback);
					}
				} else if(Array.isArray(externals)) {
					let i = 0;
					(function next() {
						let async;
						do {
							async = true;
							if(i >= externals.length) {
								return innerCallback();
							}
							handleExternals(externals[i++], (err, module) => {
								if(err) {
									return innerCallback(err);
								}
								if(!module) {
									if(async) {
										async = false;
										return;
									}
									return next();
								}
								innerCallback(null, module);
							});
						}
						while(!async);
						async = false;
					})();
					return;
				} else if(externals instanceof RegExp) {
					if(externals.test(dependency.request)) {
						return handleExternal(dependency.request, innerCallback);
					}
				} else if(typeof externals === "function") {
					externals.call(null, context, dependency.request, (err, value, type) => {
						if(err) {
							return innerCallback(err);
						}
						if(typeof value !== "undefined") {
							handleExternal(value, type, innerCallback);
						} else {
							innerCallback();
						}
					});
					return;
				} else if(typeof externals === "object" && Object.prototype.hasOwnProperty.call(externals, dependency.request)) {
					return handleExternal(externals[dependency.request], innerCallback);
				}
				innerCallback();
			})(this.externals, (err, module) => {
				if(err) {
					return outterCallback(err);
				}
				if(!module) {
					return handleExternal(false, outterCallback);
				}
				return outterCallback(null, module);
			});
		});
	}
}
module.exports = ExternalModuleFactoryPlugin;
