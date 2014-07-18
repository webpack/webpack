/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var RequestShortener = require("./RequestShortener");
var Template = require("./Template");
var ConcatSource = require("webpack-core/lib/ConcatSource");
var RawSource = require("webpack-core/lib/RawSource");

function SourceMapDevToolPlugin(sourceMapFilename, sourceMappingURLComment, moduleFilename) {
	this.sourceMapFilename = sourceMapFilename;
	this.sourceMappingURLComment = sourceMappingURLComment || "\n//# sourceMappingURL=[url]";
	this.moduleFilename = moduleFilename || "[name]?[loaders]";
}
module.exports = SourceMapDevToolPlugin;
SourceMapDevToolPlugin.prototype.apply = function(compiler) {
	var sourceMapFilename = this.sourceMapFilename;
	var sourceMappingURLComment = this.sourceMappingURLComment;
	var moduleFilename = this.moduleFilename;
	var requestShortener = new RequestShortener(compiler.context);
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("build-module", function(module) {
			module.useSourceMap = true;
		});
		compilation.plugin("after-optimize-chunk-assets", function(chunks) {
			chunks.forEach(function(chunk) {
				chunk.files.slice().forEach(function(file) {
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
						for(var i = 0; i < sourceMap.sources.length; i++) {
							var source = sourceMap.sources[i];
							var str, name, loaders;
							var module = compilation.findModule(source);
							if(module)
								str = module.readableIdentifier(requestShortener);
							else
								str = requestShortener.shorten(source);
							str = str.split("!");
							name = str.pop();
							loaders = str.join("!");
							str = moduleFilename
								.replace(/\[name\]/gi, name)
								.replace(/\[loaders\]/gi, loaders)
								.replace(/\[id\]/gi, module && module.id || '');
							var idx;
							while((idx = sourceMap.sources.indexOf(str)) && (idx >= 0) && (idx < i)) {
								str += "*";
							}
							sourceMap.sources[i] = str;
						}
						sourceMap.sourceRoot = "webpack-module://";
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
					}
				}, this);
			}, this);
		});
	});
};

function basename(name) {
	if(name.indexOf("/") < 0) return name;
	return name.substr(name.lastIndexOf("/")+1);
}

