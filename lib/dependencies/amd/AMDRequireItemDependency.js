/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../../util/makeSerializable");
const ModuleDependency = require("../core/ModuleDependency");
const ModuleDependencyTemplateAsRequireId = require("../core/ModuleDependencyTemplateAsRequireId");

/** @import { Range } from "../../javascript/JavascriptParser" */

class AMDRequireItemDependency extends ModuleDependency {
	/**
	 * Creates an instance of AMDRequireItemDependency.
	 * @param {string} request the request string
	 * @param {Range=} range location in source code
	 */
	constructor(request, range) {
		super(request);

		this.range = range;
	}

	get type() {
		return "amd require";
	}

	get category() {
		return "amd";
	}
}

makeSerializable(AMDRequireItemDependency, [
	"webpack/lib/dependencies/amd/AMDRequireItemDependency",
	// TODO in the next major release: remove, they restore pre-move cache packs
	"webpack/lib/dependencies/AMDRequireItemDependency"
]);

AMDRequireItemDependency.Template = ModuleDependencyTemplateAsRequireId;

module.exports = AMDRequireItemDependency;
