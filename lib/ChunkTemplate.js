/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");
var Template = require("./Template");

function ChunkTemplate(outputOptions) {
	Template.call(this, outputOptions);
}

module.exports = ChunkTemplate;

ChunkTemplate.prototype = Object.create(Template.prototype);
ChunkTemplate.prototype.render = function(chunk, moduleTemplate, dependencyTemplates) {
	var modules = this.renderChunkModules(chunk, moduleTemplate, dependencyTemplates);
	var core = this.applyPluginsWaterfall("modules", modules, chunk, moduleTemplate, dependencyTemplates);
	var source = this.applyPluginsWaterfall("render", core, chunk, moduleTemplate, dependencyTemplates);
	if(chunk.modules.some(function(module) {
		return (module.id === 0);
	})) {
		source = this.applyPluginsWaterfall("render-with-entry", source, chunk);
	}
	chunk.rendered = true;
	return new ConcatSource(source, ";");
};

ChunkTemplate.prototype.updateHash = function(hash) {
	hash.update("ChunkTemplate");
	hash.update("2");
	this.applyPlugins("hash", hash);
};