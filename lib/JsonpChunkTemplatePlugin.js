/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");
var Template = require("./Template");

function JsonpChunkTemplatePlugin() {}
module.exports = JsonpChunkTemplatePlugin;

JsonpChunkTemplatePlugin.prototype.apply = function(chunkTemplate) {
	chunkTemplate.plugin("render", function(modules, chunk) {
		var jsonpFunction = this.outputOptions.jsonpFunction || Template.toIdentifier("webpackJsonp" + (this.outputOptions.library || ""));
		var source = new ConcatSource();
		source.add(jsonpFunction + "(" + JSON.stringify(chunk.ids) + ",");
		source.add(modules);
		var entries = chunk.modules.filter(function(m) {
			return m.entry;
		}).map(function(m) {
			return m.id;
		});
		if(entries.length > 0) {
			source.add("," + JSON.stringify(entries));
		}
		source.add(")");
		return source;
	});
	chunkTemplate.plugin("hash", function(hash) {
		hash.update("JsonpChunkTemplatePlugin");
		hash.update("3");
		hash.update(this.outputOptions.jsonpFunction + "");
		hash.update(this.outputOptions.library + "");
	});
};
