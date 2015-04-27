/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");
var PrefixSource = require("webpack-core/lib/PrefixSource");

function FunctionModuleTemplatePlugin() {
}
module.exports = FunctionModuleTemplatePlugin;

FunctionModuleTemplatePlugin.prototype.apply = function(moduleTemplate) {
	moduleTemplate.plugin("render", function(moduleSource, module) {
		var source = new ConcatSource();
		source.add("/***/ function(" + ["module", "exports", "__webpack_require__"].concat(module.arguments || []).join(", ") + ") {\n\n");
		source.add(new PrefixSource(this.outputOptions.sourcePrefix, moduleSource));
		source.add("\n\n/***/ }");
		return source;
	});
	moduleTemplate.plugin("package", function(moduleSource, module) {
		if(this.outputOptions.pathinfo) {
			var source = new ConcatSource();
			var req = module.readableIdentifier(this.requestShortener);
			source.add("/*!****" + req.replace(/./g, "*") + "****!*\\\n");
			source.add("  !*** " + req.replace(/\*\//g, "*_/") + " ***!\n");
			source.add("  \\****" + req.replace(/./g, "*") + "****/\n");
			source.add(moduleSource);
			return source;
		}
		return moduleSource;
	});
	moduleTemplate.plugin("hash", function(hash) {
		hash.update("FunctionModuleTemplatePlugin");
		hash.update("2");
	});
};
