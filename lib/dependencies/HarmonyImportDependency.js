/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const ModuleDependency = require("./ModuleDependency");

class HarmonyImportDependency extends ModuleDependency {
	constructor(request, importedVar, range) {
		super(request);
		this.range = range;
		this.importedVar = importedVar;
	}

	get type() {
		return "harmony import";
	}

	getReference() {
		if(!this.module) return null;

		return {
			module: this.module,
			importedNames: false
		};
	}

	updateHash(hash) {
		super.updateHash(hash);
		hash.update((this.module && (!this.module.meta || this.module.meta.harmonyModule)) + "");
	}
}

HarmonyImportDependency.Template = class HarmonyImportDependencyTemplate {
	apply(dep, source, outputOptions, requestShortener) {
		const content = makeImportStatement(true, dep, outputOptions, requestShortener);
		source.replace(dep.range[0], dep.range[1] - 1, "");
		source.insert(-1, content);
	}
};

function getOptionalComment(pathinfo, shortenedRequest) {
	if(!pathinfo) {
		return "";
	}
	return `/*! ${shortenedRequest} */ `;
}

function makeImportStatement(declare, dep, outputOptions, requestShortener) {
	const comment = getOptionalComment(outputOptions.pathinfo, requestShortener.shorten(dep.request));
	const declaration = declare ? "var " : "";
	const newline = declare ? "\n" : " ";

	if(!dep.module) {
		const stringifiedError = JSON.stringify(`Cannot find module "${dep.request}"`);
		return `throw new Error(${stringifiedError});${newline}`;
	}

	if(dep.importedVar) {
		const isHarmonyModule = dep.module.meta && dep.module.meta.harmonyModule;
		const content = `/* harmony import */ ${declaration}${dep.importedVar} = __webpack_require__(${comment}${JSON.stringify(dep.module.id)});${newline}`;
		if(isHarmonyModule) {
			return content;
		}
		return `${content}/* harmony import */ ${declaration}${dep.importedVar}_default = __webpack_require__.n(${dep.importedVar});${newline}`;
	}

	return "";
}
HarmonyImportDependency.makeImportStatement = makeImportStatement;

module.exports = HarmonyImportDependency;
