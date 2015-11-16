/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function LoaderTargetPlugin(target) {
	this.target = target;
}
module.exports = LoaderTargetPlugin;
LoaderTargetPlugin.prototype.apply = function(compiler) {
	var target = this.target;
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("normal-module-loader", function(loaderContext) {
			loaderContext.target = target;
		});
	});
};
