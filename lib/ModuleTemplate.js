/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Template = require("./Template");

function ModuleTemplate(outputOptions) {
	Template.call(this, outputOptions);
}
module.exports = ModuleTemplate;

ModuleTemplate.prototype = Object.create(Template.prototype);
ModuleTemplate.prototype.render = function(module, dependencyTemplates, chunk) {
	var moduleSource = module.source(dependencyTemplates, this.outputOptions, this.requestShortener);
	moduleSource = this.applyPluginsWaterfall("module", moduleSource, module, chunk, dependencyTemplates);
	moduleSource = this.applyPluginsWaterfall("render", moduleSource, module, chunk, dependencyTemplates);
	return this.applyPluginsWaterfall("package", moduleSource, module, chunk, dependencyTemplates);
};

ModuleTemplate.prototype.updateHash = function(hash) {
	hash.update("1");
	this.applyPlugins("hash", hash);
};
