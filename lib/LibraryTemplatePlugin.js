/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var SetVarMainTemplatePlugin = require("./SetVarMainTemplatePlugin");

function accessorToObjectAccess(accessor) {
	return accessor.map(function(a) {
		return "[" + JSON.stringify(a) + "]";
	}).join("");
}

function accessorAccess(base, accessor, joinWith) {
	accessor = [].concat(accessor);
	return accessor.map(function(a, idx) {
		a = base ?
			base + accessorToObjectAccess(accessor.slice(0, idx + 1)) :
			accessor[0] + accessorToObjectAccess(accessor.slice(1, idx + 1));
		if(idx === accessor.length - 1) return a;
		if(idx === 0 && typeof base === "undefined") return a + " = typeof " + a + " === \"object\" ? " + a + " : {}";
		return a + " = " + a + " || {}";
	}).join(joinWith || "; ");
}

function LibraryTemplatePlugin(name, target, umdNamedDefine, auxiliaryComment) {
	this.name = name;
	this.target = target;
	this.umdNamedDefine = umdNamedDefine;
	this.auxiliaryComment = auxiliaryComment;
}
module.exports = LibraryTemplatePlugin;
LibraryTemplatePlugin.prototype.apply = function(compiler) {
	compiler.plugin("this-compilation", function(compilation) {
		switch(this.target) {
			case "var":
				compilation.apply(new SetVarMainTemplatePlugin("var " + accessorAccess(false, this.name)));
				break;
			case "assign":
				compilation.apply(new SetVarMainTemplatePlugin(accessorAccess(undefined, this.name)));
				break;
			case "this":
			case "window":
			case "global":
				if(this.name)
					compilation.apply(new SetVarMainTemplatePlugin(accessorAccess(this.target, this.name)));
				else
					compilation.apply(new SetVarMainTemplatePlugin(this.target, true));
				break;
			case "commonjs":
				if(this.name)
					compilation.apply(new SetVarMainTemplatePlugin(accessorAccess("exports", this.name)));
				else
					compilation.apply(new SetVarMainTemplatePlugin("exports", true));
				break;
			case "commonjs2":
			case "commonjs-module":
				compilation.apply(new SetVarMainTemplatePlugin("module.exports"));
				break;
			case "amd":
				var AmdMainTemplatePlugin = require("./AmdMainTemplatePlugin");
				compilation.apply(new AmdMainTemplatePlugin(this.name));
				break;
			case "umd":
			case "umd2":
				var UmdMainTemplatePlugin = require("./UmdMainTemplatePlugin");
				compilation.apply(new UmdMainTemplatePlugin(this.name, {
					optionalAmdExternalAsGlobal: this.target === "umd2",
					namedDefine: this.umdNamedDefine,
					auxiliaryComment: this.auxiliaryComment
				}));
				break;
			case "jsonp":
				var JsonpExportMainTemplatePlugin = require("./JsonpExportMainTemplatePlugin");
				compilation.apply(new JsonpExportMainTemplatePlugin(this.name));
				break;
			default:
				throw new Error(this.target + " is not a valid Library target");
		}
	}.bind(this));
};
