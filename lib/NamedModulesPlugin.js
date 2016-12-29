/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class NamedModulesPlugin {
	constructor(options) {
		this.options = options || {};
	}

	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("before-module-ids", (modules) => {
				modules.forEach((module) => {
					if(module.id === null && module.libIdent) {
						module.id = module.libIdent({
							context: this.options.context || compiler.options.context
						});
					}
				});
			});
		});
	}
}

module.exports = NamedModulesPlugin;
