/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("crypto").Hash} Hash */
/** @typedef {(d: Dependency) => boolean} DependencyFilterFunction */

const { RawSource, ReplaceSource } = require("webpack-sources");

class DependenciesBlockVariable {
	/**
	 * Creates an instance of DependenciesBlockVariable.
	 * @param {string} name name of DependenciesBlockVariable
	 * @param {string} expression
	 * @param {Dependency[]=} dependencies
	 */
	constructor(name, expression, dependencies) {
		this.name = name;
		this.expression = expression;
		this.dependencies = dependencies || [];
	}

	/**
	 * @param {Hash} hash
	 */
	updateHash(hash) {
		hash.update(this.name);
		hash.update(this.expression);
		for (const d of this.dependencies) {
			d.updateHash(hash);
		}
	}

	/**
	 *
	 * @param {Map<Dependency["constructor"], any>} dependencyTemplates Dependency constructors and templates Map.
	 * @param {RuntimeTemplate} runtimeTemplate runtimeTemplate to generate expression souce
	 */
	expressionSource(dependencyTemplates, runtimeTemplate) {
		const source = new ReplaceSource(new RawSource(this.expression), "");
		for (const dep of this.dependencies) {
			const template = dependencyTemplates.get(dep.constructor);
			if (!template)
				throw new Error(`No template for dependency: ${dep.constructor.name}`);
			template.apply(dep, source, runtimeTemplate, dependencyTemplates);
		}
		return source;
	}

	disconnect() {
		for (const d of this.dependencies) {
			d.disconnect();
		}
	}

	/**
	 * @param {DependencyFilterFunction} filter filter function for dependencies, gets passed all dependency ties from current instance
	 */
	hasDependencies(filter) {
		if (filter) {
			if (this.dependencies.some(filter)) return true;
		} else {
			if (this.dependencies.length > 0) return true;
		}
		return false;
	}
}

module.exports = DependenciesBlockVariable;
