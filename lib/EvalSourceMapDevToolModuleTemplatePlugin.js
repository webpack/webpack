/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RawSource = require("webpack-sources").RawSource;
var ModuleFilenameHelpers = require("./ModuleFilenameHelpers");

function EvalSourceMapDevToolModuleTemplatePlugin(compilation, options) {
	this.compilation = compilation;
	this.sourceMapComment = options.append || "//# sourceMappingURL=[url]";
	this.moduleFilenameTemplate = options.moduleFilenameTemplate || "webpack:///[resource-path]?[hash]";
	this.options = options;
}
module.exports = EvalSourceMapDevToolModuleTemplatePlugin;

EvalSourceMapDevToolModuleTemplatePlugin.prototype.apply = function(moduleTemplate) {
	var self = this;
	var options = this.options;
	moduleTemplate.plugin("module", function(source, module) {
		if(source.__EvalSourceMapDevToolData)
			return source.__EvalSourceMapDevToolData;
		var sourceMap;
		var content;
		if(source.sourceAndMap) {
			var sourceAndMap = source.sourceAndMap(options);
			sourceMap = sourceAndMap.map;
			content = sourceAndMap.source;
		} else {
			sourceMap = source.map(options);
			content = source.source();
		}
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
		sourceMap.sourceRoot = options.sourceRoot || "";
		sourceMap.file = module.id + ".js";
		var footer = self.sourceMapComment.replace(/\[url\]/g, "data:application/json;charset=utf-8;base64," + new Buffer(JSON.stringify(sourceMap)).toString("base64"));
		source.__EvalSourceMapDevToolData = new RawSource("eval(" + JSON.stringify(content + footer) + ");");
		return source.__EvalSourceMapDevToolData;
	});
	moduleTemplate.plugin("hash", function(hash) {
		hash.update("eval-source-map");
		hash.update("1");
	});
};
