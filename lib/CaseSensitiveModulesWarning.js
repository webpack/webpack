/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function CaseSensitiveModulesWarning(modules) {
	Error.call(this);
	Error.captureStackTrace(this, CaseSensitiveModulesWarning);
	this.name = "CaseSensitiveModulesWarning";
	var modulesList = modules.map(function(m) {
		return "* " + m.identifier();
	}).join("\n");
	this.message = "There are multiple modules with names that only differ in casing.\n" +
		"This can lead to unexpected behavior when compiling on a filesystem with other case-semantic.\n" +
		"Use equal casing. Compare these module identifiers:\n" +
		modulesList;
	this.origin = this.module = modules[0];
}
module.exports = CaseSensitiveModulesWarning;

CaseSensitiveModulesWarning.prototype = Object.create(Error.prototype);
CaseSensitiveModulesWarning.prototype.constructor = CaseSensitiveModulesWarning;
