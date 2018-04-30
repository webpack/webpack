/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const createHash = require("./util/createHash");
const RequestShortener = require("./RequestShortener");

const getHash = str => {
	const hash = createHash("md4");
	hash.update(str);
	return hash.digest("hex").substr(0, 4);
};

class NamedModulesPlugin {
	constructor(options) {
		this.options = options || {};
	}

	apply(compiler) {
		compiler.hooks.compilation.tap("NamedModulesPlugin", compilation => {
			compilation.hooks.beforeModuleIds.tap("NamedModulesPlugin", modules => {
				const namedModules = new Map();

				for (const module of modules) {
					if (module.id === null && module.libIdent) {
						module.id = module.libIdent({
							context: this.options.context || compiler.options.context
						});
					}

					if (module.id !== null) {
						if (namedModules.has(module.id)) {
							namedModules.get(module.id).push(module);
						} else {
							namedModules.set(module.id, [module]);
						}
					}
				}

				namedModules.forEach(namedModule => {
					if (namedModule.length > 1) {
						namedModule.forEach(module => {
							if (module.issuer && module.issuer.id) {
								const requestShortener = new RequestShortener(module.context);
								module.id = `${module.id}?${getHash(
									requestShortener.shorten(module.identifier())
								)}`;
							}
						});
					}
				});
			});
		});
	}
}

module.exports = NamedModulesPlugin;
