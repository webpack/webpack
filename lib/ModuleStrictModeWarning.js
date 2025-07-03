/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("./WebpackError");

/** @typedef {import("./Module")} Module */
/** @typedef {import("./RequestShortener")} RequestShortener */

/**
 * Warning for modules that webpack automatically converts to strict mode.
 * This typically happens when processing ES modules (import/export syntax).
 */
class ModuleStrictModeWarning extends WebpackError {
	/**
	 * @param {Module} module module that was converted to strict mode
	 * @param {RequestShortener} requestShortener request shortener
	 */
	constructor(module, requestShortener) {
		const message = `Module '${module.readableIdentifier(
			requestShortener
		)}' was automatically converted to strict mode, which may break the module if it uses non-strict mode features`;
		super(message);

		this.name = "ModuleStrictModeWarning";
		this.module = module;
	}
}

module.exports = ModuleStrictModeWarning;
