/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var SetVarMainTemplateDecorator = require("./SetVarMainTemplateDecorator");

function accessorToObjectAccess(accessor) {
	return accessor.map(function(a) {
		return "[" + JSON.stringify(a) + "]";
	}).join("");
}

function accessorAccess(base, accessor, joinWith) {
	accessor = [].concat(accessor);
	return accessor.map(function(a, idx) {
		a = base ? base + accessorToObjectAccess(accessor.slice(0, idx+1)) : accessor[0] + accessorToObjectAccess(accessor.slice(1, idx+1));
		if(idx === accessor.length - 1) return a;
		if(idx === 0 && typeof base === "undefined") return a + " = typeof " + a + " === \"object\" ? " + a + " : {}";
		return a + " = " + a + " || {}";
	}).join(joinWith || "; ");
}

function LibraryTemplatePlugin(name, target) {
	this.name = name;
	this.target = target;
}
module.exports = LibraryTemplatePlugin;
LibraryTemplatePlugin.prototype.apply = function(compiler) {
	switch(this.target) {
	case "var":
		compiler.mainTemplate = new SetVarMainTemplateDecorator(compiler.mainTemplate, "var " + accessorAccess(false, this.name));
		break;
	case "assign":
		compiler.mainTemplate = new SetVarMainTemplateDecorator(compiler.mainTemplate, accessorAccess(undefined, this.name));
		break;
	case "this":
	case "window":
	case "global":
		if(this.name)
			compiler.mainTemplate = new SetVarMainTemplateDecorator(compiler.mainTemplate, accessorAccess(this.target, this.name));
		else
			compiler.mainTemplate = new SetVarMainTemplateDecorator(compiler.mainTemplate, this.target, true);
		break;
	case "commonjs":
		if(this.name)
			compiler.mainTemplate = new SetVarMainTemplateDecorator(compiler.mainTemplate, accessorAccess("exports", this.name));
		else
			compiler.mainTemplate = new SetVarMainTemplateDecorator(compiler.mainTemplate, "exports", true);
		break;
	case "commonjs2":
		compiler.mainTemplate = new SetVarMainTemplateDecorator(compiler.mainTemplate, "module.exports");
		break;
	case "amd":
		var AmdMainTemplateDecorator = require("./AmdMainTemplateDecorator");
		compiler.mainTemplate = new AmdMainTemplateDecorator(compiler.mainTemplate, this.name);
		break;
	case "umd":
		var UmdMainTemplateDecorator = require("./UmdMainTemplateDecorator");
		compiler.mainTemplate = new UmdMainTemplateDecorator(compiler.mainTemplate, this.name);
		break;
	default:
		throw new Error(this.target + " is not a valid Library target");
	}
};