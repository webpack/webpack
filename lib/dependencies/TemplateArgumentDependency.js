/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
"use strict";
const Dependency = require("../Dependency");
class Template {
	apply(dep, source, outputOptions, requestShortener, dependencyTemplates) {
		const d = dep.dep;
		const template = dependencyTemplates.get(d.constructor);
		if(!template) {
			throw new Error(`No template for dependency: ${d.constructor.name}`);
		}
		if(!template.applyAsTemplateArgument) {
			throw new Error(`Template cannot be applied as TemplateArgument: ${d.constructor.name}`);
		}
		return template.applyAsTemplateArgument(dep.name, d, source, outputOptions, requestShortener, dependencyTemplates);
	}
}
class TemplateArgumentDependency extends Dependency {
	constructor(name, dep) {
		super();
		this.name = name;
		this.dep = dep;
	}

	updateHash(hash) {
		hash.update(this.name);
	}
}
TemplateArgumentDependency.Template = Template;
TemplateArgumentDependency.prototype.type = "template argument";
module.exports = TemplateArgumentDependency;
