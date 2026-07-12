/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import makeSerializable from "../util/makeSerializable.js";
import ModuleDependency from "./ModuleDependency.js";
import ModuleDependencyTemplateAsId from "./ModuleDependencyTemplateAsId.js";
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */

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
	"webpack/lib/dependencies/ModuleHotAcceptDependency"
);

ModuleHotAcceptDependency.Template = ModuleDependencyTemplateAsId;

export default ModuleHotAcceptDependency;

export { ModuleHotAcceptDependency as "module.exports" };
