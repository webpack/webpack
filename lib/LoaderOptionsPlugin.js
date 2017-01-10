/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ModuleFilenameHelpers = require("./ModuleFilenameHelpers");

class LoaderOptionsPlugin {
	constructor(options) {
		if(typeof options !== "object") options = {};
		if(!options.test) options.test = {
			test: () => true
		};
		this.options = options;
	}

	apply(compiler) {
		let options = this.options;
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("normal-module-loader", (context, module) => {
				let resource = module.resource;
				if(!resource) return;
				let i = resource.indexOf("?");
				if(ModuleFilenameHelpers.matchObject(options, i < 0 ? resource : resource.substr(0, i))) {
					let filterSet = new Set(["include", "exclude", "test"]);
					Object.keys(options)
						.filter((key) => !filterSet.has(key))
						.forEach((key) => context[key] = options[key]);
				}
			});
		});
	}
}

module.exports = LoaderOptionsPlugin;
