/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function CaseSensitiveModulesWarning(module) {
	Error.call(this);
	Error.captureStackTrace(this, CaseSensitiveModulesWarning);
	this.name = "CaseSensitiveModulesWarning";
	this.message = "There is another module with an equal name when case is ignored.\n" +
		"This can lead to unexpected behavior when compiling on a filesystem with other case-semantic.\n" +
		"Rename module if multiple modules are expected or use equal casing if one module is expected.";
	this.origin = this.module = module;
}
module.exports = CaseSensitiveModulesWarning;

CaseSensitiveModulesWarning.prototype = Object.create(Error.prototype);
