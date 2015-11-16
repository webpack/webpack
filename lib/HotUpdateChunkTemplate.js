/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Template = require("./Template");

function HotUpdateChunkTemplate(outputOptions) {
	Template.call(this, outputOptions);
}

module.exports = HotUpdateChunkTemplate;

HotUpdateChunkTemplate.prototype = Object.create(Template.prototype);
HotUpdateChunkTemplate.prototype.render = function(id, modules, hash, moduleTemplate, dependencyTemplates) {
	var modulesSource = this.renderChunkModules({
		id: id,
		modules: modules
	}, moduleTemplate, dependencyTemplates);
	var core = this.applyPluginsWaterfall("modules", modulesSource, modules, moduleTemplate, dependencyTemplates);
	var source = this.applyPluginsWaterfall("render", core, modules, hash, id, moduleTemplate, dependencyTemplates);
	return source;
};

HotUpdateChunkTemplate.prototype.updateHash = function(hash) {
	hash.update("HotUpdateChunkTemplate");
	hash.update("1");
	this.applyPlugins("hash", hash);
};
