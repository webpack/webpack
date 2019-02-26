/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("../Template");

class ModuleDependencyTemplateAsId {
	apply(dep, source, runtime) {
		if (!dep.range) return;

		if (dep.module && dep.module.externalType === "amd") {
			const content = `__WEBPACK_EXTERNAL_MODULE_${Template.toIdentifier(
				`${dep.module.request}`
			)}__`;

			source.replace(dep.range[0] - 1, dep.range[1], content);
		} else {
			const content = runtime.moduleId({
				module: dep.module,
				request: dep.request
			});

			source.replace(dep.range[0], dep.range[1] - 1, content);
		}
	}
}
module.exports = ModuleDependencyTemplateAsId;
