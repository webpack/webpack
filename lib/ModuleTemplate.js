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

	// TODO move chunk into extra options object, it's not available i. e. in wasm modules
	render(module, dependencyTemplates, chunk) {
		const moduleSource = module.source(dependencyTemplates, this.outputOptions, this.requestShortener);
		const moduleSourcePostModule = this.applyPluginsWaterfall("module", moduleSource, module, chunk, dependencyTemplates);
		const moduleSourcePostRender = this.applyPluginsWaterfall("render", moduleSourcePostModule, module, chunk, dependencyTemplates);
		return this.applyPluginsWaterfall("package", moduleSourcePostRender, module, chunk, dependencyTemplates);
	}

	updateHash(hash) {
		hash.update("1");
		this.applyPlugins("hash", hash);
	}
};
