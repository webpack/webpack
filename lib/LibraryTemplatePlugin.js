/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const SetVarMainTemplatePlugin = require("./SetVarMainTemplatePlugin");

const accessorToObjectAccess = accessor => {
	return accessor
		.map(a => {
			return `[${JSON.stringify(a)}]`;
		})
		.join("");
};

const accessorAccess = (base, accessor, joinWith) => {
	accessor = [].concat(accessor);
	return accessor
		.map((a, idx) => {
			a = base
				? base + accessorToObjectAccess(accessor.slice(0, idx + 1))
				: accessor[0] + accessorToObjectAccess(accessor.slice(1, idx + 1));
			if (idx === accessor.length - 1) return a;
			if (idx === 0 && typeof base === "undefined")
				return `${a} = typeof ${a} === "object" ? ${a} : {}`;
			return `${a} = ${a} || {}`;
		})
		.join(joinWith || "; ");
};

class LibraryTemplatePlugin {
	constructor(name, target, umdNamedDefine, auxiliaryComment, exportProperty) {
		this.name = name;
		this.target = target;
		this.umdNamedDefine = umdNamedDefine;
		this.auxiliaryComment = auxiliaryComment;
		this.exportProperty = exportProperty;
	}

	apply(compiler) {
		compiler.hooks.thisCompilation.tap("LibraryTemplatePlugin", compilation => {
			if (this.exportProperty) {
				var ExportPropertyMainTemplatePlugin = require("./ExportPropertyMainTemplatePlugin");
				new ExportPropertyMainTemplatePlugin(this.exportProperty).apply(
					compilation
				);
			}
			switch (this.target) {
				case "var":
					new SetVarMainTemplatePlugin(
						`var ${accessorAccess(false, this.name)}`
					).apply(compilation);
					break;
				case "assign":
					new SetVarMainTemplatePlugin(
						accessorAccess(undefined, this.name)
					).apply(compilation);
					break;
				case "this":
				case "self":
				case "window":
					if (this.name)
						new SetVarMainTemplatePlugin(
							accessorAccess(this.target, this.name)
						).apply(compilation);
					else
						new SetVarMainTemplatePlugin(this.target, true).apply(compilation);
					break;
				case "global":
					if (this.name)
						new SetVarMainTemplatePlugin(
							accessorAccess(
								compilation.runtimeTemplate.outputOptions.globalObject,
								this.name
							)
						).apply(compilation);
					else
						new SetVarMainTemplatePlugin(
							compilation.runtimeTemplate.outputOptions.globalObject,
							true
						).apply(compilation);
					break;
				case "commonjs":
					if (this.name)
						new SetVarMainTemplatePlugin(
							accessorAccess("exports", this.name)
						).apply(compilation);
					else new SetVarMainTemplatePlugin("exports", true).apply(compilation);
					break;
				case "commonjs2":
				case "commonjs-module":
					new SetVarMainTemplatePlugin("module.exports").apply(compilation);
					break;
				case "amd":
					var AmdMainTemplatePlugin = require("./AmdMainTemplatePlugin");
					new AmdMainTemplatePlugin(this.name).apply(compilation);
					break;
				case "umd":
				case "umd2":
					var UmdMainTemplatePlugin = require("./UmdMainTemplatePlugin");
					new UmdMainTemplatePlugin(this.name, {
						optionalAmdExternalAsGlobal: this.target === "umd2",
						namedDefine: this.umdNamedDefine,
						auxiliaryComment: this.auxiliaryComment
					}).apply(compilation);
					break;
				case "jsonp":
					var JsonpExportMainTemplatePlugin = require("./web/JsonpExportMainTemplatePlugin");
					new JsonpExportMainTemplatePlugin(this.name).apply(compilation);
					break;
				default:
					throw new Error(`${this.target} is not a valid Library target`);
			}
		});
	}
}

module.exports = LibraryTemplatePlugin;
