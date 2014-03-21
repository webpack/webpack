/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RawSource = require("webpack-core/lib/RawSource");

function EvalSourceMapDevToolModuleTemplateDecorator(compilation, moduleTemplate, sourceMapComment) {
	this.compilation = compilation;
	this.moduleTemplate = moduleTemplate;
	this.sourceMapComment = sourceMapComment || "//@ sourceMappingURL=[url]";
}
module.exports = EvalSourceMapDevToolModuleTemplateDecorator;

EvalSourceMapDevToolModuleTemplateDecorator.prototype.render = function(module, dependencyTemplates) {
	var compilation = this.compilation;
	var sourceMapComment = this.sourceMapComment;
	var fakeModule = {
		source: function(dependencyTemplates, outputOptions, requestShortener) {
			var source = module.source(dependencyTemplates, outputOptions, requestShortener);
			var content = source.source();
			var sourceMap = source.map();
			if(!sourceMap) {
				return source;
			}
			for(var i = 0; i < sourceMap.sources.length; i++) {
				var source = sourceMap.sources[i];
				var str;
				var m = compilation.findModule(source);
				if(m)
					str = m.readableIdentifier(requestShortener);
				else
					str = requestShortener.shorten(source);
				str = str.split("!");
				str = str.pop() + (str.length > 0 ? " " + str.join("!") : "");
				var idx;
				while((idx = sourceMap.sources.indexOf(str) >= 0) && (idx < i)) {
					str += "*";
				}
				sourceMap.sources[i] = str;
			}
			sourceMap.sourceRoot = "webpack-module://";
			var footer = sourceMapComment.replace(/\[url\]/g, "data:application/json;base64," + new Buffer(JSON.stringify(sourceMap)).toString("base64"));
			return new RawSource("eval(" + JSON.stringify(content + footer) + ");" );
		},
		identifier: function() { return module.identifier() },
		readableIdentifier: function(rs) { return module.readableIdentifier(rs) },
		id: module.id
	};
	return this.moduleTemplate.render(fakeModule, dependencyTemplates);
};

EvalSourceMapDevToolModuleTemplateDecorator.prototype.updateHash = function(hash) {
	hash.update("eval-source-map");
	hash.update("1");
};