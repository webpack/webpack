/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import Dependency from "../Dependency.js";
import makeSerializable from "../util/makeSerializable.js";
import ModuleDependency from "./ModuleDependency.js";
import ModuleDependencyAsId from "./ModuleDependencyTemplateAsId.js";
/** @typedef {import("../Dependency.js").ReferencedExports} ReferencedExports */
/** @typedef {import("../ModuleGraph.js").default} ModuleGraph */
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("../util/runtime.js").RuntimeSpec} RuntimeSpec */

class RequireResolveDependency extends ModuleDependency {
	/**
	 * Creates an instance of RequireResolveDependency.
	 * @param {string} request the request string
	 * @param {Range} range location in source code
	 * @param {string=} context context
	 */
	constructor(request, range, context) {
		super(request);

		this.range = range;
		/** @type {string | undefined} */
		this._context = context;
	}

	get type() {
		return "require.resolve";
	}

	get category() {
		return "commonjs";
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		// This doesn't use any export
		return Dependency.NO_EXPORTS_REFERENCED;
	}
}

makeSerializable(
	RequireResolveDependency,
	"webpack/lib/dependencies/RequireResolveDependency"
);

RequireResolveDependency.Template = ModuleDependencyAsId;

export default RequireResolveDependency;

export { RequireResolveDependency as "module.exports" };
