/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

/** @typedef {import("./Compiler.js")} Compiler */

class IgnorePlugin {
	/**
	 * @param {RegExp} resourceRegExp A RegExp to test the request against
	 * @param {RegExp=} contextRegExp A RegExp to test the context (directory) against
	 */
	constructor(resourceRegExp, contextRegExp) {
		/** @private @type {RegExp} */
		this.resourceRegExp = resourceRegExp;
		/** @private @type {RegExp} */
		this.contextRegExp = contextRegExp;

		/** @private @type {Function} */
		this.checkIgnore = this.checkIgnore.bind(this);
	}

	/**
	 * @param {string} resource resource
	 * @returns {boolean} returns true if a "resourceRegExp" exists
	 * and the resource given matches the regexp.
	 */
	checkResource(resource) {
		if (!this.resourceRegExp) {
			return false;
		}
		return this.resourceRegExp.test(resource);
	}

	/**
	 * @param {string} context context
	 * @returns {boolean} returns true if "contextRegExp" does not exist
	 * or if context matches the given regexp.
	 */
	checkContext(context) {
		if (!this.contextRegExp) {
			return true;
		}
		return this.contextRegExp.test(context);
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
