/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../util/Hash")} Hash */

class RuntimeRequirementsDependency extends NullDependency {
	/**
	 * @param {string[]} runtimeRequirements runtime requirements
	 */
	constructor(runtimeRequirements) {
		super();
		this.runtimeRequirements = new Set(runtimeRequirements);
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		hash.update(Array.from(this.runtimeRequirements).join() + "");
	}

	serialize(context) {
		const { write } = context;
		write(this.runtimeRequirements);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.runtimeRequirements = read();
		super.deserialize(context);
	}
}

makeSerializable(
	RuntimeRequirementsDependency,
	"webpack/lib/dependencies/RuntimeRequirementsDependency"
);

RuntimeRequirementsDependency.Template = class RuntimeRequirementsDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { runtimeRequirements }) {
		const dep = /** @type {RuntimeRequirementsDependency} */ (dependency);
		for (const req of dep.runtimeRequirements) {
			runtimeRequirements.add(req);
		}
	}
};

module.exports = RuntimeRequirementsDependency;
