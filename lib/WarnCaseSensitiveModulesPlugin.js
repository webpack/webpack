/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var CaseSensitiveModulesWarning = require("./CaseSensitiveModulesWarning");

function WarnCaseSensitiveModulesPlugin() {}
module.exports = WarnCaseSensitiveModulesPlugin;

WarnCaseSensitiveModulesPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("seal", function() {
			var moduleWithoutCase = {};
			this.modules.forEach(function(module) {
				var ident = module.identifier().toLowerCase();
				if(moduleWithoutCase["$" + ident]) {
					moduleWithoutCase["$" + ident].push(module);
				} else {
					moduleWithoutCase["$" + ident] = [module];
				}
			}, this);
			Object.keys(moduleWithoutCase).forEach(function(key) {
				if(moduleWithoutCase[key].length > 1)
					this.warnings.push(new CaseSensitiveModulesWarning(moduleWithoutCase[key]));
			}, this);
		});
	});
};
