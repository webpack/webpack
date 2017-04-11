/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class IgnorePlugin {
	constructor(resourceRegExp, contextRegExp) {
		this.resourceRegExp = resourceRegExp;
		this.contextRegExp = contextRegExp;

		this.checkIgnore = this.checkIgnore.bind(this);
	}

	/*
	 * Only returns true if a "resourceRegExp" exists
	 * and the resource given matches the regexp.
	 */
	checkResouce(resource) {
		if(!this.resourceRegExp) {
			return false;
		}
		return this.resourceRegExp.test(resource);
	}

	/*
	 * Returns true if contextRegExp does not exist
	 * or if context matches the given regexp.
	 */
	checkContext(context) {
		if(!this.contextRegExp) {
			return true;
		}
		return this.contextRegExp.test(context);
	}

	/*
	 * Returns true if result should be ignored.
	 * false if it shouldn't.
	 *
	 * Not that if "contextRegExp" is given, both the "resourceRegExp"
	 * and "contextRegExp" have to match.
	 */
	checkResult(result) {
		if(!result) {
			return true;
		}
		return this.checkResouce(result.request) && this.checkContext(result.context);
	}

	checkIgnore(result, callback) {
		// check if result is ignored
		if(this.checkResult(result)) {
			return callback();
		}
		return callback(null, result);
	}

	apply(compiler) {
		compiler.plugin("normal-module-factory", (nmf) => {
			nmf.plugin("before-resolve", this.checkIgnore);
		});
		compiler.plugin("context-module-factory", (cmf) => {
			cmf.plugin("before-resolve", this.checkIgnore);
		});
	}
}

module.exports = IgnorePlugin;
