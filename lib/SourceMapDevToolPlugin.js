/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var RequestShortener = require("./RequestShortener");
var Template = require("./Template");
var ConcatSource = require("webpack-core/lib/ConcatSource");
var RawSource = require("webpack-core/lib/RawSource");
var ModuleFilenameHelpers = require("./ModuleFilenameHelpers");

function SourceMapDevToolPlugin(sourceMapFilename, sourceMappingURLComment, moduleFilenameTemplate, fallbackModuleFilenameTemplate) {
	this.sourceMapFilename = sourceMapFilename;
	this.sourceMappingURLComment = sourceMappingURLComment || "\n//# sourceMappingURL=[url]";
	this.moduleFilenameTemplate = moduleFilenameTemplate || "webpack:///[resourcePath]";
	this.fallbackModuleFilenameTemplate = fallbackModuleFilenameTemplate || "webpack:///[resourcePath]?[hash]";
}
module.exports = SourceMapDevToolPlugin;
SourceMapDevToolPlugin.prototype.apply = function(compiler) {
	var sourceMapFilename = this.sourceMapFilename;
	var sourceMappingURLComment = this.sourceMappingURLComment;
	var moduleFilenameTemplate = this.moduleFilenameTemplate;
	var fallbackModuleFilenameTemplate = this.fallbackModuleFilenameTemplate;
	var requestShortener = new RequestShortener(compiler.context);
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("build-module", function(module) {
			module.useSourceMap = true;
		});
		compilation.plugin("after-optimize-chunk-assets", function(chunks) {
			var allModules = [];
			var allModuleFilenames = [];
			var tasks = [];
			chunks.forEach(function(chunk) {
				chunk.files.slice().map(function(file) {
					var asset = this.assets[file];
					if(asset.__SourceMapDevTool_Data) {
						var data = asset.__SourceMapDevTool_Data;
						for(var file in data) {
							this.assets[file] = data[file];
						}
						return;
					}
					var sourceMap = asset.map();
					if(sourceMap) {
						return {
							chunk: chunk,
							file: file,
							asset: asset,
							sourceMap: sourceMap
						}
					}
				}, this).filter(Boolean).map(function(task) {
					var modules = task.sourceMap.sources.map(function(source) {
						var module = compilation.findModule(source);
						return module || source;
					});
					var moduleFilenames = modules.map(function(module) {
						return ModuleFilenameHelpers.createFilename(module, moduleFilenameTemplate, requestShortener);
					});
					task.modules = modules;
					task.moduleFilenames = moduleFilenames;
					return task;
				}, this).forEach(function(task) {
					allModules = allModules.concat(task.modules);
					allModuleFilenames = allModuleFilenames.concat(task.moduleFilenames);
					tasks.push(task);
				}, this);
			}, this);
			allModuleFilenames = ModuleFilenameHelpers.replaceDuplicates(allModuleFilenames, function(filename, i) {
				return ModuleFilenameHelpers.createFilename(allModules[i], fallbackModuleFilenameTemplate, requestShortener);
			}, function(ai, bi) {
				var a = allModules[ai];
				var b = allModules[bi];
				a = typeof a === "string" ? a : a.identifier();
				b = typeof b === "string" ? b : b.identifier();
				return a.length - b.length;
			});
			allModuleFilenames = ModuleFilenameHelpers.replaceDuplicates(allModuleFilenames, function(filename, i, n) {
				for(var j = 0; j < n; j++)
					filename += "*";
				return filename;
			});
			tasks.forEach(function(task) {
				task.moduleFilenames = allModuleFilenames.slice(0, task.moduleFilenames.length);
				allModuleFilenames = allModuleFilenames.slice(task.moduleFilenames.length);
			}, this);
			tasks.forEach(function(task) {
				var chunk = task.chunk;
				var file = task.file;
				var asset = task.asset;
				var sourceMap = task.sourceMap;
				var moduleFilenames = task.moduleFilenames;
				var modules = task.modules;
				sourceMap.sources = moduleFilenames;
				if(sourceMap.sourcesContent) {
					sourceMap.sourcesContent = sourceMap.sourcesContent.map(function(content, i) {
						return content + "\n\n\n" + ModuleFilenameHelpers.createFooter(modules[i], requestShortener);
					});
				}
				sourceMap.sourceRoot = "";
				sourceMap.file = file;
				asset.__SourceMapDevTool_Data = {};
				if(sourceMapFilename) {
					var filename = file, query = "";
					var idx = filename.indexOf("?");
					if(idx >= 0) {
						query = filename.substr(idx);
						filename = filename.substr(0, idx);
					}
					var sourceMapFile = sourceMapFilename
						.replace(Template.REGEXP_FILE, filename)
						.replace(Template.REGEXP_QUERY, query)
						.replace(Template.REGEXP_FILEBASE, basename(filename))
						.replace(Template.REGEXP_HASH, this.hash)
						.replace(Template.REGEXP_ID, chunk.id);
					var sourceMapUrl = path.relative(path.dirname(file), sourceMapFile).replace(/\\/g, "/");
					asset.__SourceMapDevTool_Data[file] = this.assets[file] = new ConcatSource(asset, sourceMappingURLComment.replace(/\[url\]/g, sourceMapUrl));
					asset.__SourceMapDevTool_Data[sourceMapFile] = this.assets[sourceMapFile] = new RawSource(JSON.stringify(sourceMap));
					chunk.files.push(sourceMapFile);
				} else {
					asset.__SourceMapDevTool_Data[file] = this.assets[file] = new ConcatSource(asset, sourceMappingURLComment.replace(/\[url\]/g, "data:application/json;base64," + new Buffer(JSON.stringify(sourceMap)).toString("base64")));
				}
			}, this);
		});
	});
};

function basename(name) {
	if(name.indexOf("/") < 0) return name;
	return name.substr(name.lastIndexOf("/")+1);
}

