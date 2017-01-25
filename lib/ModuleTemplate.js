/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("./Template");

module.exports = class ModuleTemplate extends Template {
	constructor(outputOptions) {
		super(outputOptions);
	}
	render(module, dependencyTemplates, chunk) {
		let moduleSource = module.source(dependencyTemplates, this.outputOptions, this.requestShortener);
		moduleSource = this.applyPluginsWaterfall("module", moduleSource, module, chunk, dependencyTemplates);
		moduleSource = this.applyPluginsWaterfall("render", moduleSource, module, chunk, dependencyTemplates);
		return this.applyPluginsWaterfall("package", moduleSource, module, chunk, dependencyTemplates);
	}
	updateHash(hash) {
		hash.update("1");
		this.applyPlugins("hash", hash);
	}
};
