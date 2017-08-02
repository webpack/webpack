/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class PureModulePlugin {

	apply(compiler) {
		compiler.plugin("normal-module-factory", nmf => {
			nmf.plugin("module", (module, data) => {
				const resolveData = data.resourceResolveData;
				if(module.meta && resolveData && resolveData.descriptionFileData && resolveData.relativePath) {
					const pureModule = resolveData.descriptionFileData["pure-module"];
					const isPure = pureModule === true; // TODO allow more complex expressions
					if(isPure) {
						module.meta.pureModule = true;
					}
				}

				return module;
			});
		});
	}
}
module.exports = PureModulePlugin;
