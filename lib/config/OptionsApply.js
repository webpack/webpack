/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/**
 * @import {
 * 	WebpackOptionsNormalizedWithDefaults as WebpackOptions
 * } from "./defaults.js"
 */
/** @import { WebpackOptionsInterception } from "./normalization.js" */
/** @import Compiler from "../Compiler.js" */

class OptionsApply {
	/**
	 * Returns options object.
	 * @param {WebpackOptions} options options object
	 * @param {Compiler} compiler compiler object
	 * @param {WebpackOptionsInterception=} interception intercepted options
	 * @returns {WebpackOptions} options object
	 */
	process(options, compiler, interception) {
		return options;
	}
}

module.exports = OptionsApply;
