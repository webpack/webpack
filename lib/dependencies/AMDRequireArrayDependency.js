/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import DependencyTemplate from "../DependencyTemplate.js";
import makeSerializable from "../util/makeSerializable.js";
import LocalModuleDependency from "./LocalModuleDependency.js";
import NullDependency from "./NullDependency.js";
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency.js").default} Dependency */
/** @typedef {import("../DependencyTemplate.js").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("./AMDRequireItemDependency.js").default} AMDRequireItemDependency */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<[(string | LocalModuleDependency | AMDRequireItemDependency)[], Range]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<[(string | LocalModuleDependency | AMDRequireItemDependency)[], Range]>} ObjectSerializerContext */

class AMDRequireArrayDependency extends NullDependency {
	/**
	 * Creates an instance of AMDRequireArrayDependency.
	 * @param {(string | LocalModuleDependency | AMDRequireItemDependency)[]} depsArray deps array
	 * @param {Range} range range
	 */
	constructor(depsArray, range) {
		super();

		this.depsArray = depsArray;
		this.range = range;
	}

	get type() {
		return "amd require array";
	}

	get category() {
		return "amd";
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.depsArray).write(this.range);

		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.depsArray = context.read();
		const c1 = context.rest;
		this.range = c1.read();

		super.deserialize(c1.rest);
	}
}

makeSerializable(
	AMDRequireArrayDependency,
	"webpack/lib/dependencies/AMDRequireArrayDependency"
);

AMDRequireArrayDependency.Template = class AMDRequireArrayDependencyTemplate extends (
	DependencyTemplate
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {AMDRequireArrayDependency} */ (dependency);
		const content = this.getContent(dep, templateContext);
		source.replace(dep.range[0], dep.range[1] - 1, content);
	}

	/**
	 * Returns content.
	 * @param {AMDRequireArrayDependency} dep the dependency for which the template should be applied
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {string} content
	 */
	getContent(dep, templateContext) {
		const requires = dep.depsArray.map((dependency) =>
			this.contentForDependency(dependency, templateContext)
		);
		return `[${requires.join(", ")}]`;
	}

	/**
	 * Content for dependency.
	 * @param {string | LocalModuleDependency | AMDRequireItemDependency} dep the dependency for which the template should be applied
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {string} content
	 */
	contentForDependency(
		dep,
		{ runtimeTemplate, moduleGraph, chunkGraph, runtimeRequirements }
	) {
		if (typeof dep === "string") {
			return dep;
		}

		if (dep instanceof LocalModuleDependency) {
			return dep.localModule.variableName();
		}

		return runtimeTemplate.moduleExports({
			module: moduleGraph.getModule(dep),
			chunkGraph,
			request: dep.request,
			runtimeRequirements
		});
	}
};

export default AMDRequireArrayDependency;

export { AMDRequireArrayDependency as "module.exports" };
