/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RawSource = require("webpack-core/lib/RawSource");

function EvalDevToolModuleTemplateDecorator(moduleTemplate, sourceUrlComment) {
	this.moduleTemplate = moduleTemplate;
	this.sourceUrlComment = sourceUrlComment || "//@ sourceURL=[url]";
}
module.exports = EvalDevToolModuleTemplateDecorator;

EvalDevToolModuleTemplateDecorator.prototype.render = function(module, dependencyTemplates) {
	var sourceUrlComment = this.sourceUrlComment;
	var fakeModule = {
		source: function(dependencyTemplates, outputOptions, requestShortener) {
			var source = module.source(dependencyTemplates, outputOptions, requestShortener);
			var content = source.source();
			var str = module.readableIdentifier(requestShortener);
			str = str.split("!");
			str = str.pop() + (str.length > 0 ? " " + str.join("!") : "");
			var footer = ["\n",
				"// WEBPACK FOOTER",
				"// module.id = " + module.id,
				"// module.readableIdentifier = " + module.readableIdentifier(requestShortener),
				sourceUrlComment.replace(/\[url\]/g, "webpack-module:///" + encodeURI(str).replace(/%2F/g, "/").replace(/%20/g, "_").replace(/%5E/g, "^").replace(/%5C/g, "\\").replace(/\?/, "%3F").replace(/^\//, ""))
			].join("\n");
			return new RawSource("eval(" + JSON.stringify(content + footer) + ");" );
		},
		identifier: function() { return module.identifier() },
		readableIdentifier: function(rs) { return module.readableIdentifier(rs) },
		id: module.id
	};
	return this.moduleTemplate.render(fakeModule, dependencyTemplates);
};

EvalDevToolModuleTemplateDecorator.prototype.updateHash = function(hash) {
	hash.update("1");
};