/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function CommonJsInHarmonyWarning(name) {
	Error.call(this);
	Error.captureStackTrace(this, CommonJsInHarmonyWarning);
	this.name = "CommonJsInHarmonyWarning";
	this.message = name + " is not allowed in EcmaScript module: This module was detected as EcmaScript module (import or export syntax was used). In such a module using '" + name + "' is not allowed.";
}
module.exports = CommonJsInHarmonyWarning;

CommonJsInHarmonyWarning.prototype = Object.create(Error.prototype);
CommonJsInHarmonyWarning.prototype.constructor = CommonJsInHarmonyWarning;
