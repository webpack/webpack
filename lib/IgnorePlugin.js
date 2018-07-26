/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const validateOptions = require("schema-utils");
const schema = require("../schemas/plugins/IgnorePlugin.json");

/** @typedef {import("./Compiler")} Compiler */

class IgnorePlugin {
	/**
	 * @param {object} options IgnorePlugin options
	 * @param {RegExp} options.resourceRegExp - A RegExp to test the request against
	 * @param {RegExp} options.contextRegExp - A RegExp to test the context (directory) against
	 * @param {function(string): boolean=} options.checkResource - A filter function for resource
	 * @param {function(string): boolean=} options.checkContext - A filter function for context
	 */
	constructor(options) {
		// TODO webpack 5 remove this compat-layer
		if (arguments.length > 1 || options instanceof RegExp) {
			options = {
				resourceRegExp: arguments[0],
				contextRegExp: arguments[1]
			};
		}

		validateOptions(schema, options, "IgnorePlugin");
		this.options = options;

		/** @private @type {Function} */
		this.checkIgnore = this.checkIgnore.bind(this);
	}

	/**
	 * @param {string} resource resource
	 * @returns {boolean} returns true if a "resourceRegExp" exists
	 * and the resource given matches the regexp.
	 */
	checkResource(resource) {
		if (this.options.checkResource) {
			return this.options.checkResource(resource);
		}
		if (!this.options.resourceRegExp) {
			return false;
		}
		return this.options.resourceRegExp.test(resource);
	}

	/**
	 * @param {string} context context
	 * @returns {boolean} returns true if "contextRegExp" does not exist
	 * or if context matches the given regexp.
	 */
	checkContext(context) {
		if (this.options.checkContext) {
			return this.options.checkContext(context);
		}

		if (!this.options.contextRegExp) {
			return true;
		}
		return this.options.contextRegExp.test(context);
	}

	/**
	 * Note that if "contextRegExp" is given, both the "resourceRegExp"
	 * and "contextRegExp" have to match.
	 *
	 * @param {TODO} result result
	 * @returns {boolean} returns true if result should be ignored
	 */
	checkResult(result) {
		if (!result) {
			return true;
		}
		return (
			this.checkResource(result.request) && this.checkContext(result.context)
		);
	}

	/**
	 * @param {TODO} result result
	 * @returns {TODO|null} returns result or null if result should be ignored
	 */
	checkIgnore(result) {
		// check if result is ignored
		if (this.checkResult(result)) {
			return null;
		}
		return result;
	}

	/**
	 * @param {Compiler} compiler Webpack Compiler
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
