/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");
var ModuleFilenameHelpers = require("./ModuleFilenameHelpers");

function wrapComment(str) {
	if(str.indexOf("\n") < 0) return "/*! " + str + " */";
	return "/*!\n * " + str.split("\n").join("\n * ") + "\n */";
}

function BannerPlugin(banner, options) {
	this.options = options || {};
	this.banner = this.options.raw ? banner : wrapComment(banner);
}
module.exports = BannerPlugin;

BannerPlugin.prototype.apply = function(compiler) {
	var options = this.options;
	var banner = this.banner;

	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("optimize-chunk-assets", function(chunks, callback) {
			chunks.forEach(function(chunk) {
				if(options.entryOnly && !chunk.initial) return;
				chunk.files.filter(ModuleFilenameHelpers.matchObject.bind(undefined, options)).forEach(function(file) {
					compilation.assets[file] = new ConcatSource(banner, "\n", compilation.assets[file]);
				});
			});
			callback();
		});
	});
};
