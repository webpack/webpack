/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import makeSerializable from "../util/makeSerializable.js";
import ModuleDependency from "./ModuleDependency.js";
import ModuleDependencyTemplateAsId from "./ModuleDependencyTemplateAsId.js";
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */

class ModuleHotDeclineDependency extends ModuleDependency {
	/**
	 * Creates an instance of ModuleHotDeclineDependency.
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
		return "module.hot.decline";
	}

	get category() {
		return "commonjs";
	}
}

makeSerializable(
	ModuleHotDeclineDependency,
	"webpack/lib/dependencies/ModuleHotDeclineDependency"
);

ModuleHotDeclineDependency.Template = ModuleDependencyTemplateAsId;

export default ModuleHotDeclineDependency;

export { ModuleHotDeclineDependency as "module.exports" };
