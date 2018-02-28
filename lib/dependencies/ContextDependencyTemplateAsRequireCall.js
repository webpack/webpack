/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class ContextDependencyTemplateAsRequireCall {
	apply(dep, source, runtime) {
		const moduleExports = runtime.moduleExports({
			module: dep.module,
			request: dep.request
		});

		if (dep.module) {
			if (dep.valueRange) {
				if (Array.isArray(dep.replaces)) {
					for (let i = 0; i < dep.replaces.length; i++) {
						const rep = dep.replaces[i];
						source.replace(rep.range[0], rep.range[1] - 1, rep.value);
					}
				}
				source.replace(dep.valueRange[1], dep.range[1] - 1, ")");
				source.replace(
					dep.range[0],
					dep.valueRange[0] - 1,
					`${moduleExports}(${
						typeof dep.prepend === "string" ? JSON.stringify(dep.prepend) : ""
					}`
				);
			} else {
				source.replace(dep.range[0], dep.range[1] - 1, moduleExports);
			}
		} else {
			source.replace(dep.range[0], dep.range[1] - 1, moduleExports);
		}
	}
}
module.exports = ContextDependencyTemplateAsRequireCall;
