/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("./Template");
const SyncWaterfallHook = require("tapable").SyncWaterfallHook;
const SyncHook = require("tapable").SyncHook;

module.exports = class ModuleTemplate extends Template {
	constructor(outputOptions, requestShortener) {
		super(outputOptions);
		this.requestShortener = requestShortener;
		this.hooks = {
			content: new SyncWaterfallHook(["source", "module", "options", "dependencyTemplates"]),
			module: new SyncWaterfallHook(["source", "module", "options", "dependencyTemplates"]),
			render: new SyncWaterfallHook(["source", "module", "options", "dependencyTemplates"]),
			package: new SyncWaterfallHook(["source", "module", "options", "dependencyTemplates"]),
			hash: new SyncHook(["hash"])
		};
	}

	render(module, dependencyTemplates, options) {
		const moduleSource = module.source(dependencyTemplates, this.outputOptions, this.requestShortener);
		const moduleSourcePostContent = this.hooks.content.call(moduleSource, module, options, dependencyTemplates);
		const moduleSourcePostModule = this.hooks.module.call(moduleSourcePostContent, module, options, dependencyTemplates);
		const moduleSourcePostRender = this.hooks.render.call(moduleSourcePostModule, module, options, dependencyTemplates);
		return this.hooks.package.call(moduleSourcePostRender, module, options, dependencyTemplates);
	}

	updateHash(hash) {
		hash.update("1");
		this.hooks.hash.call(hash);
	}
};
