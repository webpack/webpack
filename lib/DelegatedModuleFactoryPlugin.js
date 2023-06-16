/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const DelegatedModule = require("./DelegatedModule");

/** @typedef {import("./NormalModuleFactory")} NormalModuleFactory */

// options.source
// options.type
// options.context
// options.scope
// options.content
// options.associatedObjectForCache
class DelegatedModuleFactoryPlugin {
	constructor(options) {
		this.options = options;
		options.type = options.type || "require";
		options.extensions = options.extensions || ["", ".js", ".json", ".wasm"];
	}

	/**
	 * @param {NormalModuleFactory} normalModuleFactory the normal module factory
	 * @returns {void}
	 */
	apply(normalModuleFactory) {
		const scope = this.options.scope;
		if (scope) {
			normalModuleFactory.hooks.factorize.tapAsync(
				"DelegatedModuleFactoryPlugin",
				(data, callback) => {
					const [dependency] = data.dependencies;
					const { request } = dependency;
					if (request && request.startsWith(`${scope}/`)) {
						const innerRequest = "." + request.slice(scope.length);
						let resolved;
						if (innerRequest in this.options.content) {
							resolved = this.options.content[innerRequest];
							return callback(
								null,
								new DelegatedModule(
									this.options.source,
									resolved,
									this.options.type,
									innerRequest,
									request
								)
							);
						}
						for (let i = 0; i < this.options.extensions.length; i++) {
							const extension = this.options.extensions[i];
							const requestPlusExt = innerRequest + extension;
							if (requestPlusExt in this.options.content) {
								resolved = this.options.content[requestPlusExt];
								return callback(
									null,
									new DelegatedModule(
										this.options.source,
										resolved,
										this.options.type,
										requestPlusExt,
										request + extension
									)
								);
							}
						}
					}
					return callback();
				}
			);
		} else {
			normalModuleFactory.hooks.module.tap(
				"DelegatedModuleFactoryPlugin",
				module => {
					const request = module.libIdent(this.options);
					if (request) {
						if (request in this.options.content) {
							const resolved = this.options.content[request];
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
