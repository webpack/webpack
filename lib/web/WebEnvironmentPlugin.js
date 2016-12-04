/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function WebEnvironmentPlugin(inputFileSystem, outputFileSystem) {
	this.inputFileSystem = inputFileSystem;
	this.outputFileSystem = outputFileSystem;
}
module.exports = WebEnvironmentPlugin;
WebEnvironmentPlugin.prototype.apply = function(compiler) {
	var inputFileSystem = compiler.inputFileSystem = this.inputFileSystem;
	compiler.outputFileSystem = this.outputFileSystem;
};
