/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

/** @typedef {import("./config/defaults.js").WebpackOptionsNormalizedWithDefaults} WebpackOptions */
/** @typedef {import("./config/normalization.js").WebpackOptionsInterception} WebpackOptionsInterception */
/** @typedef {import("./Compiler.js").default} Compiler */

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

export default OptionsApply;

export { OptionsApply as "module.exports" };
