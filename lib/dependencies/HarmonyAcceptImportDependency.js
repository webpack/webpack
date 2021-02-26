/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const HarmonyImportDependency = require("./HarmonyImportDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */

class HarmonyAcceptImportDependency extends HarmonyImportDependency {
	constructor(request) {
		super(request, NaN);
		this.weak = true;
	}

	get type() {
		return "harmony accept";
	}
}

makeSerializable(
	HarmonyAcceptImportDependency,
	"webpack/lib/dependencies/HarmonyAcceptImportDependency"
);

HarmonyAcceptImportDependency.Template = class HarmonyAcceptImportDependencyTemplate extends (
	HarmonyImportDependency.Template
) {};

module.exports = HarmonyAcceptImportDependency;
