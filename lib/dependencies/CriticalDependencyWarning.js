/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function CriticalDependencyWarning(message) {
	Error.call(this);
	Error.captureStackTrace(this, CriticalDependencyWarning);
	this.name = "CriticalDependencyWarning";
	this.message = "Critical dependency: " + message;
}
module.exports = CriticalDependencyWarning;

CriticalDependencyWarning.prototype = Object.create(Error.prototype);
CriticalDependencyWarning.prototype.constructor = CriticalDependencyWarning;
