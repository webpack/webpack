/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RawModule = require("./RawModule");
const EntryDependency = require("./dependencies/EntryDependency");
const createSchemaValidation = require("./util/create-schema-validation");

/** @typedef {import("../declarations/plugins/IgnorePlugin").IgnorePluginOptions} IgnorePluginOptions */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./NormalModuleFactory").ResolveData} ResolveData */

const validate = createSchemaValidation(
	require("../schemas/plugins/IgnorePlugin.check"),
	() => require("../schemas/plugins/IgnorePlugin.json"),
	{
		name: "Ignore Plugin",
		baseDataPath: "options"
	}
);

const PLUGIN_NAME = "IgnorePlugin";

class IgnorePlugin {
	/**
	 * @param {IgnorePluginOptions} options IgnorePlugin options
	 */
	constructor(options) {
		validate(options);
		this.options = options;
		this.checkIgnore = this.checkIgnore.bind(this);
	}

	/**
	 * Note that if "contextRegExp" is given, both the "resourceRegExp" and "contextRegExp" have to match.
	 * @param {ResolveData} resolveData resolve data
	 * @returns {false|undefined} returns false when the request should be ignored, otherwise undefined
	 */
	checkIgnore(resolveData) {
		if (
			"checkResource" in this.options &&
			this.options.checkResource &&
			this.options.checkResource(resolveData.request, resolveData.context)
		) {
			return false;
		}

		if (
			"resourceRegExp" in this.options &&
			this.options.resourceRegExp &&
			this.options.resourceRegExp.test(resolveData.request)
		) {
			if ("contextRegExp" in this.options && this.options.contextRegExp) {
				// if "contextRegExp" is given,
				// both the "resourceRegExp" and "contextRegExp" have to match.
				if (this.options.contextRegExp.test(resolveData.context)) {
					return false;
				}
			} else {
				return false;
			}
		}
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.normalModuleFactory.tap(PLUGIN_NAME, nmf => {
			nmf.hooks.beforeResolve.tap(PLUGIN_NAME, resolveData => {
				const result = this.checkIgnore(resolveData);

				if (
					result === false &&
					resolveData.dependencies.length > 0 &&
					resolveData.dependencies[0] instanceof EntryDependency
				) {
					resolveData.ignoredModule = new RawModule(
						"",
						"ignored-entry-module",
						"(ignored-entry-module)"
					);
				}

				return result;
			});
		});
		compiler.hooks.contextModuleFactory.tap(PLUGIN_NAME, cmf => {
			cmf.hooks.beforeResolve.tap(PLUGIN_NAME, this.checkIgnore);
		});
	}
}

module.exports = IgnorePlugin;
