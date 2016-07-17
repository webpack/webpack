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
HotUpdateChunkTemplate.prototype.constructor = HotUpdateChunkTemplate;

HotUpdateChunkTemplate.prototype.render = function(id, modules, removedModules, hash, moduleTemplate, dependencyTemplates) {
	var modulesSource = this.renderChunkModules({
		id: id,
		modules: modules,
		removedModules: removedModules
	}, moduleTemplate, dependencyTemplates);
	var core = this.applyPluginsWaterfall("modules", modulesSource, modules, removedModules, moduleTemplate, dependencyTemplates);
	var source = this.applyPluginsWaterfall("render", core, modules, removedModules, hash, id, moduleTemplate, dependencyTemplates);
	return source;
};

HotUpdateChunkTemplate.prototype.updateHash = function(hash) {
	hash.update("HotUpdateChunkTemplate");
	hash.update("1");
	this.applyPlugins("hash", hash);
};
