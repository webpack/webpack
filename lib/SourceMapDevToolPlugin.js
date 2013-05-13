/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var RequestShortener = require("./RequestShortener");
var Template = require("./Template");
var ConcatSource = require("webpack-core/lib/ConcatSource");
var RawSource = require("webpack-core/lib/RawSource");
var base64Encode = require("base64-encode");

function SourceMapDevToolPlugin(context, sourceMapFilename) {
	this.context = context;
	this.sourceMapFilename = sourceMapFilename;
}
module.exports = SourceMapDevToolPlugin;
SourceMapDevToolPlugin.prototype.apply = function(compiler) {
	var sourceMapFilename = this.sourceMapFilename;
	var requestShortener = new RequestShortener(this.context);
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("after-optimize-chunk-assets", function(chunks) {
			chunks.forEach(function(chunk) {
				chunk.files.slice().forEach(function(file) {
					var asset = this.assets[file];
					var sourceMap = asset.map();
					if(sourceMap) {
						for(var i = 0; i < sourceMap.sources.length; i++) {
							var source = sourceMap.sources[i];
							var str;
							var module = compilation.findModule(source);
							if(module)
								str = module.readableIdentifier(requestShortener);
							else
								str = requestShortener.shorten(source);
							while(str.indexOf("?") >= 0 && str.indexOf("?") < str.lastIndexOf("!"))
								str = str.replace(/\?/, "(query)");
							var idx;
							while((idx = sourceMap.sources.indexOf(str) >= 0) && (idx < i)) {
								str += "*";
							}
							sourceMap.sources[i] = str;
						}
						sourceMap.sourceRoot = "webpack-module://";
						if(sourceMapFilename) {
							var sourceMapFile = sourceMapFilename
								.replace(Template.REGEXP_FILE, file)
								.replace(Template.REGEXP_FILEBASE, basename(file))
								.replace(Template.REGEXP_HASH, this.hash)
								.replace(Template.REGEXP_ID, chunk.id);
							this.assets[file] = new ConcatSource(asset, "\n/*\n//@ sourceMappingURL=" + sourceMapFile + "\n*/");
							this.assets[sourceMapFile] = new RawSource(JSON.stringify(sourceMap));
							chunk.files.push(sourceMapFile);
						} else {
							this.assets[file] = new ConcatSource(asset, "\n/*\n//@ sourceMappingURL=data:application/json;base64," + base64Encode(JSON.stringify(sourceMap)) + "\n*/");
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