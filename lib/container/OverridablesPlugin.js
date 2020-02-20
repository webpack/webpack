/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleNotFoundError = require("../ModuleNotFoundError");
const RuntimeGlobals = require("../RuntimeGlobals");
const OverridableModule = require("./OverridableModule");
const OverridableOriginalDependency = require("./OverridableOriginalDependency");
const OverridableOriginalModuleFactory = require("./OverridableOriginalModuleFactory");
const OverridablesRuntimeModule = require("./OverridablesRuntimeModule");

/** @typedef {import("../Compiler")} Compiler */

const parseOptions = (prefix, options, result) => {
	if (Array.isArray(options)) {
		for (const item of options) {
			parseOptions(prefix, item, result);
		}
	} else if (typeof options === "string") {
		result.push([prefix + options.replace(/^([^\w]+\/)+/, ""), options]);
	} else if (options && typeof options === "object") {
		for (const key of Object.keys(options)) {
			const value = options[key];
			if (typeof value === "string") {
				result.push([prefix + key, value]);
			} else {
				parseOptions(prefix + key + "/", value, result);
			}
		}
	}
};

class OverridablesPlugin {
	constructor(options) {
		this.overridables = [];
		parseOptions("", options, this.overridables);
	}
	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"OverridablesPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					OverridableOriginalDependency,
					new OverridableOriginalModuleFactory()
				);

				const resolvedOverridables = new Map();
				const promise = Promise.all(
					this.overridables.map(([key, request]) => {
						const resolver = compilation.resolverFactory.get("normal");
						return new Promise((resolve, reject) => {
							resolver.resolve(
								{},
								compiler.context,
								request,
								{},
								(err, result) => {
									if (err) {
										compilation.errors.push(
											new ModuleNotFoundError(null, err, {
												name: `overridable ${key}`
											})
										);
										return resolve();
									}
									resolvedOverridables.set(result, key);
									resolve();
								}
							);
						});
					})
				);
				normalModuleFactory.hooks.afterResolve.tapAsync(
					"OverridablesPlugin",
					(resolveData, callback) => {
						// wait for resolving to be complete
						promise.then(() => callback());
					}
				);
				normalModuleFactory.hooks.module.tap(
					"OverridablesPlugin",
					(module, createData) => {
						const key = resolvedOverridables.get(createData.resource);
						if (key !== undefined) return new OverridableModule(module, key);
					}
				);
				compilation.hooks.additionalTreeRuntimeRequirements.tap(
					"OverridablesPlugin",
					(chunk, set) => {
						set.add(RuntimeGlobals.module);
						set.add(RuntimeGlobals.hasOwnProperty);
						set.add(RuntimeGlobals.ensureChunkHandlers);
						compilation.addRuntimeModule(
							chunk,
							new OverridablesRuntimeModule()
						);
					}
				);
			}
		);
	}
}

module.exports = OverridablesPlugin;
