/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { join, dirname } = require("./util/fs");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./NormalModuleFactory").ResolveData} ResolveData */
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
				nmf.hooks.beforeResolve.tap(
					"NormalModuleReplacementPlugin",
					/** @type {(resolveData: ResolveData) => void} */ resolveData => {
						if (resourceRegExp.test(resolveData.request)) {
							if (typeof newResource === "function") {
								newResource(resolveData);
							} else {
								resolveData.request = newResource;
							}
						}
					}
				);
				nmf.hooks.afterResolve.tap(
					"NormalModuleReplacementPlugin",
					/** @type {(resolveData: ResolveData) => void} */ resolveData => {
						const createData = resolveData.createData;
						if (resourceRegExp.test(createData.resource)) {
							if (typeof newResource === "function") {
								newResource(resolveData);
							} else {
								const fs = compiler.inputFileSystem;
								if (
									newResource.startsWith("/") ||
									(newResource.length > 1 && newResource[1] === ":")
								) {
									createData.resource = newResource;
								} else {
									createData.resource = join(
										fs,
										dirname(fs, createData.resource),
										newResource
									);
								}
							}
						}
					}
				);
			}
		);
	}
}

module.exports = NormalModuleReplacementPlugin;
