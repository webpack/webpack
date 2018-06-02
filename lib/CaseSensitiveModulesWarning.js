/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const WebpackError = require("./WebpackError");

/** @typedef {import("./Module")} Module */

class CaseSensitiveModulesWarning extends WebpackError {
	/**
	 * Creates an instance of CaseSensitiveModulesWarning.
	 * @param {Module[]} modules modules that were detected
	 */
	constructor(modules) {
		super();

		this.name = "CaseSensitiveModulesWarning";
		const sortedModules = this._sort(modules);
		const modulesList = this._moduleMessages(sortedModules);
		this.message = `There are multiple modules with names that only differ in casing.
This can lead to unexpected behavior when compiling on a filesystem with other case-semantic.
Use equal casing. Compare these module identifiers:
${modulesList}`;

		this.origin = this.module = sortedModules[0];

		Error.captureStackTrace(this, this.constructor);
	}

	/**
	 * @private
	 * @param {Module[]} modules the modules to be sorted
	 * @returns {Module[]} sorted version of original modules
	 */
	_sort(modules) {
		return modules.slice().sort((a, b) => {
			a = a.identifier();
			b = b.identifier();
			/* istanbul ignore next */
			if (a < b) return -1;
			/* istanbul ignore next */
			if (a > b) return 1;
			/* istanbul ignore next */
			return 0;
		});
	}

	/**
	 * @private
	 * @param {Module[]} modules each module from throw
	 * @returns {string} each message from provided moduels
	 */
	_moduleMessages(modules) {
		return modules
			.map(m => {
				let message = `* ${m.identifier()}`;
				const validReasons = m.reasons.filter(reason => reason.module);

				if (validReasons.length > 0) {
					message += `\n    Used by ${validReasons.length} module(s), i. e.`;
					message += `\n    ${validReasons[0].module.identifier()}`;
				}
				return message;
			})
			.join("\n");
	}
}

module.exports = CaseSensitiveModulesWarning;
