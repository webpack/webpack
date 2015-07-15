/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ModuleFilenameHelpers = require("./ModuleFilenameHelpers");

function SourceMapDevToolModuleOptionsPlugin(options) {
	this.options = options;
}

module.exports = SourceMapDevToolModuleOptionsPlugin;

SourceMapDevToolModuleOptionsPlugin.prototype.apply = function(compilation) {
	var options = this.options;
	if(options.module !== false) {
		compilation.plugin("build-module", function(module) {
			module.useSourceMap = true;
		});
	}
	if(options.lineToLine === true) {
		compilation.plugin("build-module", function(module) {
			module.lineToLine = true;
		});
	} else if(options.lineToLine) {
		compilation.plugin("build-module", function(module) {
			if(!module.resource) return;
			var resourcePath = module.resource;
			var idx = resourcePath.indexOf("?");
			if(idx >= 0) resourcePath = resourcePath.substr(0, idx);
			module.lineToLine = ModuleFilenameHelpers.matchObject(options.lineToLine, resourcePath);
		});
	}
};
