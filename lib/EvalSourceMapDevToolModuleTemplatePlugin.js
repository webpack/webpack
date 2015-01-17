/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RawSource = require("webpack-core/lib/RawSource");
var ModuleFilenameHelpers = require("./ModuleFilenameHelpers");

function EvalSourceMapDevToolModuleTemplatePlugin(compilation, sourceMapComment, moduleFilenameTemplate) {
	this.compilation = compilation;
	this.sourceMapComment = sourceMapComment || "//@ sourceMappingURL=[url]";
	this.moduleFilenameTemplate = moduleFilenameTemplate || "webpack:///[resource-path]?[hash]";
}
module.exports = EvalSourceMapDevToolModuleTemplatePlugin;

EvalSourceMapDevToolModuleTemplatePlugin.prototype.apply = function(moduleTemplate) {
	var self = this;
	moduleTemplate.plugin("module", function(source, module, chunk) {
		if(source.__EvalSourceMapDevTool_Data)
			return source.__EvalSourceMapDevTool_Data;
		var content = source.source();

		var sourceMap = source.map();
		if(!sourceMap) {
			return source;
		}

		// Clone (flat) the sourcemap to ensure that the mutations below do not persist.
		sourceMap = Object.keys(sourceMap).reduce(function(obj, key) {
			obj[key] = sourceMap[key];
			return obj;
		}, {});
		var modules = sourceMap.sources.map(function(source) {
			var module = self.compilation.findModule(source);
			return module || source;
		});
		var moduleFilenames = modules.map(function(module) {
			return ModuleFilenameHelpers.createFilename(module, self.moduleFilenameTemplate, this.requestShortener);
		}, this);
		moduleFilenames = ModuleFilenameHelpers.replaceDuplicates(moduleFilenames, function(filename, i, n) {
			for(var j = 0; j < n; j++)
				filename += "*";
			return filename;
		});
		sourceMap.sources = moduleFilenames;
		if(sourceMap.sourcesContent) {
			sourceMap.sourcesContent = sourceMap.sourcesContent.map(function(content, i) {
				return content + "\n\n\n" + ModuleFilenameHelpers.createFooter(modules[i], this.requestShortener);
			}, this);
		}
		sourceMap.sourceRoot = "";
		sourceMap.file = module.id + ".js";
		var footer = self.sourceMapComment.replace(/\[url\]/g, "data:application/json;base64," + new Buffer(JSON.stringify(sourceMap)).toString("base64"));
		return source.__EvalSourceMapDevTool_Data = new RawSource("eval(" + JSON.stringify(content + footer) + ");" );
	});
	moduleTemplate.plugin("hash", function(hash) {
		hash.update("eval-source-map");
		hash.update("1");
	});
};
