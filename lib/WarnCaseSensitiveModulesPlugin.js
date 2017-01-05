/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const CaseSensitiveModulesWarning = require("./CaseSensitiveModulesWarning");

class WarnCaseSensitiveModulesPlugin {
	apply(compiler) {
		compiler.plugin("compilation", compilation => {
			compilation.plugin("seal", function() {
				const moduleWithoutCase = new Map();
				this.modules.forEach(module => {
					const identifier = module.identifier().toLowerCase();
					const moduleInstance = moduleWithoutCase.get(`$${identifier}`)
					if(moduleInstance) {
						moduleWithoutCase.set(`$${identifier}`, moduleInstance.push(module));
					} else {
						moduleWithoutCase.set(`$${identifier}`, [module]);
					}
				});
				Object.keys(moduleWithoutCase).forEach(key => {
					const moduleInstance = moduleWithoutCase.get(key);
					if(moduleInstance.length > 1)
						this.warnings.push(new CaseSensitiveModulesWarning(moduleInstance));
				}, this);
			});
		});
	}
}

module.exports = WarnCaseSensitiveModulesPlugin;
