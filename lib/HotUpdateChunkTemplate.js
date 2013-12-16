/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");
var Template = require("./Template");

function HotUpdateChunkTemplate(outputOptions) {
	Template.call(this, outputOptions);
}

module.exports = HotUpdateChunkTemplate;

HotUpdateChunkTemplate.prototype = Object.create(Template.prototype);
HotUpdateChunkTemplate.prototype.render = function(id, modules, hash, moduleTemplate, dependencyTemplates) {
	var source = new ConcatSource();
	source.add(this.asString(this.renderHeader(id, modules, hash)));
	source.add(this.renderChunkModules({
		id: id,
		modules: modules
	}, moduleTemplate, dependencyTemplates));
	source.add(this.asString(this.renderFooter(id, modules, hash)));
	return source;
};

HotUpdateChunkTemplate.prototype.renderHeader = function(id, modules, hash) {
	return [];
};

HotUpdateChunkTemplate.prototype.renderFooter = function(id, modules, hash) {
	return [];
};

HotUpdateChunkTemplate.prototype.updateHash = function(hash) {
	hash.update("HotUpdateChunkTemplate");
	hash.update("1");
};