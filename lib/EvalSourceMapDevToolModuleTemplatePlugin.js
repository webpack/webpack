/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RawSource = require("webpack-core/lib/RawSource");

function EvalSourceMapDevToolModuleTemplatePlugin(compilation, sourceMapComment) {
	this.compilation = compilation;
	this.sourceMapComment = sourceMapComment || "//@ sourceMappingURL=[url]";
}
module.exports = EvalSourceMapDevToolModuleTemplatePlugin;

EvalSourceMapDevToolModuleTemplatePlugin.prototype.apply = function(moduleTemplate) {
	var self = this;
	moduleTemplate.plugin("module", function(source, module, chunk) {
		var content = source.source();
		var sourceMap = source.map();
		if(!sourceMap) {
			return source;
		}
		for(var i = 0; i < sourceMap.sources.length; i++) {
			var source = sourceMap.sources[i];
			var str;
			var m = self.compilation.findModule(source);
			if(m)
				str = m.readableIdentifier(this.requestShortener);
			else
				str = this.requestShortener.shorten(source);
			str = str.split("!");
			str = str.pop() + (str.length > 0 ? " " + str.join("!") : "");
			var idx;
			while((idx = sourceMap.sources.indexOf(str) >= 0) && (idx < i)) {
				str += "*";
			}
			sourceMap.sources[i] = str;
		}
		sourceMap.sourceRoot = "webpack-module://";
		var footer = self.sourceMapComment.replace(/\[url\]/g, "data:application/json;base64," + new Buffer(JSON.stringify(sourceMap)).toString("base64"));
		return new RawSource("eval(" + JSON.stringify(content + footer) + ");" );
	});
	moduleTemplate.plugin("hash", function(hash) {
		hash.update("eval-source-map");
		hash.update("1");
	});
};
