"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ModuleFilenameHelpers = require("./ModuleFilenameHelpers");
class LoaderOptionsPlugin {
	constructor(options) {
		if(typeof options !== "object") {
			options = {};
		}
		if(!options.test) {
			// seems like act as a RegExp
			options.test = {
				test() {
					return true;
				}
			};
		}
		this.options = options;
	}

	apply(compiler) {
		const options = this.options;
		compiler.plugin("compilation", function(compilation) {
			compilation.plugin("normal-module-loader", function(context, module) {
				const resource = module.resource;
				if(!resource) {
					return;
				}
				const i = resource.indexOf("?");
				if(ModuleFilenameHelpers.matchObject(options, i < 0 ? resource : resource.substr(0, i))) {
					Object.keys(options)
						.filter(key => ["include", "exclude", "test"].indexOf(key) < 0)
						.forEach(key => {
							context[key] = options[key];
						});
				}
			});
		});
	}
}
module.exports = LoaderOptionsPlugin;
