/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} BailoutDetails
 * @property {string} reason what keeps the runtime form, as the code generation recorded it
 * @property {string[]} modules the modules it was recorded on, as many as are printed
 * @property {number} count how many modules it was recorded on in all
 */

class AnalyzableBailoutsWarning extends WebpackError {
	/**
	 * Creates an instance of AnalyzableBailoutsWarning.
	 * @param {BailoutDetails[]} bailouts the reasons found, the most frequent first
	 * @param {number} references how many module and reason pairs there are
	 */
	constructor(bailouts, references) {
		const list = bailouts
			.map((it) => {
				const more = it.count - it.modules.length;
				const names = `${it.modules.join(", ")}${more > 0 ? `, and ${more} more` : ""}`;
				return `\n  ${it.reason}\n    ${names}`;
			})
			.join("");

		super(
			`analyzable ESM output: ${references} ${references === 1 ? "reference keeps" : "references keep"} the runtime form:${list}\nA bundler reading this output cannot follow such a reference without running webpack's runtime. Each reason names the setting that keeps it; changing that setting lets the reference be written as a literal import() or new URL().\nFor more info visit https://webpack.js.org/configuration/output/#outputmodule`
		);

		/** @type {string} */
		this.name = "AnalyzableBailoutsWarning";
	}
}

module.exports = AnalyzableBailoutsWarning;
