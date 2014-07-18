/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RawSource = require("webpack-core/lib/RawSource");
var ModuleFilenameHelpers = require("./ModuleFilenameHelpers");

function EvalDevToolModuleTemplatePlugin(sourceUrlComment, moduleFilenameTemplate) {
	this.sourceUrlComment = sourceUrlComment || "//# sourceURL=[url]";
	this.moduleFilenameTemplate = moduleFilenameTemplate || "webpack:///[resourcePath]?[loaders]";
}
module.exports = EvalDevToolModuleTemplatePlugin;

EvalDevToolModuleTemplatePlugin.prototype.apply = function(moduleTemplate) {
	var self = this;
	moduleTemplate.plugin("module", function(source, module, chunk) {
		var content = source.source();
		var str = ModuleFilenameHelpers.createFilename(module, self.moduleFilenameTemplate, this.requestShortener);
		var footer = ["\n",
			ModuleFilenameHelpers.createFooter(module, this.requestShortener),
			self.sourceUrlComment.replace(/\[url\]/g, encodeURI(str).replace(/%2F/g, "/").replace(/%20/g, "_").replace(/%5E/g, "^").replace(/%5C/g, "\\").replace(/^\//, ""))
		].join("\n");
		return new RawSource("eval(" + JSON.stringify(content + footer) + ");" );
	});
	moduleTemplate.plugin("hash", function(hash) {
		hash.update("EvalDevToolModuleTemplatePlugin");
		hash.update("2");
	});
};
