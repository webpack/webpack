/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function CaseSensitiveModulesWarning(modules) {
	Error.call(this);
	Error.captureStackTrace(this, CaseSensitiveModulesWarning);
	this.name = "CaseSensitiveModulesWarning";
	var modulesList = modules.slice().sort(function(a, b) {
		a = a.identifier();
		b = b.identifier();
		if(a < b) return -1;
		if(a > b) return 1;
		return 0;
	}).map(function(m) {
		var message = "* " + m.identifier();
		var validReasons = m.reasons.filter(function(r) {
			return r.module;
		});
		if(validReasons.length > 0) {
			message += "\n    Used by " + validReasons.length + " module(s), i. e.";
			message += "\n    " + validReasons[0].module.identifier();
		}
		return message;
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
