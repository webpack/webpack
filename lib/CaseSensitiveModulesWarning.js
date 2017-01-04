"use strict";
/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
 */
class CaseSensitiveModulesWarning extends Error {
	constructor(modules) {
		super();
		this.name = "CaseSensitiveModulesWarning";
		Error.captureStackTrace(this, CaseSensitiveModulesWarning);
		const modulesList = modules
			.slice()
			.sort((a, b) => {
				const aId = a.identifier();
				const bId = b.identifier();
				if(aId < bId) {
					return -1;
				}
				if(aId > bId) {
					return 1;
				}
				return 0;
			})
			.map(m => {
				let message = `* ${m.identifier()}`;
				const validReasons = m.reasons.filter(r => r.module);
				if(validReasons.length > 0) {
					message += `\n    Used by ${validReasons.length} module(s), i. e.`;
					message += `\n    ${validReasons[0].module.identifier()}`;
				}
				return message;
			})
			.join("\n");
		this.message = `There are multiple modules with names that only differ in casing.
This can lead to unexpected behavior when compiling on a filesystem with other case-semantic.
Use equal casing. Compare these module identifiers:
${modulesList}`;
		this.origin = this.module = modules[0];
	}
}
module.exports = CaseSensitiveModulesWarning;
