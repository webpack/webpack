/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

import makeSerializable from "../util/makeSerializable.js";
import ContextDependency from "./ContextDependency.js";
import ModuleDependencyTemplateAsRequireId from "./ModuleDependencyTemplateAsRequireId.js";
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("./ContextDependency.js").ContextDependencyOptions} ContextDependencyOptions */

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
	"webpack/lib/dependencies/ImportMetaContextDependency"
);

ImportMetaContextDependency.Template = ModuleDependencyTemplateAsRequireId;

export default ImportMetaContextDependency;

export { ImportMetaContextDependency as "module.exports" };
