/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const HarmonyImportDependency = require("./HarmonyImportDependency");

class HarmonyAcceptImportDependency extends HarmonyImportDependency {
	constructor(request, importedVar, range) {
		super(request, importedVar, range);
	}

	get type() {
		return "harmony accept";
	}
}

HarmonyAcceptImportDependency.Template = class HarmonyAcceptImportDependencyTemplate {
	apply(dep, source, outputOptions, requestShortener) {}
};

module.exports = HarmonyAcceptImportDependency;
