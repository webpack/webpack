"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const NullDependency = require("./NullDependency");
class Template {
	apply(dep, source, outputOptions, requestShortener) {
		source.replace(dep.range[0], dep.range[1] - 1, "__webpack_require__");
	}

	applyAsTemplateArgument(name, dep, source) {
		source.replace(dep.range[0], dep.range[1] - 1, "require");
	}
}
class RequireHeaderDependency extends NullDependency {
	constructor(range) {
		if(!Array.isArray(range)) {
			throw new Error("range must be valid");
		}
		super();
		this.range = range;
	}
}
RequireHeaderDependency.Template = Template;
module.exports = RequireHeaderDependency;
