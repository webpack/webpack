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
		compiler.hooks.compilation.tap("NamedModulesPlugin", compilation => {
			compilation.hooks.beforeModuleIds.tap("NamedModulesPlugin", modules => {
				let namedModules = {};

				for (const module of modules) {
					if (module.id === null && module.libIdent) {
						module.id = module.libIdent({
							context: this.options.context || compiler.options.context
						});
					}

					if (module.id) {
						(namedModules[module.id] && namedModules[module.id].push(module)) ||
							(namedModules[module.id] = Array.of(module));
					}
				}

				Object.keys(namedModules).forEach(key => {
					const namedModule = namedModules[key];
					if (namedModule.length > 1) {
						namedModule.forEach(module => {
							if (module.issuer && module.issuer.id) {
								module.id = `${module.issuer.id}~${module.id}`;
							}
						});
					}
				});
			});
		});
	}
}

module.exports = NamedModulesPlugin;
