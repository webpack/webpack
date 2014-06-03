/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RawSource = require("webpack-core/lib/RawSource");

function EvalDevToolModuleTemplatePlugin(sourceUrlComment) {
	this.sourceUrlComment = sourceUrlComment || "//# sourceURL=[url]";
}
module.exports = EvalDevToolModuleTemplatePlugin;

EvalDevToolModuleTemplatePlugin.prototype.apply = function(moduleTemplate) {
	var self = this;
	moduleTemplate.plugin("module", function(source, module, chunk) {
		var content = source.source();
		var moduleName = module.readableIdentifier(this.requestShortener);
		var str = moduleName;
		str = str.split("!");
		str = str.pop() + (str.length > 0 ? " " + str.join("!") : "");
		var footer = ["\n",
			"// WEBPACK FOOTER",
			"// module.id = " + module.id,
			"// module.readableIdentifier = " + moduleName,
			self.sourceUrlComment.replace(/\[url\]/g, "webpack-module:///" + encodeURI(str).replace(/%2F/g, "/").replace(/%20/g, "_").replace(/%5E/g, "^").replace(/%5C/g, "\\").replace(/\?/, "%3F").replace(/^\//, ""))
		].join("\n");
		return new RawSource("eval(" + JSON.stringify(content + footer) + ");" );
	});
	moduleTemplate.plugin("hash", function(hash) {
		hash.update("EvalDevToolModuleTemplatePlugin");
		hash.update("2");
	});
};
