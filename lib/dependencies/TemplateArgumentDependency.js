/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function TemplateArgumentDependency(name, dep) {
	this.name = name;
	this.Class = TemplateArgumentDependency;
	this.dep = dep;
}
module.exports = TemplateArgumentDependency;

TemplateArgumentDependency.prototype.constructor = TemplateArgumentDependency;
TemplateArgumentDependency.prototype.type = "template argument";

TemplateArgumentDependency.prototype.updateHash = function(hash) {
	hash.update(this.name);
};


TemplateArgumentDependency.Template = function TemplateArgumentDependencyTemplate() {};

TemplateArgumentDependency.Template.prototype.apply = function(dep, source, outputOptions, requestShortener, dependencyTemplates) {
	var d = dep.dep;
	var template = dependencyTemplates.get(d.Class);
	if(!template) throw new Error("No template for dependency: " + d.Class.name);
	if(!template.applyAsTemplateArgument) throw new Error("Template cannot be applied as TemplateArgument: " + d.Class.name);
	return template.applyAsTemplateArgument(dep.name, d, source, outputOptions, requestShortener, dependencyTemplates);
};
