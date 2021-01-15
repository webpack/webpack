/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");
const ModuleDependencyTemplateAsId = require("./ModuleDependencyTemplateAsId");

class ImportMetaHotAcceptDependency extends ModuleDependency {
	constructor(request, range) {
		super(request);
		this.range = range;
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
	"webpack/lib/dependencies/ImportMetaHotAcceptDependency"
);

ImportMetaHotAcceptDependency.Template = ModuleDependencyTemplateAsId;

module.exports = ImportMetaHotAcceptDependency;
