/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var SetVarMainTemplateDecorator = require("./SetVarMainTemplateDecorator");

function LibraryTemplatePlugin(name, target) {
	this.name = name;
	this.target = target;
}
module.exports = LibraryTemplatePlugin;
LibraryTemplatePlugin.prototype.apply = function(compiler) {
	switch(this.target) {
	case "var":
		compiler.mainTemplate = new SetVarMainTemplateDecorator(compiler.mainTemplate, "var " + this.name);
		break;
	case "this":
		if(this.name)
			compiler.mainTemplate = new SetVarMainTemplateDecorator(compiler.mainTemplate, "this[" + JSON.stringify(this.name) + "]");
		else
			compiler.mainTemplate = new SetVarMainTemplateDecorator(compiler.mainTemplate, "this", true);
		break;
	case "window":
		if(this.name)
			compiler.mainTemplate = new SetVarMainTemplateDecorator(compiler.mainTemplate, "window[" + JSON.stringify(this.name) + "]");
		else
			compiler.mainTemplate = new SetVarMainTemplateDecorator(compiler.mainTemplate, "window", true);
		break;
	case "commonjs":
		if(this.name)
			compiler.mainTemplate = new SetVarMainTemplateDecorator(compiler.mainTemplate, "exports[" + JSON.stringify(this.name) + "]");
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