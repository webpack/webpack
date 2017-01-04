"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ModuleDependency = require("./ModuleDependency");
class Template {
	apply(dep, source, outputOptions, requestShortener) {
		const content = HarmonyImportDependency.makeStatement(true, dep, outputOptions, requestShortener);
		source.replace(dep.range[0], dep.range[1] - 1, "");
		source.insert(-1, content);
	}
}
class HarmonyImportDependency extends ModuleDependency {
	constructor(request, importedVar, range) {
		super(request);
		this.importedVar = importedVar;
		this.range = range;
	}

	getReference() {
		if(!this.module) {
			return null;
		}
		return {
			module: this.module,
			importedNames: false
		};
	}

	updateHash(hash) {
		super.updateHash(hash);
		hash.update(`${this.module && (!this.module.meta || this.module.meta.harmonyModule)}`);
	}

	static makeStatement(declare, dep, outputOptions, requestShortener) {
		let comment = "";
		if(outputOptions.pathinfo) {
			comment = `/*! ${requestShortener.shorten(dep.request)} */ `;
		}
		const declaration = declare ? "var " : "";
		const newline = declare ? "\n" : " ";
		let content;
		if(!dep.module) {
			content = `throw new Error(${JSON.stringify("Cannot find module \"" + dep.request + "\"")});${newline}`;
		} else if(dep.importedVar) {
			content = `/* harmony import */ ${declaration}${dep.importedVar} = __webpack_require__(${comment}${JSON.stringify(dep.module.id)});${newline}`;
			if(!(dep.module.meta && dep.module.meta.harmonyModule)) {
				content += `/* harmony import */ ${declaration}${dep.importedVar}_default = __webpack_require__.n(${dep.importedVar});${newline}`;
			}
		} else {
			content = "";
		}
		return content;
	}
}
HarmonyImportDependency.Template = Template;
HarmonyImportDependency.prototype.type = "harmony import";
module.exports = HarmonyImportDependency;
