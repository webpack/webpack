/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");

function AmdMainTemplatePlugin(name) {
	this.name = name;
}
module.exports = AmdMainTemplatePlugin;
AmdMainTemplatePlugin.prototype.apply = function(compilation) {
	var mainTemplate = compilation.mainTemplate;
	compilation.templatesPlugin("render-with-entry", function(source, chunk, hash) {
		var externals = chunk.modules.filter(function(m) {
			return m.external;
		});
		var externalsDepsArray = JSON.stringify(externals.map(function(m) {
			return typeof m.request === "object" ? m.request.amd : m.request;
		}));
		var externalsArguments = externals.map(function(m) {
			return "__WEBPACK_EXTERNAL_MODULE_" + m.id + "__";
		}).join(", ");
		if(this.name) {
			var name = mainTemplate.applyPluginsWaterfall("asset-path", this.name, {
				hash: hash,
				chunk: chunk
			});
			return new ConcatSource("define(" + JSON.stringify(name) + ", " + externalsDepsArray + ", function(" + externalsArguments + ") { return ", source, "});");
		} else if(externalsArguments) {
			return new ConcatSource("define(" + externalsDepsArray + ", function(" + externalsArguments + ") { return ", source, "});");
		} else {
			return new ConcatSource("define(function() { return ", source, "});");
		}
	}.bind(this));
	mainTemplate.plugin("global-hash-paths", function(paths) {
		if (this.name) paths.push(this.name);
		return paths;
	}.bind(this));
	mainTemplate.plugin("hash", function(hash) {
		hash.update("exports amd");
		hash.update(this.name + "");
	}.bind(this));
};
