/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var CaseSensitiveModulesWarning = require("./CaseSensitiveModulesWarning");

function WarnCaseSensitiveModulesPlugin() {
}
module.exports = WarnCaseSensitiveModulesPlugin;

WarnCaseSensitiveModulesPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("seal", function() {
			var moduleWithoutCase = {};
			this.modules.forEach(function(module) {
				var ident = module.identifier().toLowerCase();
				if(moduleWithoutCase["$"+ident]) {
					if(moduleWithoutCase["$"+ident] !== true)
						this.warnings.push(new CaseSensitiveModulesWarning(moduleWithoutCase["$"+ident]));
					this.warnings.push(new CaseSensitiveModulesWarning(module));
					moduleWithoutCase["$"+ident] = true;
				} else {
					moduleWithoutCase["$"+ident] = module;
				}
			}, this);
		});
	});
};