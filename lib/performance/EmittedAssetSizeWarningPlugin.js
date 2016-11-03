/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
function EmittedAssetSizeWarningPlugin(warningMessage) {
	this.warningMessage = warningMessage;
	debugger;
}
module.exports = EmittedAssetSizeWarningPlugin;

EmittedAssetSizeWarningPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {
		debugger;
		compilation.warnings.push(new Error("EmmittedAssetSizeWarning: " + this.warningMessage));

	});
};
