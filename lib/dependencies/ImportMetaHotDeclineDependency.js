/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

import makeSerializable from "../util/makeSerializable.js";
import ModuleDependency from "./ModuleDependency.js";
import ModuleDependencyTemplateAsId from "./ModuleDependencyTemplateAsId.js";
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */

class ImportMetaHotDeclineDependency extends ModuleDependency {
	/**
	 * Creates an instance of ImportMetaHotDeclineDependency.
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
		return "import.meta.webpackHot.decline";
	}

	get category() {
		return "esm";
	}
}

makeSerializable(
	ImportMetaHotDeclineDependency,
	"webpack/lib/dependencies/ImportMetaHotDeclineDependency"
);

ImportMetaHotDeclineDependency.Template = ModuleDependencyTemplateAsId;

export default ImportMetaHotDeclineDependency;

export { ImportMetaHotDeclineDependency as "module.exports" };
