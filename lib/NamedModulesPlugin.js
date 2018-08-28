/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RequestShortener = require("./RequestShortener");
const createHash = require("./util/createHash");

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
				const chunkGraph = compilation.chunkGraph;
				const namedModules = new Map();
				const context = this.options.context || compiler.options.context;

				for (const module of modules) {
					let moduleId = chunkGraph.getModuleId(module);
					if (moduleId === null) {
						const id = module.libIdent({ context });
						if (id) {
							moduleId = id;
							chunkGraph.setModuleId(module, id);
						}
					}

					if (moduleId !== null) {
						const namedModule = namedModules.get(moduleId);
						if (namedModule !== undefined) {
							namedModule.push(module);
						} else {
							namedModules.set(moduleId, [module]);
						}
					}
				}

				for (const namedModule of namedModules.values()) {
					if (namedModule.length > 1) {
						for (const module of namedModule) {
							const requestShortener = new RequestShortener(context);
							chunkGraph.setModuleId(
								module,
								`${chunkGraph.getModuleId(module)}?${getHash(
									requestShortener.shorten(module.identifier())
								)}`
							);
						}
					}
				}
			});
		});
	}
}

module.exports = NamedModulesPlugin;
