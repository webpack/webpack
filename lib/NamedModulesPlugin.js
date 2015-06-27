/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function NamedModulesPlugin(options) {
	this.options = options || {};
}
module.exports = NamedModulesPlugin;
NamedModulesPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("before-module-ids", function(modules) {
			modules.forEach(function(module) {
				if(module.id === null && module.libIdent) {
					module.id = module.libIdent({
						context: this.options.context || compiler.options.context
					});
				}
			}, this);
		}.bind(this));
	}.bind(this));
};
