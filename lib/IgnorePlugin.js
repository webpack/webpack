/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { validate } = require("schema-utils");
const schema = require("../schemas/plugins/IgnorePlugin.json");

/** @typedef {import("../declarations/plugins/IgnorePlugin").IgnorePluginOptions} IgnorePluginOptions */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./NormalModuleFactory").ResolveData} ResolveData */

class IgnorePlugin {
	/**
	 * @param {IgnorePluginOptions} options IgnorePlugin options
	 */
	constructor(options) {
		validate(schema, options, {
			name: "Ignore Plugin",
			baseDataPath: "options"
		});
		this.options = options;

		/** @private @type {Function} */
		this.checkIgnore = this.checkIgnore.bind(this);
	}

	/**
	 * Note that if "contextRegExp" is given, both the "resourceRegExp"
	 * and "contextRegExp" have to match.
	 *
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
		compiler.hooks.normalModuleFactory.tap("IgnorePlugin", nmf => {
			nmf.hooks.beforeResolve.tap("IgnorePlugin", this.checkIgnore);
		});
		compiler.hooks.contextModuleFactory.tap("IgnorePlugin", cmf => {
			cmf.hooks.beforeResolve.tap("IgnorePlugin", this.checkIgnore);
		});
	}
}

module.exports = IgnorePlugin;
