/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import Dependency from "../Dependency.js";
import DependencyTemplate from "../DependencyTemplate.js";
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency.js").TRANSITIVE} TRANSITIVE */
/** @typedef {import("../DependencyTemplate.js").DependencyTemplateContext} DependencyTemplateContext */

/** @typedef {string[]} RawRuntimeRequirements */

class NullDependency extends Dependency {
	get type() {
		return "null";
	}

	/**
	 * Could affect referencing module.
	 * @returns {boolean | TRANSITIVE} true, when changes to the referenced module could affect the referencing module; TRANSITIVE, when changes to the referenced module could affect referencing modules of the referencing module
	 */
	couldAffectReferencingModule() {
		return false;
	}
}

NullDependency.Template = class NullDependencyTemplate extends (
	DependencyTemplate
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {}
};

export default NullDependency;

export { NullDependency as "module.exports" };
