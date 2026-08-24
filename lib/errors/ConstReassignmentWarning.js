/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} ConstReassignmentDetails
 * @property {string} name the module, by request
 * @property {string[]} bindings the constants it writes to
 */

class ConstReassignmentWarning extends WebpackError {
	/**
	 * Creates an instance of ConstReassignmentWarning.
	 * @param {ConstReassignmentDetails[]} modules the modules that do it
	 * @param {number} total how many such bindings there are in all
	 */
	constructor(modules, total) {
		const list = modules
			.map((it) => `\n  ${it.name} (${it.bindings.join(", ")})`)
			.join("");

		super(
			`const reassignment: ${total} ${total === 1 ? "binding is" : "bindings are"} declared 'const' and written to:${list}\nAn ES module is strict, so the write throws a TypeError the moment it runs. Declare the binding with 'let' if it is meant to change.\nFor more info visit https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/const`
		);

		/** @type {string} */
		this.name = "ConstReassignmentWarning";
	}
}

module.exports = ConstReassignmentWarning;
