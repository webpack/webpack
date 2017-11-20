/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const CaseSensitiveModulesWarning = require("./CaseSensitiveModulesWarning");

class WarnCaseSensitiveModulesPlugin {
	apply(compiler) {
		compiler.plugin("compilation", compilation => {
			compilation.plugin("seal", () => {
				const moduleWithoutCase = new Map();
				compilation.modules.forEach(module => {
					const identifier = module.identifier().toLowerCase();
					const array = moduleWithoutCase.get(identifier);
					if(array) {
						array.push(module);
					} else {
						moduleWithoutCase.set(identifier, [module]);
					}
				});
				for(const pair of moduleWithoutCase) {
					const array = pair[1];
					if(array.length > 1)
						compilation.warnings.push(new CaseSensitiveModulesWarning(array));
				}
			});
		});
	}
}

module.exports = WarnCaseSensitiveModulesPlugin;
