/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function LocalModule(module, name, idx) {
	this.module = module;
	this.name = name;
	this.idx = idx;
	this.used = false;
}
module.exports = LocalModule;

LocalModule.prototype.flagUsed = function() {
	this.used = true;
};

LocalModule.prototype.variableName = function() {
	return "__WEBPACK_LOCAL_MODULE_" + this.idx + "__";
};
