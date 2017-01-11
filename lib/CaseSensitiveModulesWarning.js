/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

module.exports = class CaseSensitiveModulesWarning extends Error {
	constructor(modules) {
		super();
		Error.captureStackTrace(this, CaseSensitiveModulesWarning);
		this.name = "CaseSensitiveModulesWarning";

		let sortedModules = this._sort(modules);
		let modulesList = this._moduleMessages(sortedModules);
		this.message = "There are multiple modules with names that only differ in casing.\n" +
			"This can lead to unexpected behavior when compiling on a filesystem with other case-semantic.\n" +
			`Use equal casing. Compare these module identifiers:\n${modulesList}`;
		this.origin = this.module = sortedModules[0];
	}

	_sort(modules) {
		return modules.slice().sort((a, b) => {
			a = a.identifier();
			b = b.identifier();
			if(a < b) return -1;
			if(a > b) return 1;
			return 0;
		});
	}

	_moduleMessages(modules) {
		return modules.map((m) => {
			let message = `* ${m.identifier()}`;
			let validReasons = m.reasons.filter((reason) => reason.module);

			if(validReasons.length > 0) {
				message += `\n    Used by ${validReasons.length} module(s), i. e.`;
				message += `\n    ${validReasons[0].module.identifier()}`;
			}
			return message;
		}).join("\n");
	}
};
