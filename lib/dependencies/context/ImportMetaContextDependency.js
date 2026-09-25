/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../../util/makeSerializable");
const { registerLegacyRequest } = require("../../util/serialization");
const ModuleDependencyTemplateAsRequireId = require("../core/ModuleDependencyTemplateAsRequireId");
const ContextDependency = require("./ContextDependency");

/** @import { Range } from "../../javascript/JavascriptParser" */
/** @import { ContextDependencyOptions } from "./ContextDependency" */

class ImportMetaContextDependency extends ContextDependency {
	/**
	 * Creates an instance of ImportMetaContextDependency.
	 * @param {ContextDependencyOptions} options options
	 * @param {Range} range range
	 */
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
	"webpack/lib/dependencies/context/ImportMetaContextDependency"
);
registerLegacyRequest(
	ImportMetaContextDependency,
	"webpack/lib/dependencies/ImportMetaContextDependency"
);

ImportMetaContextDependency.Template = ModuleDependencyTemplateAsRequireId;

module.exports = ImportMetaContextDependency;
