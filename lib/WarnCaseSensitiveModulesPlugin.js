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
				const moduleWithoutCase = {};
				this.modules.forEach(module => {
					const ident = module.identifier().toLowerCase();
					if(moduleWithoutCase[`$${ident}`]) {
						moduleWithoutCase[`$${ident}`].push(module);
					} else {
						moduleWithoutCase[`$${ident}`] = [module];
					}
				}, this);
				Object.keys(moduleWithoutCase).forEach(key => {
					if(moduleWithoutCase[key].length > 1)
						this.warnings.push(new CaseSensitiveModulesWarning(moduleWithoutCase[key]));
				}, this);
			});
		});
	}
}

module.exports = WarnCaseSensitiveModulesPlugin;
