/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../../util/makeSerializable");
const { registerLegacyRequest } = require("../../util/serialization");
const ModuleDependency = require("../core/ModuleDependency");
const ModuleDependencyTemplateAsId = require("../core/ModuleDependencyTemplateAsId");

/** @import { Range } from "../../javascript/JavascriptParser" */

class ModuleHotAcceptDependency extends ModuleDependency {
	/**
	 * Creates an instance of ModuleHotAcceptDependency.
	 * @param {string} request the request string
	 * @param {Range} range location in source code
	 */
	constructor(request, range) {
		super(request, Infinity);
		this.range = range;
		/** @type {boolean} */
		this.weak = true;
	}

	get type() {
		return "module.hot.accept";
	}

	get category() {
		return "commonjs";
	}
}

makeSerializable(
	ModuleHotAcceptDependency,
	"webpack/lib/dependencies/hmr/ModuleHotAcceptDependency"
);
registerLegacyRequest(
	ModuleHotAcceptDependency,
	"webpack/lib/dependencies/ModuleHotAcceptDependency"
);

ModuleHotAcceptDependency.Template = ModuleDependencyTemplateAsId;

module.exports = ModuleHotAcceptDependency;
