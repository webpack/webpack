/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import makeSerializable from "../util/makeSerializable.js";
import ModuleDependency from "./ModuleDependency.js";
import ModuleDependencyTemplateAsRequireId from "./ModuleDependencyTemplateAsRequireId.js";
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */

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

makeSerializable(
	AMDRequireItemDependency,
	"webpack/lib/dependencies/AMDRequireItemDependency"
);

AMDRequireItemDependency.Template = ModuleDependencyTemplateAsRequireId;

export default AMDRequireItemDependency;

export { AMDRequireItemDependency as "module.exports" };
