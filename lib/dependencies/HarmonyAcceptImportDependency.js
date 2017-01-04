"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const HarmonyImportDependency = require("./HarmonyImportDependency");
class Template {
	apply(dep, source, outputOptions, requestShortener) {
	}
}
class HarmonyAcceptImportDependency extends HarmonyImportDependency {
}
HarmonyAcceptImportDependency.Template = Template;
HarmonyAcceptImportDependency.prototype.type = "harmony accept";
module.exports = HarmonyAcceptImportDependency;
