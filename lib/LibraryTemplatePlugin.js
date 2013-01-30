/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var SetVarMainTemplateDecorator = require("./SetVarMainTemplateDecorator");
var CommonJsMainTemplateDecorator = require("./CommonJsMainTemplateDecorator");

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
		compiler.mainTemplate = new SetVarMainTemplateDecorator(compiler.mainTemplate, "this[" + JSON.stringify(this.name) + "]");
		break;
	case "window":
		compiler.mainTemplate = new SetVarMainTemplateDecorator(compiler.mainTemplate, "window[" + JSON.stringify(this.name) + "]");
		break;
	case "commonjs":
		compiler.mainTemplate = new SetVarMainTemplateDecorator(compiler.mainTemplate, "exports[" + JSON.stringify(this.name) + "]");
		break;
	case "commonjs2":
		compiler.mainTemplate = new CommonJsMainTemplateDecorator(compiler.mainTemplate);
		break;
	default:
		throw new Error(this.target + " is not a valid Library target");
	}
};