/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-sources").ConcatSource;
var PrefixSource = require("webpack-sources").PrefixSource;

function FunctionModuleTemplatePlugin() {}
module.exports = FunctionModuleTemplatePlugin;

FunctionModuleTemplatePlugin.prototype.apply = function(moduleTemplate) {
	moduleTemplate.plugin("render", function(moduleSource, module) {
		var source = new ConcatSource();
		var defaultArguments = ["module", "exports"];
		if((module.arguments && module.arguments.length !== 0) || module.hasDependencies()) {
			defaultArguments.push("__webpack_require__");
		}
		source.add("/***/ function(" + defaultArguments.concat(module.arguments || []).join(", ") + ") {\n\n");
		if(module.strict) source.add("\"use strict\";\n");
		source.add(moduleSource);
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
