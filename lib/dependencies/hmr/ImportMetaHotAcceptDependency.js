/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../../util/makeSerializable");
const { registerLegacyRequest } = require("../../util/serialization");
const ModuleDependency = require("../core/ModuleDependency");
const ModuleDependencyTemplateAsId = require("../core/ModuleDependencyTemplateAsId");

/** @import { Range } from "../../javascript/JavascriptParser" */

class ImportMetaHotAcceptDependency extends ModuleDependency {
	/**
	 * Creates an instance of ImportMetaHotAcceptDependency.
	 * @param {string} request the request string
	 * @param {Range} range location in source code
	 */
	constructor(request, range) {
		super(request);
		this.range = range;
		/** @type {boolean} */
		this.weak = true;
	}

	get type() {
		return "import.meta.webpackHot.accept";
	}

	get category() {
		return "esm";
	}
}

makeSerializable(
	ImportMetaHotAcceptDependency,
	"webpack/lib/dependencies/hmr/ImportMetaHotAcceptDependency"
);
registerLegacyRequest(
	ImportMetaHotAcceptDependency,
	"webpack/lib/dependencies/ImportMetaHotAcceptDependency"
);

ImportMetaHotAcceptDependency.Template = ModuleDependencyTemplateAsId;

module.exports = ImportMetaHotAcceptDependency;
