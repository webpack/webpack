/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var SetVarMainTemplatePlugin = require("./SetVarMainTemplatePlugin");
var CommonJsHarmonyMainTemplatePlugin = require("./CommonJsHarmonyMainTemplatePlugin");

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

function LibraryTemplatePlugin(names, target, umdNamedDefine, auxiliaryComment) {
	if (names) {
		if (!Array.isArray(names)) {
			names = [names];
		}
		if (names.length > 0 && !Array.isArray(names[0])) {
			names = [names];
		}
	}
	this.names = names.length > 0 ? names : undefined;
	this.target = target;
	this.umdNamedDefine = umdNamedDefine;
	this.auxiliaryComment = auxiliaryComment;
}
module.exports = LibraryTemplatePlugin;
LibraryTemplatePlugin.prototype.apply = function(compiler) {
	compiler.plugin("this-compilation", function(compilation) {
		switch(this.target) {
			case "var":
				var varExpressions = this.names.map(function(name) {
					return accessorAccess(false, name);
				});
				compilation.apply(new SetVarMainTemplatePlugin(varExpressions, false, true));
				break;
			case "assign":
				var varExpressions = this.names.map(function(name) {
					return accessorAccess(undefined, name);
				});
				compilation.apply(new SetVarMainTemplatePlugin(varExpressions));
				break;
			case "this":
			case "window":
			case "global":
				if(this.names) {
					var varExpressions = this.names.map(function(name) {
						return accessorAccess(this.target, name);
					});
					compilation.apply(new SetVarMainTemplatePlugin(varExpressions));
				}
				else
					compilation.apply(new SetVarMainTemplatePlugin([this.target], true));
				break;
			case "commonjs":
				if(this.names) {
					var varExpressions = this.names.map(function(name) {
						return accessorAccess("exports", name);
					});
					compilation.apply(new SetVarMainTemplatePlugin(varExpressions));
				}
				else
					compilation.apply(new SetVarMainTemplatePlugin(["exports"], true));
				break;
			case "commonjs2":
				compilation.apply(new SetVarMainTemplatePlugin(["module.exports"]));
				break;
			case "commonjs-module":
				compilation.apply(new CommonJsHarmonyMainTemplatePlugin());
				break;
			case "amd":
				var AmdMainTemplatePlugin = require("./AmdMainTemplatePlugin");
				compilation.apply(new AmdMainTemplatePlugin(this.names));
				break;
			case "umd":
			case "umd2":
				var UmdMainTemplatePlugin = require("./UmdMainTemplatePlugin");
				compilation.apply(new UmdMainTemplatePlugin(this.names, {
					optionalAmdExternalAsGlobal: this.target === "umd2",
					namedDefine: this.umdNamedDefine,
					auxiliaryComment: this.auxiliaryComment
				}));
				break;
			case "jsonp":
				var JsonpExportMainTemplatePlugin = require("./JsonpExportMainTemplatePlugin");
				compilation.apply(new JsonpExportMainTemplatePlugin(this.names));
				break;
			default:
				throw new Error(this.target + " is not a valid Library target");
		}
	}.bind(this));
};
