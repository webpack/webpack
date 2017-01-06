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
				const moduleWithoutCase = Object.create(null);
				compilation.modules.forEach(module => {
					const identifier = module.identifier().toLowerCase();
					if(moduleWithoutCase[identifier]) {
						moduleWithoutCase[identifier].push(module);
					} else {
						moduleWithoutCase[identifier] = [module];
					}
				});
				Object.keys(moduleWithoutCase).forEach(key => {
					if(moduleWithoutCase[key].length > 1)
						compilation.warnings.push(new CaseSensitiveModulesWarning(moduleWithoutCase[key]));
				});
			});
		});
	}
}

module.exports = WarnCaseSensitiveModulesPlugin;
