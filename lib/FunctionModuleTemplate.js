/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RawSource = require("webpack-core/lib/RawSource");

function FunctionModuleTemplate(outputOptions, requestShortener) {
	this.outputOptions = outputOptions || {};
	this.requestShortener = requestShortener;
}
module.exports = FunctionModuleTemplate;

FunctionModuleTemplate.prototype.render = function(module, dependencyTemplates) {
	var buf = [];
	if(this.outputOptions.pathinfo) {
		var req = module.readableIdentifier(this.requestShortener);
		buf.push("/*!****" + req.replace(/./g, "*") + "****!*\\\n");
		buf.push("  !*** " + req.replace(/\*\//g, "*_/") + " ***!\n");
		buf.push("  \\****" + req.replace(/./g, "*") + "****/\n");
	}
	buf.push("/***/ function(module, exports, require) {\n\n");
	var source = module.source(dependencyTemplates, this.outputOptions, this.requestShortener);
	buf.push("\t" + source.source().replace(/\r?\n/g, "\n\t"));
	buf.push("\n\n/***/ }");
	return new RawSource(buf.join(""));
};

FunctionModuleTemplate.prototype.updateHash = function(hash) {
	hash.update("1");
};