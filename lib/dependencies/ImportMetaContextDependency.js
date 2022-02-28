/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const ContextDependency = require("./ContextDependency");
const ModuleDependencyTemplateAsRequireId = require("./ModuleDependencyTemplateAsRequireId");

class ImportMetaContextDependency extends ContextDependency {
	constructor(options, range) {
		super(options);

		this.range = range;
	}

	get category() {
		return "esm";
	}

	get type() {
		return `import.meta.webpackContext ${this.options.mode}`;
	}
}

makeSerializable(
	ImportMetaContextDependency,
	"webpack/lib/dependencies/ImportMetaContextDependency"
);

ImportMetaContextDependency.Template = ModuleDependencyTemplateAsRequireId;

module.exports = ImportMetaContextDependency;
