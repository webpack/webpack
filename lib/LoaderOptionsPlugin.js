/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ModuleFilenameHelpers = require("./ModuleFilenameHelpers");

const filterSet = {
	include: true,
	exclude: true,
	test: true
};

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
					var keyOptions = Object.keys(options);
					for(var indexOption = 0; indexOption < keyOptions.length; indexOption++) {
						var key = keyOptions[indexOption];

						if(filterSet[key]) {
							continue;
						}

						context[key] = options[key];
					}
				}
			});
		});
	}
}

module.exports = LoaderOptionsPlugin;
