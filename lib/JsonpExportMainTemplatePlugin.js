/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-sources").ConcatSource;

function JsonpExportMainTemplatePlugin(names) {
	if (names && names.constructor !== Array) {
		names = [names];
	}
	this.names = names.length > 0 ? names : undefined;
}
module.exports = JsonpExportMainTemplatePlugin;
JsonpExportMainTemplatePlugin.prototype.apply = function(compilation) {
	var mainTemplate = compilation.mainTemplate;
	compilation.templatesPlugin("render-with-entry", function(source, chunk, hash) {
		return new ConcatSource(this.names.map(function(nameSrc) {
			var name = mainTemplate.applyPluginsWaterfall("asset-path", nameSrc || "", {
				hash: hash,
				chunk: chunk
			});
			return name + " && " + name + "(", source, ");";
		}).join(""));
	}.bind(this));
	mainTemplate.plugin("global-hash-paths", function(paths) {
		if(this.names) paths = paths.concat(this.names);
		return paths;
	}.bind(this));
	mainTemplate.plugin("hash", function(hash) {
		hash.update("jsonp export");
		if (this.names) {
			this.names.forEach(function(name) {
				hash.update(name + "");
			});
		}
	}.bind(this));
};
