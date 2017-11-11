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

	render(module, dependencyTemplates, options) {
		const moduleSource = module.source(dependencyTemplates, this.outputOptions, this.requestShortener);
		const moduleSourcePostContent = this.applyPluginsWaterfall("content", moduleSource, module, options, dependencyTemplates);
		const moduleSourcePostModule = this.applyPluginsWaterfall("module", moduleSourcePostContent, module, options, dependencyTemplates);
		const moduleSourcePostRender = this.applyPluginsWaterfall("render", moduleSourcePostModule, module, options, dependencyTemplates);
		return this.applyPluginsWaterfall("package", moduleSourcePostRender, module, options, dependencyTemplates);
	}

	updateHash(hash) {
		hash.update("1");
		this.applyPlugins("hash", hash);
	}
};
