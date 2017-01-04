"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const SetVarMainTemplatePlugin = require("./SetVarMainTemplatePlugin");
const AmdMainTemplatePlugin = require("./AmdMainTemplatePlugin");
const UmdMainTemplatePlugin = require("./UmdMainTemplatePlugin");
const JsonpExportMainTemplatePlugin = require("./JsonpExportMainTemplatePlugin");
function accessorToObjectAccess(accessor) {
	return accessor.map(a => `[${JSON.stringify(a)}]`).join("");
}
function accessorAccess(base, accessor, joinWith) {
	const accessorArr = [].concat(accessor);
	return accessorArr.map((a, idx) => {
		const newAccessor = base
			? base + accessorToObjectAccess(accessorArr.slice(0, idx + 1))
			: accessorArr[0] + accessorToObjectAccess(accessorArr.slice(1, idx + 1));
		if(idx === accessorArr.length - 1) {
			return newAccessor;
		}
		if(idx === 0 && typeof base === "undefined") {
			return `${newAccessor} = typeof ${newAccessor} === "object" ? ${newAccessor} : {}`;
		}
		return `${newAccessor} = ${newAccessor} || {}`;
	}).join(joinWith || "; ");
}
class LibraryTemplatePlugin {
	constructor(name, target, umdNamedDefine, auxiliaryComment) {
		this.name = name;
		this.target = target;
		this.umdNamedDefine = umdNamedDefine;
		this.auxiliaryComment = auxiliaryComment;
	}

	apply(compiler) {
		compiler.plugin("this-compilation", (compilation) => {
			switch(this.target) {
				case "var":
					compilation.apply(new SetVarMainTemplatePlugin(`var ${accessorAccess(false, this.name)}`));
					break;
				case "assign":
					compilation.apply(new SetVarMainTemplatePlugin(accessorAccess(undefined, this.name)));
					break;
				case "this":
				case "window":
				case "global":
					if(this.name) {
						compilation.apply(new SetVarMainTemplatePlugin(accessorAccess(this.target, this.name)));
					} else {
						compilation.apply(new SetVarMainTemplatePlugin(this.target, true));
					}
					break;
				case "commonjs":
					if(this.name) {
						compilation.apply(new SetVarMainTemplatePlugin(accessorAccess("exports", this.name)));
					} else {
						compilation.apply(new SetVarMainTemplatePlugin("exports", true));
					}
					break;
				case "commonjs2":
				case "commonjs-module":
					compilation.apply(new SetVarMainTemplatePlugin("module.exports"));
					break;
				case "amd":
					compilation.apply(new AmdMainTemplatePlugin(this.name));
					break;
				case "umd":
				case "umd2":
					compilation.apply(new UmdMainTemplatePlugin(this.name, {
						optionalAmdExternalAsGlobal: this.target === "umd2",
						namedDefine: this.umdNamedDefine,
						auxiliaryComment: this.auxiliaryComment
					}));
					break;
				case "jsonp":
					compilation.apply(new JsonpExportMainTemplatePlugin(this.name));
					break;
				default:
					throw new Error(`${this.target} is not a valid Library target`);
			}
		});
	}
}
module.exports = LibraryTemplatePlugin;
