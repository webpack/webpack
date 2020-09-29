/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");
const ExternalModule = require("./ExternalModule");

/** @typedef {import("../declarations/WebpackOptions").Externals} Externals */
/** @typedef {import("./NormalModuleFactory")} NormalModuleFactory */

const UNSPECIFIED_EXTERNAL_TYPE_REGEXP = /^[a-z0-9]+ /;

// TODO webpack 6 remove this
const callDeprecatedExternals = util.deprecate(
	(externalsFunction, context, request, cb) => {
		externalsFunction.call(null, context, request, cb);
	},
	"The externals-function should be defined like ({context, request}, cb) => { ... }",
	"DEP_WEBPACK_EXTERNALS_FUNCTION_PARAMETERS"
);

class ExternalModuleFactoryPlugin {
	/**
	 * @param {string | undefined} type default external type
	 * @param {Externals} externals externals config
	 */
	constructor(type, externals) {
		this.type = type;
		this.externals = externals;
	}

	/**
	 * @param {NormalModuleFactory} normalModuleFactory the normal module factory
	 * @returns {void}
	 */
	apply(normalModuleFactory) {
		const globalType = this.type;
		normalModuleFactory.hooks.factorize.tapAsync(
			"ExternalModuleFactoryPlugin",
			(data, callback) => {
				const context = data.context;
				const dependency = data.dependencies[0];

				/**
				 * @param {string|string[]|boolean|Record<string, string|string[]>} value the external config
				 * @param {string|undefined} type type of external
				 * @param {function(Error=, ExternalModule=): void} callback callback
				 * @returns {void}
				 */
				const handleExternal = (value, type, callback) => {
					if (value === false) {
						// Not externals, fallback to original factory
						return callback();
					}
					/** @type {string | string[] | Record<string, string|string[]>} */
					let externalConfig;
					if (value === true) {
						externalConfig = dependency.request;
					} else {
						externalConfig = value;
					}
					// When no explicit type is specified, extract it from the externalConfig
					if (type === undefined) {
						if (
							typeof externalConfig === "string" &&
							UNSPECIFIED_EXTERNAL_TYPE_REGEXP.test(externalConfig)
						) {
							const idx = externalConfig.indexOf(" ");
							type = externalConfig.substr(0, idx);
							externalConfig = externalConfig.substr(idx + 1);
						} else if (
							Array.isArray(externalConfig) &&
							externalConfig.length > 0 &&
							UNSPECIFIED_EXTERNAL_TYPE_REGEXP.test(externalConfig[0])
						) {
							const firstItem = externalConfig[0];
							const idx = firstItem.indexOf(" ");
							type = firstItem.substr(0, idx);
							externalConfig = [
								firstItem.substr(idx + 1),
								...externalConfig.slice(1)
							];
						}
					}
					callback(
						null,
						new ExternalModule(
							externalConfig,
							type || globalType,
							dependency.request
						)
					);
				};

				/**
				 * @param {Externals} externals externals config
				 * @param {function(Error=, ExternalModule=): void} callback callback
				 * @returns {void}
				 */
				const handleExternals = (externals, callback) => {
					if (typeof externals === "string") {
						if (externals === dependency.request) {
							return handleExternal(dependency.request, undefined, callback);
						}
					} else if (Array.isArray(externals)) {
						let i = 0;
						const next = () => {
							let asyncFlag;
							const handleExternalsAndCallback = (err, module) => {
								if (err) return callback(err);
								if (!module) {
									if (asyncFlag) {
										asyncFlag = false;
										return;
									}
									return next();
								}
								callback(null, module);
							};

							do {
								asyncFlag = true;
								if (i >= externals.length) return callback();
								handleExternals(externals[i++], handleExternalsAndCallback);
							} while (!asyncFlag);
							asyncFlag = false;
						};

						next();
						return;
					} else if (externals instanceof RegExp) {
						if (externals.test(dependency.request)) {
							return handleExternal(dependency.request, undefined, callback);
						}
					} else if (typeof externals === "function") {
						const cb = (err, value, type) => {
							if (err) return callback(err);
							if (value !== undefined) {
								handleExternal(value, type, callback);
							} else {
								callback();
							}
						};
						if (externals.length === 3) {
							// TODO webpack 6 remove this
							callDeprecatedExternals(
								externals,
								context,
								dependency.request,
								cb
							);
						} else {
							externals(
								{
									context,
									request: dependency.request
								},
								cb
							);
						}
						return;
					} else if (
						typeof externals === "object" &&
						Object.prototype.hasOwnProperty.call(externals, dependency.request)
					) {
						return handleExternal(
							externals[dependency.request],
							undefined,
							callback
						);
					}
					callback();
				};

				handleExternals(this.externals, callback);
			}
		);
	}
}
module.exports = ExternalModuleFactoryPlugin;
