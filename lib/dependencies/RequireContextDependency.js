/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import makeSerializable from "../util/makeSerializable.js";
import ContextDependency from "./ContextDependency.js";
import ModuleDependencyTemplateAsRequireId from "./ModuleDependencyTemplateAsRequireId.js";
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("./ContextDependency.js").ContextDependencyOptions} ContextDependencyOptions */

class RequireContextDependency extends ContextDependency {
	/**
	 * Creates an instance of RequireContextDependency.
	 * @param {ContextDependencyOptions} options options
	 * @param {Range} range range
	 */
	constructor(options, range) {
		super(options);

		this.range = range;
	}

	get type() {
		return "require.context";
	}
}

makeSerializable(
	RequireContextDependency,
	"webpack/lib/dependencies/RequireContextDependency"
);

RequireContextDependency.Template = ModuleDependencyTemplateAsRequireId;

export default RequireContextDependency;

export { RequireContextDependency as "module.exports" };
