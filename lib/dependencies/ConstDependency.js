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

class ConstDependency extends NullDependency {
	/**
	 * @param {string} expression the expression
	 * @param {TODO} range the source range
	 * @param {string[]=} runtimeRequirements runtime requirements
	 */
	constructor(expression, range, runtimeRequirements) {
		super();
		this.expression = expression;
		this.range = range;
		this.runtimeRequirements = runtimeRequirements
			? new Set(runtimeRequirements)
			: null;
	}

	/**
	 * Update the hash
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		hash.update(this.range + "");
		hash.update(this.expression + "");
		if (this.runtimeRequirements)
			hash.update(Array.from(this.runtimeRequirements).join() + "");
	}

	serialize(context) {
		const { write } = context;
		write(this.expression);
		write(this.range);
		write(this.runtimeRequirements);
		super.serialize(context);
	}

	deserialize(context) {
		const { read } = context;
		this.expression = read();
		this.range = read();
		this.runtimeRequirements = read();
		super.deserialize(context);
	}
}

makeSerializable(ConstDependency, "webpack/lib/dependencies/ConstDependency");

ConstDependency.Template = class ConstDependencyTemplate extends NullDependency.Template {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep = /** @type {ConstDependency} */ (dependency);
		if (dep.runtimeRequirements) {
			for (const req of dep.runtimeRequirements) {
				templateContext.runtimeRequirements.add(req);
			}
		}
		if (typeof dep.range === "number") {
			source.insert(dep.range, dep.expression);
			return;
		}

		source.replace(dep.range[0], dep.range[1] - 1, dep.expression);
	}
};

module.exports = ConstDependency;
