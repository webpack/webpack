/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("./Template");

module.exports = class HotUpdateChunkTemplate extends Template {
	constructor(outputOptions) {
		super(outputOptions);
	}

	render(id, modules, removedModules, hash, moduleTemplate, dependencyTemplates) {
		let modulesSource = this.renderChunkModules({
			id: id,
			modules: modules,
			removedModules: removedModules
		}, moduleTemplate, dependencyTemplates);
		let core = this.applyPluginsWaterfall("modules", modulesSource, modules, removedModules, moduleTemplate, dependencyTemplates);
		let source = this.applyPluginsWaterfall("render", core, modules, removedModules, hash, id, moduleTemplate, dependencyTemplates);
		return source;
	}

	updateHash(hash) {
		hash.update("HotUpdateChunkTemplate");
		hash.update("1");
		this.applyPlugins("hash", hash);
	}
};
