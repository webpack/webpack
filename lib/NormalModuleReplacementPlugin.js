/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {function(TODO): void} ModuleReplacer */

class NormalModuleReplacementPlugin {
	/**
	 * Create an instance of the plugin
	 * @param {RegExp} resourceRegExp the resource matcher
	 * @param {string|ModuleReplacer} newResource the resource replacement
	 */
	constructor(resourceRegExp, newResource) {
		this.resourceRegExp = resourceRegExp;
		this.newResource = newResource;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const resourceRegExp = this.resourceRegExp;
		const newResource = this.newResource;
		compiler.hooks.normalModuleFactory.tap(
			"NormalModuleReplacementPlugin",
			nmf => {
				nmf.hooks.beforeResolve.tap("NormalModuleReplacementPlugin", result => {
					if (resourceRegExp.test(result.request)) {
						if (typeof newResource === "function") {
							newResource(result);
						} else {
							result.request = newResource;
						}
					}
					return result;
				});
				nmf.hooks.afterResolve.tap("NormalModuleReplacementPlugin", result => {
					const createData = result.createData;
					if (resourceRegExp.test(createData.resource)) {
						if (typeof newResource === "function") {
							newResource(result);
						} else {
							createData.resource = path.resolve(
								path.dirname(createData.resource),
								newResource
							);
						}
					}
					return result;
				});
			}
		);
	}
}

module.exports = NormalModuleReplacementPlugin;
