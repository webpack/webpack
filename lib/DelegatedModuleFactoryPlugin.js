/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const DelegatedModule = require("./DelegatedModule");

const REG_END_SLASH = /\/$/;

// options.source
// options.type
// options.context
// options.scope
// options.content
class DelegatedModuleFactoryPlugin {
	constructor(options) {
		this.options = options;
		options.type = options.type || "require";
		options.extensions = options.extensions || [
			"",
			".wasm",
			".mjs",
			".js",
			".json"
		];
	}

	resolveFromScope(request, scope, content, extensions) {
		if (!request || request.indexOf(scope + "/") !== 0) return null;
		let innerRequest = "." + request.substr(scope.length);
		const resolved = {
			userRequest: innerRequest,
			originalRequest: request
		};
		if (resolved.userRequest in content) return resolved;
		for (let i = 0; i < extensions.length; i++) {
			const extension = extensions[i];
			resolved.userRequest = innerRequest + extension;
			resolved.originalRequest = request + extension;
			if (resolved.userRequest in content) return resolved;
			// try to resolve /index.*
			resolved.userRequest =
				innerRequest.replace(REG_END_SLASH, "") + "/index" + extension;
			resolved.originalRequest =
				request.replace(REG_END_SLASH, "") + "/index" + extension;
			if (resolved.userRequest in content) return resolved;
		}
		return null;
	}

	apply(normalModuleFactory) {
		const { scope, content, extensions } = this.options;
		if (scope) {
			normalModuleFactory.hooks.factory.tap(
				"DelegatedModuleFactoryPlugin",
				factory => (data, callback) => {
					const dependency = data.dependencies[0];
					const resolved = this.resolveFromScope(
						dependency.request,
						scope,
						content,
						extensions
					);
					if (resolved) {
						return callback(
							null,
							new DelegatedModule(
								this.options.source,
								content[resolved.userRequest],
								this.options.type,
								resolved.userRequest,
								resolved.originalRequest
							)
						);
					}
					return factory(data, callback);
				}
			);
		} else {
			normalModuleFactory.hooks.module.tap(
				"DelegatedModuleFactoryPlugin",
				module => {
					if (module.libIdent) {
						const request = module.libIdent(this.options);
						if (request && request in content) {
							const resolved = content[request];
							return new DelegatedModule(
								this.options.source,
								resolved,
								this.options.type,
								request,
								module
							);
						}
					}
					return module;
				}
			);
		}
	}
}
module.exports = DelegatedModuleFactoryPlugin;
