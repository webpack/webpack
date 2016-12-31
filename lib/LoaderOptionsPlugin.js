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
				let i = resource.includes("?");
				if(ModuleFilenameHelpers.matchObject(options, !i ? resource : resource.substr(0, i))) {
					Object.keys(options)
						.filter((key) => !["include", "exclude", "test"].includes(key))
						.forEach((key) => context[key] = options[key]);
				}
			});
		});
	}
}

module.exports = LoaderOptionsPlugin;
